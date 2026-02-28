package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/molu/youtube/server/internal/db"
	"github.com/pion/interceptor"
	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media/ivfwriter"
	"github.com/pion/webrtc/v3/pkg/media/oggwriter"
	"github.com/sqlc-dev/pqtype"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

type StreamManager struct {
	queries *db.Queries
	dbConn  *sql.DB
	streams map[string]*StreamSession
	mu      sync.RWMutex
	api     *webrtc.API
}

type StreamSession struct {
	ID                string
	PeerConnection    *webrtc.PeerConnection
	FFmpegCmd         *exec.Cmd
	VideoWriter       *ivfwriter.IVFWriter
	AudioWriter       *oggwriter.OggWriter
	StartTime         time.Time
	Status            string
	ResourceURL       string
	LastHeartbeat     time.Time
	PacketLossRate    float64
	CurrentBitrate    uint64
	ReconnectAttempts int
	IsRecovering      bool
	HealthCheckTicker *time.Ticker
	StatsCollector    chan struct{}
}

type StreamMetadata struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	StreamKey   string    `json:"stream_key"`
	Status      string    `json:"status"`
	StartTime   time.Time `json:"start_time"`
	ViewerCount int       `json:"viewer_count"`
}

type StreamHealth struct {
	StreamID          string    `json:"stream_id"`
	Status            string    `json:"status"`
	ConnectionQuality string    `json:"connection_quality"`
	PacketLoss        float64   `json:"packet_loss_percent"`
	CurrentBitrate    int64     `json:"current_bitrate"`
	LastHeartbeat     time.Time `json:"last_heartbeat"`
	ReconnectAttempts int       `json:"reconnect_attempts"`
	Uptime            int64     `json:"uptime_seconds"`
}

func NewStreamManager(dbConn string) (*StreamManager, error) {
	log.Printf("🔧 Initializing StreamManager with database: %s", dbConn)

	dbConnection, err := sql.Open("postgres", dbConn)
	if err != nil {
		log.Printf("❌ Failed to open database: %v", err)
		return nil, err
	}

	if err := dbConnection.Ping(); err != nil {
		log.Printf("❌ Database ping failed: %v", err)
		return nil, err
	}
	log.Println("✅ Database connection established")

	// ---- WebRTC Setup ----
	mEngine := &webrtc.MediaEngine{}
	if err := mEngine.RegisterDefaultCodecs(); err != nil {
		log.Printf("❌ Failed to register codecs: %v", err)
		return nil, err
	}

	iRegistry := &interceptor.Registry{}
	if err := webrtc.RegisterDefaultInterceptors(mEngine, iRegistry); err != nil {
		log.Printf("❌ Failed to register interceptors: %v", err)
		return nil, err
	}

	api := webrtc.NewAPI(
		webrtc.WithMediaEngine(mEngine),
		webrtc.WithInterceptorRegistry(iRegistry),
	)
	log.Println("✅ WebRTC API initialized")

	queries := db.New(dbConnection)

	return &StreamManager{
		queries: queries,
		dbConn:  dbConnection,
		streams: make(map[string]*StreamSession),
		api:     api,
	}, nil
}



