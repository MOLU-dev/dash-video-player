package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/molu/youtube/server/internal/db"
	"github.com/molu/youtube/server/internal/models"
	"github.com/molu/youtube/server/internal/stream"
)

type Server struct {
	manager *stream.Manager
}

func NewServer(manager *stream.Manager) *Server {
	return &Server{manager: manager}
}

func (s *Server) CreateStream(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	log.Printf("📥 CreateStream Request: %s from %s", r.URL.Path, r.RemoteAddr)

	var req models.CreateStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Invalid request body: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	streamID := uuid.New().String()
	streamKey := uuid.New().String()

	log.Printf("🎬 Creating new stream: Title='%s', ID=%s", req.Title, streamID)

	err := s.manager.GetQueries().CreateStream(ctx, db.CreateStreamParams{
		ID:        streamID,
		Title:     sql.NullString{String: req.Title, Valid: true},
		StreamKey: sql.NullString{String: streamKey, Valid: true},
	})

	if err != nil {
		log.Printf("❌ Database error creating stream: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := models.CreateStreamResponse{
		StreamID:     streamID,
		StreamKey:    streamKey,
		RTMPServer:   "rtmp://localhost:1935",
		RTMPURL:      fmt.Sprintf("rtmp://localhost:1935/%s", streamKey),
		PlayURL:      fmt.Sprintf("http://localhost:8080/streams/%s/manifest.mpd", streamID),
		Instructions: "Use 'rtmp_server' as Server URL and 'stream_key' as Stream Key in OBS",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("✅ Stream created successfully: %s", streamID)
}

func (s *Server) GetStream(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	streamID := vars["id"]
	log.Printf("📥 GetStream Request for: %s", streamID)

	stream, err := s.manager.GetQueries().GetStream(ctx, streamID)
	if err != nil {
		log.Printf("❌ Stream not found: %s", streamID)
		http.Error(w, "Stream not found", http.StatusNotFound)
		return
	}

	metadata := models.StreamMetadata{
		ID:          stream.ID,
		Title:       stream.Title.String,
		StreamKey:   stream.StreamKey.String,
		Status:      stream.Status.String,
		StartTime:   stream.StartTime.Time,
		ViewerCount: int(stream.ViewerCount.Int32),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metadata)
	log.Printf("✅ Stream metadata returned for: %s", streamID)
}

func (s *Server) ListStreams(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	log.Printf("📥 ListStreams Request from %s", r.RemoteAddr)

	rows, err := s.manager.GetQueries().ListStreams(ctx)
	if err != nil {
		log.Printf("❌ Database error listing streams: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var streams []models.StreamMetadata
	for _, row := range rows {
		streams = append(streams, models.StreamMetadata{
			ID:          row.ID,
			Title:       row.Title.String,
			Status:      row.Status.String,
			StartTime:   row.StartTime.Time,
			ViewerCount: int(row.ViewerCount.Int32),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streams)
	log.Printf("✅ Listed %d streams", len(streams))
}

func (s *Server) GetStreamHealth(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	streamID := vars["id"]
	log.Printf("📥 GetStreamHealth Request for: %s", streamID)

	healthData, err := s.manager.GetQueries().GetStreamHealth(ctx, streamID)
	if err != nil {
		log.Printf("❌ Stream not found for health check: %s", streamID)
		http.Error(w, "Stream not found", http.StatusNotFound)
		return
	}

	health := models.StreamHealth{
		StreamID:          streamID,
		Status:            healthData.Status.String,
		ConnectionQuality: healthData.ConnectionQuality,
		PacketLoss:        healthData.PacketLossPercent,
		CurrentBitrate:    healthData.CurrentBitrate,
		LastHeartbeat:     healthData.LastHeartbeat.Time,
		ReconnectAttempts: int(healthData.ReconnectAttempts),
	}

	if health.Status == "live" {
		health.Uptime = int64(time.Since(healthData.StartTime.Time).Seconds())
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
	log.Printf("✅ Health data returned for stream: %s", streamID)
}