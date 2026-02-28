package rtmp

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/molu/youtube/server/internal/db"
	"github.com/molu/youtube/server/internal/models"
	"github.com/molu/youtube/server/internal/stream"
	"github.com/nareix/joy4/format"
	"github.com/nareix/joy4/format/rtmp"
)

func init() {
	format.RegisterAll()
}

type Server struct {
	manager *stream.Manager
	server  *rtmp.Server
}

func NewServer(manager *stream.Manager) *Server {
	return &Server{
		manager: manager,
		server: &rtmp.Server{
			Addr: ":1935",
		},
	}
}

func (s *Server) Start() {
	log.Println("🚀 Starting RTMP server on port 1935")

	s.server.HandlePublish = s.handlePublish
	s.server.HandlePlay = s.handlePlay

	log.Println("✅ RTMP server configured, starting listener...")
	if err := s.server.ListenAndServe(); err != nil {
		log.Fatal("❌ RTMP server error:", err)
	}
}

func (s *Server) handlePublish(conn *rtmp.Conn) {
	// Create context for database operations at the start
	ctx := context.Background()
	
	streamKey := s.extractStreamKey(conn.URL.Path)
	log.Printf("📥 New RTMP publish connection - Stream Key: %s", streamKey)

	// Try Redis first for stream key mapping
	streamID, err := s.manager.GetStreamIDByKey(streamKey)
	if err != nil {
		log.Printf("❌ Redis error getting stream ID: %v", err)
		return
	}

	// Fallback to database if not found in Redis
	if streamID == "" {
		dbStreamID, err := s.manager.GetQueries().GetStreamByKey(ctx, sql.NullString{String: streamKey, Valid: true})
		if err != nil {
			log.Printf("❌ Invalid stream key: %s (error: %v)", streamKey, err)
			return
		}
		streamID = dbStreamID
		
		// Cache the mapping in Redis for future use
		if err := s.manager.SetStreamKeyMapping(streamKey, streamID); err != nil {
			log.Printf("❌ Failed to cache stream key in Redis: %v", err)
		}
	}

	log.Printf("✅ Valid stream key for stream: %s", streamID)

	outputDir := fmt.Sprintf("./streams/%s", streamID)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("❌ Failed to create output directory: %v", err)
		return
	}
	log.Printf("✅ Output directory created: %s", outputDir)

	cancelCtx, cancel := context.WithCancel(context.Background())
	session := &models.StreamSession{
		ID:             streamID,
		StartTime:      time.Now(),
		Status:         "live",
		StatsCollector: make(chan struct{}),
		CancelFunc:     cancel,
	}

	s.manager.SetSession(streamID, session)

	err = s.manager.GetQueries().UpdateStreamToLive(ctx, db.UpdateStreamToLiveParams{
		StartTime: sql.NullTime{Time: time.Now(), Valid: true},
		ID:        streamID,
	})
	if err != nil {
		log.Printf("❌ Failed to update stream status: %v", err)
	}

	s.manager.LogConnectionEvent(streamID, "connected", map[string]interface{}{
		"timestamp": time.Now(),
	})

	// Start monitoring and transcoding
	go s.manager.MonitorHealth(streamID, session)
	
	// Start FFmpeg in a goroutine 
	go func() {
		s.manager.StartFFmpegTranscoding(cancelCtx, streamID, outputDir, conn)
		// When FFmpeg finishes, clean up the session
		log.Printf("🧹 FFmpeg finished, cleaning up stream session: %s", streamID)
		s.manager.StopStream(streamID)
	}()

	log.Printf("📺 Stream %s processing started", streamID)
}

func (s *Server) handlePlay(conn *rtmp.Conn) {
	streamKey := s.extractStreamKey(conn.URL.Path)
	log.Printf("📺 New RTMP play connection - Stream Key: %s", streamKey)

	// Try Redis first for stream key mapping
	streamID, err := s.manager.GetStreamIDByKey(streamKey)
	if err != nil {
		log.Printf("❌ Redis error getting stream ID: %v", err)
		return
	}

	// Fallback to database if not found in Redis
	if streamID == "" {
		ctx := context.Background()
		dbStreamID, err := s.manager.GetQueries().GetStreamByKey(ctx, sql.NullString{String: streamKey, Valid: true})
		if err != nil {
			log.Printf("❌ Invalid stream key for playback: %s", streamKey)
			return
		}
		streamID = dbStreamID
	}

	// Check if stream is active (in memory or Redis)
	_, exists := s.manager.GetSession(streamID)
	if !exists {
		// Try to load from Redis
		redisSession, err := s.manager.GetSessionFromRedis(streamID)
		if err != nil || redisSession == nil {
			log.Printf("❌ Stream %s not currently live", streamID)
			return
		}
	}

	log.Printf("✅ Serving playback for stream %s", streamID)
}

func (s *Server) extractStreamKey(path string) string {
	streamKey := path[1:] // Remove leading "/"
	parts := strings.Split(streamKey, "/")
	if len(parts) > 1 {
		return parts[0] // Use first part only
	}
	return streamKey
}