func (sm *StreamManager) HandleWHIP(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	log.Printf("📥 WHIP Request: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
	log.Printf("📋 Headers: %v", r.Header)

	if r.Method != "POST" {
		log.Printf("❌ Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Try to get stream key from Authorization header first
	authHeader := r.Header.Get("Authorization")
	streamKey := ""

	if authHeader != "" {
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			streamKey = authHeader[7:]
			log.Printf("🔑 Stream key from Authorization header: %s...", streamKey[:min(8, len(streamKey))])
		} else {
			log.Printf("❌ Invalid authorization format: %s", authHeader)
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}
	} else {
		streamKey = r.URL.Query().Get("stream_key")
		if streamKey == "" {
			log.Println("❌ No Authorization header or stream_key query parameter")
			http.Error(w, "Authorization required. Use Authorization: Bearer <stream_key> or ?stream_key=<key>", http.StatusUnauthorized)
			return
		}
		log.Printf("🔑 Stream key from query parameter: %s...", streamKey[:min(8, len(streamKey))])
	}

	streamID, err := sm.queries.GetStreamByKey(ctx, sql.NullString{String: streamKey, Valid: true})
	if err != nil {
		log.Printf("❌ Invalid stream key: %s... (error: %v)", streamKey[:min(8, len(streamKey))], err)
		http.Error(w, "Invalid stream key or stream not ready", http.StatusUnauthorized)
		return
	}
	log.Printf("✅ Valid stream key for stream: %s", streamID)

	offerBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("❌ Failed to read offer: %v", err)
		http.Error(w, "Failed to read offer", http.StatusBadRequest)
		return
	}
	log.Printf("📄 Offer SDP received (%d bytes)", len(offerBytes))

	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  string(offerBytes),
	}

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}

	pc, err := sm.api.NewPeerConnection(config)
	if err != nil {
		log.Printf("❌ Failed to create peer connection: %v", err)
		http.Error(w, "Failed to create peer connection", http.StatusInternalServerError)
		return
	}
	log.Println("✅ PeerConnection created")

	outputDir := fmt.Sprintf("./streams/%s", streamID)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("❌ Failed to create output directory: %v", err)
		http.Error(w, "Failed to create output directory", http.StatusInternalServerError)
		return
	}
	log.Printf("✅ Output directory created: %s", outputDir)

	videoFile := fmt.Sprintf("%s/input.ivf", outputDir)
	audioFile := fmt.Sprintf("%s/input.ogg", outputDir)

	videoWriter, err := ivfwriter.New(videoFile)
	if err != nil {
		log.Printf("❌ Failed to create video writer: %v", err)
		http.Error(w, "Failed to create video writer", http.StatusInternalServerError)
		return
	}

	audioWriter, err := oggwriter.New(audioFile, 48000, 2)
	if err != nil {
		log.Printf("❌ Failed to create audio writer: %v", err)
		videoWriter.Close()
		http.Error(w, "Failed to create audio writer", http.StatusInternalServerError)
		return
	}
	log.Println("✅ Video and audio writers created")

	session := &StreamSession{
		ID:             streamID,
		PeerConnection: pc,
		VideoWriter:    videoWriter,
		AudioWriter:    audioWriter,
		StartTime:      time.Now(),
		Status:         "connecting",
		StatsCollector: make(chan struct{}),
	}

	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		codec := track.Codec()
		log.Printf("🎬 Track received - Kind: %s, Codec: %s, PayloadType: %d, SSRC: %d",
			track.Kind(), codec.MimeType, codec.PayloadType, track.SSRC())

		if track.Kind() == webrtc.RTPCodecTypeVideo {
			log.Printf("📹 Starting video track handler for stream %s", streamID)
			go sm.handleVideoTrack(track, session, outputDir)
		} else if track.Kind() == webrtc.RTPCodecTypeAudio {
			log.Printf("🔊 Starting audio track handler for stream %s", streamID)
			go sm.handleAudioTrack(track, session, outputDir)
		}
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		ctx := context.Background()
		log.Printf("🔄 Stream %s connection state: %s", streamID, state.String())

		switch state {
		case webrtc.PeerConnectionStateConnected:
			log.Printf("✅ Stream %s connected successfully", streamID)
			err := sm.queries.UpdateStreamToLive(ctx, db.UpdateStreamToLiveParams{
				StartTime: sql.NullTime{Time: time.Now(), Valid: true},
				ID:        streamID,
			})
			if err != nil {
				log.Printf("❌ Failed to update stream status: %v", err)
			}

			sm.logConnectionEvent(streamID, "connected", map[string]interface{}{
				"timestamp": time.Now(),
			})

			go sm.startFFmpegTranscoding(streamID, outputDir)
			go sm.monitorStreamHealth(streamID, session)

		case webrtc.PeerConnectionStateConnecting:
			log.Printf("⏳ Stream %s connecting...", streamID)
			sm.queries.UpdateStreamStatus(ctx, db.UpdateStreamStatusParams{
				Status: sql.NullString{String: "connecting", Valid: true},
				ID:     streamID,
			})

		case webrtc.PeerConnectionStateDisconnected:
			log.Printf("⚠️ Stream %s disconnected", streamID)
			sm.handleDisconnection(streamID, session)

		case webrtc.PeerConnectionStateFailed:
			log.Printf("❌ Stream %s connection failed", streamID)
			sm.queries.UpdateStreamStatusWithEndTime(ctx, db.UpdateStreamStatusWithEndTimeParams{
				Status:  sql.NullString{String: "failed", Valid: true},
				EndTime: sql.NullTime{Time: time.Now(), Valid: true},
				ID:      streamID,
			})
			sm.logConnectionEvent(streamID, "failed", nil)
			sm.StopStream(streamID)

		case webrtc.PeerConnectionStateClosed:
			log.Printf("🔒 Stream %s connection closed", streamID)
			sm.queries.UpdateStreamStatusWithEndTime(ctx, db.UpdateStreamStatusWithEndTimeParams{
				Status:  sql.NullString{String: "ended", Valid: true},
				EndTime: sql.NullTime{Time: time.Now(), Valid: true},
				ID:      streamID,
			})
			sm.logConnectionEvent(streamID, "closed", nil)
			sm.StopStream(streamID)
		}
	})

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		ctx := context.Background()
		log.Printf("🌐 Stream %s ICE state: %s", streamID, state.String())

		switch state {
		case webrtc.ICEConnectionStateDisconnected:
			sm.queries.UpdateConnectionQuality(ctx, db.UpdateConnectionQualityParams{
				ConnectionQuality: sql.NullString{String: "poor", Valid: true},
				ID:                streamID,
			})
		case webrtc.ICEConnectionStateFailed:
			sm.queries.UpdateConnectionQuality(ctx, db.UpdateConnectionQualityParams{
				ConnectionQuality: sql.NullString{String: "failed", Valid: true},
				ID:                streamID,
			})
		case webrtc.ICEConnectionStateConnected:
			sm.queries.UpdateConnectionQuality(ctx, db.UpdateConnectionQualityParams{
				ConnectionQuality: sql.NullString{String: "good", Valid: true},
				ID:                streamID,
			})
		}
	})

	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			log.Printf("✅ Stream %s ICE gathering complete", streamID)
		} else {
			log.Printf("❄️ Stream %s ICE candidate: %s", streamID, candidate.String())
		}
	})

	if err := pc.SetRemoteDescription(offer); err != nil {
		log.Printf("❌ Failed to set remote description: %v", err)
		http.Error(w, "Failed to set remote description", http.StatusInternalServerError)
		return
	}
	log.Println("✅ Remote description set")

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		log.Printf("❌ Failed to create answer: %v", err)
		http.Error(w, "Failed to create answer", http.StatusInternalServerError)
		return
	}
	log.Println("✅ Answer created")

	if err := pc.SetLocalDescription(answer); err != nil {
		log.Printf("❌ Failed to set local description: %v", err)
		http.Error(w, "Failed to set local description", http.StatusInternalServerError)
		return
	}
	log.Println("✅ Local description set")

	resourceURL := fmt.Sprintf("/whip/%s", streamID)
	session.ResourceURL = resourceURL

	sm.mu.Lock()
	sm.streams[streamID] = session
	sm.mu.Unlock()

	w.Header().Set("Content-Type", "application/sdp")
	w.Header().Set("Location", resourceURL)
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(answer.SDP))
	log.Printf("✅ WHIP response sent for stream %s", streamID)
}

func (sm *StreamManager) handleVideoTrack(track *webrtc.TrackRemote, session *StreamSession, outputDir string) {
	defer session.VideoWriter.Close()
	log.Printf("📹 Video track handler started for stream %s", session.ID)

	packetCount := 0
	for {
		rtpPacket, _, err := track.ReadRTP()
		if err != nil {
			log.Printf("❌ Video track read error for stream %s: %v", session.ID, err)
			return
		}

		if err := session.VideoWriter.WriteRTP(rtpPacket); err != nil {
			log.Printf("❌ Video write error for stream %s: %v", session.ID, err)
			return
		}

		packetCount++
		if packetCount%100 == 0 {
			log.Printf("📹 Stream %s: Written %d video packets", session.ID, packetCount)
		}
	}
}

func (sm *StreamManager) handleAudioTrack(track *webrtc.TrackRemote, session *StreamSession, outputDir string) {
	defer session.AudioWriter.Close()
	log.Printf("🔊 Audio track handler started for stream %s", session.ID)

	packetCount := 0
	for {
		rtpPacket, _, err := track.ReadRTP()
		if err != nil {
			log.Printf("❌ Audio track read error for stream %s: %v", session.ID, err)
			return
		}

		if err := session.AudioWriter.WriteRTP(rtpPacket); err != nil {
			log.Printf("❌ Audio write error for stream %s: %v", session.ID, err)
			return
		}

		packetCount++
		if packetCount%100 == 0 {
			log.Printf("🔊 Stream %s: Written %d audio packets", session.ID, packetCount)
		}
	}
}

func (sm *StreamManager) monitorStreamHealth(streamID string, session *StreamSession) {
	log.Printf("❤️ Starting health monitoring for stream %s", streamID)
	ticker := time.NewTicker(5 * time.Second)
	session.HealthCheckTicker = ticker
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			sm.updateStreamStats(streamID, session)
		case <-session.StatsCollector:
			log.Printf("❤️ Health monitoring stopped for stream %s", streamID)
			return
		}
	}
}

func (sm *StreamManager) updateStreamStats(streamID string, session *StreamSession) {
	ctx := context.Background()

	if session.PeerConnection == nil {
		return
	}

	stats := session.PeerConnection.GetStats()

	var totalPacketsLost uint32
	var totalPacketsReceived uint32
	var totalBytesReceived uint64

	for _, stat := range stats {
		switch s := stat.(type) {
		case *webrtc.InboundRTPStreamStats:
			totalPacketsLost += uint32(s.PacketsLost)
			totalPacketsReceived += s.PacketsReceived
			totalBytesReceived += s.BytesReceived
		}
	}

	var packetLossPercent float64
	if totalPacketsReceived > 0 {
		packetLossPercent = (float64(totalPacketsLost) / float64(totalPacketsReceived+totalPacketsLost)) * 100
	}

	var currentBitrate uint64
	if totalBytesReceived > 0 {
		currentBitrate = totalBytesReceived * 8
	}

	session.LastHeartbeat = time.Now()
	session.PacketLossRate = packetLossPercent
	session.CurrentBitrate = currentBitrate

	quality := "good"
	if packetLossPercent > 10 {
		quality = "poor"
	} else if packetLossPercent > 5 {
		quality = "fair"
	}

	err := sm.queries.UpdateStreamStats(ctx, db.UpdateStreamStatsParams{
		LastHeartbeat:     sql.NullTime{Time: time.Now(), Valid: true},
		ConnectionQuality: sql.NullString{String: quality, Valid: true},
		PacketLossPercent: sql.NullString{String: fmt.Sprintf("%.2f", packetLossPercent), Valid: true},
		CurrentBitrate:    sql.NullInt64{Int64: int64(currentBitrate), Valid: true},
		ID:                streamID,
	})

	if err != nil {
		log.Printf("❌ Failed to update stream stats: %v", err)
	}

	sm.queries.InsertStreamAnalytics(ctx, db.InsertStreamAnalyticsParams{
		StreamID: sql.NullString{String: streamID, Valid: true},
		Bitrate:  sql.NullInt64{Int64: int64(currentBitrate), Valid: true},
		Fps:      sql.NullInt32{Int32: 30, Valid: true},
	})

	if quality == "poor" {
		log.Printf("⚠️  Stream %s has poor connection quality (packet loss: %.2f%%)",
			streamID, packetLossPercent)
		sm.logConnectionEvent(streamID, "quality_degraded", map[string]interface{}{
			"packet_loss": packetLossPercent,
			"bitrate":     currentBitrate,
		})
	}

	log.Printf("📊 Stream %s stats - Quality: %s, Packet Loss: %.2f%%, Bitrate: %d bps",
		streamID, quality, packetLossPercent, currentBitrate)
}

func (sm *StreamManager) handleDisconnection(streamID string, session *StreamSession) {
	ctx := context.Background()

	sm.mu.Lock()
	session.IsRecovering = true
	session.ReconnectAttempts++
	attempts := session.ReconnectAttempts
	sm.mu.Unlock()

	log.Printf("🔄 Stream %s disconnected, attempting recovery (attempt %d)", streamID, attempts)

	sm.queries.UpdateStreamReconnecting(ctx, db.UpdateStreamReconnectingParams{
		ReconnectAttempts: sql.NullInt32{Int32: int32(attempts), Valid: true},
		ID:                streamID,
	})

	sm.logConnectionEvent(streamID, "reconnecting", map[string]interface{}{
		"attempt": attempts,
	})

	time.Sleep(30 * time.Second)

	sm.mu.RLock()
	currentSession, exists := sm.streams[streamID]
	sm.mu.RUnlock()

	if !exists || currentSession.PeerConnection.ConnectionState() != webrtc.PeerConnectionStateConnected {
		if attempts >= 3 {
			log.Printf("❌ Stream %s failed after %d reconnection attempts", streamID, attempts)
			sm.queries.UpdateStreamStatusWithEndTime(ctx, db.UpdateStreamStatusWithEndTimeParams{
				Status:  sql.NullString{String: "failed", Valid: true},
				EndTime: sql.NullTime{Time: time.Now(), Valid: true},
				ID:      streamID,
			})
			sm.logConnectionEvent(streamID, "failed_max_retries", map[string]interface{}{
				"attempts": attempts,
			})
			sm.StopStream(streamID)
		}
	} else {
		log.Printf("✅ Stream %s reconnected successfully", streamID)
		sm.mu.Lock()
		session.IsRecovering = false
		sm.mu.Unlock()

		sm.queries.UpdateStreamStatus(ctx, db.UpdateStreamStatusParams{
			Status: sql.NullString{String: "live", Valid: true},
			ID:     streamID,
		})
		sm.logConnectionEvent(streamID, "reconnected", nil)
	}
}

func (sm *StreamManager) logConnectionEvent(streamID, eventType string, details map[string]interface{}) {
	ctx := context.Background()
	detailsJSON, _ := json.Marshal(details)

	err := sm.queries.InsertConnectionLog(ctx, db.InsertConnectionLogParams{
		StreamID:  sql.NullString{String: streamID, Valid: true},
		EventType: sql.NullString{String: eventType, Valid: true},
		Details: pqtype.NullRawMessage{
			RawMessage: detailsJSON,
			Valid:      true,
		},
	})

	if err != nil {
		log.Printf("❌ Failed to log connection event: %v", err)
	} else {
		log.Printf("📝 Logged connection event: %s for stream %s", eventType, streamID)
	}
}

func (sm *StreamManager) startFFmpegTranscoding(streamID, outputDir string) {
	ctx := context.Background()
	log.Printf("🎬 Starting FFmpeg transcoding for stream %s", streamID)

	videoFile := fmt.Sprintf("%s/input.ivf", outputDir)
	audioFile := fmt.Sprintf("%s/input.ogg", outputDir)

	time.Sleep(2 * time.Second)

	quality, err := sm.queries.GetConnectionQuality(ctx, streamID)
	if err != nil {
		quality = "good"
	}

	preset := "veryfast"
	if quality == "poor" {
		preset = "ultrafast"
	}

	cmd := exec.Command("ffmpeg",
		"-re",
		"-i", videoFile,
		"-i", audioFile,
		"-c:v", "libx264",
		"-preset", preset,
		"-tune", "zerolatency",
		"-g", "60",
		"-keyint_min", "60",
		"-sc_threshold", "0",
		"-profile:v", "high",
		"-level", "4.0",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
		"-map", "0:v:0", "-map", "1:a:0",
		"-s:v:0", "1920x1080", "-b:v:0", "5000k", "-maxrate:v:0", "5350k", "-bufsize:v:0", "10000k",
		"-map", "0:v:0", "-map", "1:a:0",
		"-s:v:1", "1280x720", "-b:v:1", "2800k", "-maxrate:v:1", "2996k", "-bufsize:v:1", "5600k",
		"-map", "0:v:0", "-map", "1:a:0",
		"-s:v:2", "854x480", "-b:v:2", "1400k", "-maxrate:v:2", "1498k", "-bufsize:v:2", "2800k",
		"-map", "0:v:0", "-map", "1:a:0",
		"-s:v:3", "640x360", "-b:v:3", "600k", "-maxrate:v:3", "642k", "-bufsize:v:3", "1200k",
		"-map", "0:v:0", "-map", "1:a:0",
		"-s:v:4", "426x240", "-b:v:4", "300k", "-maxrate:v:4", "321k", "-bufsize:v:4", "600k",
		"-f", "dash",
		"-seg_duration", "2",
		"-use_template", "1",
		"-use_timeline", "1",
		"-streaming", "1",
		"-ldash", "1",
		"-window_size", "5",
		"-extra_window_size", "10",
		"-adaptation_sets", "id=0,streams=v id=1,streams=a",
		"-utc_timing_url", "https://time.akamai.com/?iso",
		fmt.Sprintf("%s/manifest.mpd", outputDir),
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Printf("🚀 Starting FFmpeg DASH transcoding for stream %s", streamID)
	log.Printf("📝 FFmpeg command: %s", cmd.String())

	if err := cmd.Start(); err != nil {
		log.Printf("❌ FFmpeg start error: %v", err)
		return
	}
	log.Printf("✅ FFmpeg started with PID: %d", cmd.Process.Pid)

	sm.mu.Lock()
	if session, exists := sm.streams[streamID]; exists {
		session.FFmpegCmd = cmd
	}
	sm.mu.Unlock()

	err = cmd.Wait()
	if err != nil {
		log.Printf("❌ FFmpeg exited with error: %v", err)
	} else {
		log.Printf("✅ FFmpeg completed successfully for stream %s", streamID)
	}
}

func (sm *StreamManager) HandleWHIPDelete(w http.ResponseWriter, r *http.Request) {
	log.Printf("🗑️ WHIP DELETE Request: %s from %s", r.URL.Path, r.RemoteAddr)

	if r.Method != "DELETE" {
		log.Printf("❌ Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	streamID := vars["id"]
	log.Printf("🛑 Stopping stream: %s", streamID)

	sm.StopStream(streamID)
	w.WriteHeader(http.StatusOK)
	log.Printf("✅ Stream %s stopped successfully", streamID)
}

func (sm *StreamManager) StopStream(streamID string) {
	ctx := context.Background()
	sm.mu.Lock()
	defer sm.mu.Unlock()

	session, exists := sm.streams[streamID]
	if !exists {
		log.Printf("⚠️ Stream %s not found for stopping", streamID)
		return
	}

	log.Printf("🛑 Stopping stream %s", streamID)

	if session.StatsCollector != nil {
		close(session.StatsCollector)
	}
	if session.HealthCheckTicker != nil {
		session.HealthCheckTicker.Stop()
	}
	if session.PeerConnection != nil {
		session.PeerConnection.Close()
	}
	if session.VideoWriter != nil {
		session.VideoWriter.Close()
	}
	if session.AudioWriter != nil {
		session.AudioWriter.Close()
	}
	if session.FFmpegCmd != nil && session.FFmpegCmd.Process != nil {
		log.Printf("🔪 Killing FFmpeg process for stream %s", streamID)
		session.FFmpegCmd.Process.Kill()
	}

	err := sm.queries.UpdateStreamEnded(ctx, db.UpdateStreamEndedParams{
		EndTime: sql.NullTime{Time: time.Now(), Valid: true},
		ID:      streamID,
	})

	if err != nil {
		log.Printf("❌ Failed to update stream status: %v", err)
	} else {
		log.Printf("✅ Stream %s status updated to 'ended'", streamID)
	}

	delete(sm.streams, streamID)
	log.Printf("✅ Stream %s completely stopped", streamID)
}

func (sm *StreamManager) CreateStream(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	log.Printf("📥 CreateStream Request: %s from %s", r.URL.Path, r.RemoteAddr)

	var req struct {
		Title string `json:"title"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Invalid request body: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	streamID := uuid.New().String()
	streamKey := uuid.New().String()

	log.Printf("🎬 Creating new stream: Title='%s', ID=%s", req.Title, streamID)

	err := sm.queries.CreateStream(ctx, db.CreateStreamParams{
		ID:        streamID,
		Title:     sql.NullString{String: req.Title, Valid: true},
		StreamKey: sql.NullString{String: streamKey, Valid: true},
	})

	if err != nil {
		log.Printf("❌ Database error creating stream: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"stream_id":  streamID,
		"stream_key": streamKey,
		"whip_url":   "http://localhost:8080/whip",
		"play_url":   fmt.Sprintf("http://localhost:8080/streams/%s/manifest.mpd", streamID),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("✅ Stream created successfully: %s", streamID)
}

func (sm *StreamManager) GetStream(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	streamID := vars["id"]
	log.Printf("📥 GetStream Request for: %s", streamID)

	stream, err := sm.queries.GetStream(ctx, streamID)
	if err != nil {
		log.Printf("❌ Stream not found: %s", streamID)
		http.Error(w, "Stream not found", http.StatusNotFound)
		return
	}

	metadata := StreamMetadata{
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

func (sm *StreamManager) ListStreams(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	log.Printf("📥 ListStreams Request from %s", r.RemoteAddr)

	rows, err := sm.queries.ListStreams(ctx)
	if err != nil {
		log.Printf("❌ Database error listing streams: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var streams []StreamMetadata
	for _, row := range rows {
		streams = append(streams, StreamMetadata{
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

func (sm *StreamManager) GetStreamHealth(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)
	streamID := vars["id"]
	log.Printf("📥 GetStreamHealth Request for: %s", streamID)

	healthData, err := sm.queries.GetStreamHealth(ctx, streamID)
	if err != nil {
		log.Printf("❌ Stream not found for health check: %s", streamID)
		http.Error(w, "Stream not found", http.StatusNotFound)
		return
	}

	packetLoss := healthData.PacketLossPercent        // string
	bitrate := healthData.CurrentBitrate              // int64
	reconnectAttempts := healthData.ReconnectAttempts // int32

	health := StreamHealth{
		StreamID:          streamID,
		Status:            healthData.Status.String,
		ConnectionQuality: healthData.ConnectionQuality,
		PacketLoss:        packetLoss,
		CurrentBitrate:    bitrate,
		LastHeartbeat:     healthData.LastHeartbeat.Time,
		ReconnectAttempts: int(reconnectAttempts),
	}

	if health.Status == "live" {
		health.Uptime = int64(time.Since(healthData.StartTime.Time).Seconds())
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
	log.Printf("✅ Health data returned for stream: %s", streamID)
}

func (sm *StreamManager) cleanupStaleStreams() {
	ctx := context.Background()
	log.Println("🧹 Starting stale streams cleanup routine")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		staleStreams, err := sm.queries.GetStaleStreams(ctx)
		if err != nil {
			log.Printf("❌ Cleanup query error: %v", err)
			continue
		}

		if len(staleStreams) > 0 {
			log.Printf("🧹 Found %d stale streams to clean up: %v", len(staleStreams), staleStreams)
		}

		for _, streamID := range staleStreams {
			log.Printf("🧹 Cleaning up stale stream: %s", streamID)
			sm.queries.UpdateStreamTimeout(ctx, streamID)
			sm.logConnectionEvent(streamID, "timeout", nil)
			sm.StopStream(streamID)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	dbConn := "postgres://molu:incorrect@localhost/youtube?sslmode=disable"
	log.Printf("🚀 Starting WHIP Server with database: %s", dbConn)

	sm, err := NewStreamManager(dbConn)
	if err != nil {
		log.Fatal("❌ Failed to initialize:", err)
	}
	defer sm.dbConn.Close()

	go sm.cleanupStaleStreams()

	r := mux.NewRouter()

	// Add request logging middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			log.Printf("🌐 %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
			next.ServeHTTP(w, r)
			log.Printf("✅ %s %s completed in %v", r.Method, r.URL.Path, time.Since(start))
		})
	})

	r.HandleFunc("/whip", sm.HandleWHIP).Methods("POST", "OPTIONS")
	r.HandleFunc("/whip/{id}", sm.HandleWHIPDelete).Methods("DELETE")

	r.HandleFunc("/api/streams", sm.CreateStream).Methods("POST")
	r.HandleFunc("/api/streams", sm.ListStreams).Methods("GET")
	r.HandleFunc("/api/streams/{id}", sm.GetStream).Methods("GET")
	r.HandleFunc("/api/streams/{id}/health", sm.GetStreamHealth).Methods("GET")

	r.PathPrefix("/streams/").Handler(
		http.StripPrefix("/streams/", http.FileServer(http.Dir("./streams"))),
	)

	// CORS middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Range")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range")
			if r.Method == "OPTIONS" {
				log.Printf("🔄 CORS preflight request: %s", r.URL.Path)
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	log.Println("🚀 WHIP Server starting on :8080")
	log.Println("📡 WHIP endpoint: http://localhost:8080/whip")
	log.Println("🔧 API endpoints:")
	log.Println("   POST   http://localhost:8080/api/streams")
	log.Println("   GET    http://localhost:8080/api/streams")
	log.Println("   GET    http://localhost:8080/api/streams/{id}")
	log.Println("   GET    http://localhost:8080/api/streams/{id}/health")
	log.Println("💚 Health monitoring enabled")
	log.Fatal(http.ListenAndServe("0.0.0.0:8080", r))
}
