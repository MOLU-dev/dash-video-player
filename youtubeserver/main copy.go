package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/molu/youtube/server/internal/db"
	"github.com/sqlc-dev/pqtype"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/nareix/joy4/format"
	"github.com/nareix/joy4/format/flv"
	"github.com/nareix/joy4/format/rtmp"
)

type StreamManager struct {
	queries *db.Queries
	dbConn  *sql.DB
	streams map[string]*StreamSession
	mu      sync.RWMutex
	server  *rtmp.Server
}

type StreamSession struct {
	ID                string
	FFmpegCmd         *exec.Cmd
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
	cancelFunc        context.CancelFunc
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

func init() {
	format.RegisterAll()
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

	queries := db.New(dbConnection)

	sm := &StreamManager{
		queries: queries,
		dbConn:  dbConnection,
		streams: make(map[string]*StreamSession),
	}

	sm.server = &rtmp.Server{
		Addr: ":1935",
	}

	return sm, nil
}

func (sm *StreamManager) startRTMPServer() {
	log.Println("🚀 Starting RTMP server on port 1935")

	sm.server.HandlePublish = func(conn *rtmp.Conn) {
		streamKey := conn.URL.Path[1:] // Remove leading "/"
		
		// Handle duplicate stream key in path (e.g., "key/key" becomes "key")
		parts := strings.Split(streamKey, "/")
		if len(parts) > 1 {
			streamKey = parts[0] // Use the first part only
			log.Printf("📥 New RTMP publish connection - Cleaned Stream Key from '%s' to '%s'", conn.URL.Path[1:], streamKey)
		} else {
			log.Printf("📥 New RTMP publish connection - Stream Key: %s", streamKey)
		}

		ctx := context.Background()
		streamID, err := sm.queries.GetStreamByKey(ctx, sql.NullString{String: streamKey, Valid: true})
		if err != nil {
			log.Printf("❌ Invalid stream key: %s (error: %v)", streamKey, err)
			return
		}
		log.Printf("✅ Valid stream key for stream: %s", streamID)

		outputDir := fmt.Sprintf("./streams/%s", streamID)
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			log.Printf("❌ Failed to create output directory: %v", err)
			return
		}
		log.Printf("✅ Output directory created: %s", outputDir)

		cancelCtx, cancel := context.WithCancel(context.Background())
		session := &StreamSession{
			ID:             streamID,
			StartTime:      time.Now(),
			Status:         "live",
			StatsCollector: make(chan struct{}),
			cancelFunc:     cancel,
		}

		sm.mu.Lock()
		sm.streams[streamID] = session
		sm.mu.Unlock()

		err = sm.queries.UpdateStreamToLive(ctx, db.UpdateStreamToLiveParams{
			StartTime: sql.NullTime{Time: time.Now(), Valid: true},
			ID:        streamID,
		})
		if err != nil {
			log.Printf("❌ Failed to update stream status: %v", err)
		}

		sm.logConnectionEvent(streamID, "connected", map[string]interface{}{
			"timestamp": time.Now(),
		})

		go sm.monitorStreamHealth(streamID, session)
		go sm.startFFmpegTranscoding(cancelCtx, streamID, outputDir, conn)

		log.Printf("📺 Stream %s processing started", streamID)
	}

	sm.server.HandlePlay = func(conn *rtmp.Conn) {
		streamKey := conn.URL.Path[1:]
		
		// Handle duplicate stream key in path
		parts := strings.Split(streamKey, "/")
		if len(parts) > 1 {
			streamKey = parts[0]
		}
		
		log.Printf("📺 New RTMP play connection - Stream Key: %s", streamKey)

		ctx := context.Background()
		streamID, err := sm.queries.GetStreamByKey(ctx, sql.NullString{String: streamKey, Valid: true})
		if err != nil {
			log.Printf("❌ Invalid stream key for playback: %s", streamKey)
			return
		}

		sm.mu.RLock()
		_, exists := sm.streams[streamID]
		sm.mu.RUnlock()

		if !exists {
			log.Printf("❌ Stream %s not currently live", streamID)
			return
		}

		log.Printf("✅ Serving playback for stream %s", streamID)
	}

	log.Println("✅ RTMP server configured, starting listener...")
	if err := sm.server.ListenAndServe(); err != nil {
		log.Fatal("❌ RTMP server error:", err)
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

	session.LastHeartbeat = time.Now()

	quality := "good"

	err := sm.queries.UpdateStreamStats(ctx, db.UpdateStreamStatsParams{
		LastHeartbeat:     sql.NullTime{Time: time.Now(), Valid: true},
		ConnectionQuality: sql.NullString{String: quality, Valid: true},
		PacketLossPercent: sql.NullString{String: "0.00", Valid: true},
		CurrentBitrate:    sql.NullInt64{Int64: 0, Valid: true},
		ID:                streamID,
	})

	if err != nil {
		log.Printf("❌ Failed to update stream stats: %v", err)
	}

	sm.queries.InsertStreamAnalytics(ctx, db.InsertStreamAnalyticsParams{
		StreamID: sql.NullString{String: streamID, Valid: true},
		Bitrate:  sql.NullInt64{Int64: 0, Valid: true},
		Fps:      sql.NullInt32{Int32: 30, Valid: true},
	})

	log.Printf("📊 Stream %s stats - Quality: %s", streamID, quality)
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

	if !exists || currentSession.Status != "live" {
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

func (sm *StreamManager) startFFmpegTranscoding(ctx context.Context, streamID, outputDir string, conn *rtmp.Conn) {
	dbCtx := context.Background()
	log.Printf("🎬 Starting FFmpeg transcoding for stream %s", streamID)
	
	quality, err := sm.queries.GetConnectionQuality(dbCtx, streamID)
	if err != nil {
		quality = "good"
	}

	preset := "veryfast"
	if quality == "poor" {
		preset = "ultrafast"
	}

	// Start FFmpeg command that reads from stdin
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-re",
		"-i", "pipe:0", // Read from stdin
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
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:0", "1920x1080", "-b:v:0", "5000k", "-maxrate:v:0", "5350k", "-bufsize:v:0", "10000k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:1", "1280x720", "-b:v:1", "2800k", "-maxrate:v:1", "2996k", "-bufsize:v:1", "5600k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:2", "854x480", "-b:v:2", "1400k", "-maxrate:v:2", "1498k", "-bufsize:v:2", "2800k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:3", "640x360", "-b:v:3", "600k", "-maxrate:v:3", "642k", "-bufsize:v:3", "1200k",
		"-map", "0:v:0", "-map", "0:a:0",
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

	// Get stdin pipe
	stdin, err := cmd.StdinPipe()
	if err != nil {
		log.Printf("❌ Failed to create stdin pipe: %v", err)
		sm.handleDisconnection(streamID, sm.streams[streamID])
		return
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Printf("🚀 Starting FFmpeg DASH transcoding for stream %s", streamID)

	if err := cmd.Start(); err != nil {
		log.Printf("❌ FFmpeg start error: %v", err)
		sm.handleDisconnection(streamID, sm.streams[streamID])
		return
	}
	log.Printf("✅ FFmpeg started with PID: %d", cmd.Process.Pid)

	sm.mu.Lock()
	if session, exists := sm.streams[streamID]; exists {
		session.FFmpegCmd = cmd
	}
	sm.mu.Unlock()

	// Copy RTMP stream to FFmpeg stdin using joy4 FLV muxer
	go func() {
		defer stdin.Close()
		
		// Get streams from RTMP connection
		streams, err := conn.Streams()
		if err != nil {
			log.Printf("❌ Failed to get streams: %v", err)
			return
		}

		// Create FLV muxer to write to stdin
		flvMuxer := flv.NewMuxer(stdin)
		
		// Write FLV header
		if err := flvMuxer.WriteHeader(streams); err != nil {
			log.Printf("❌ Failed to write FLV header: %v", err)
			return
		}

		// Copy packets from RTMP to FLV
		for {
			pkt, err := conn.ReadPacket()
			if err != nil {
				log.Printf("📺 Stream %s ended: %v", streamID, err)
				break
			}
			
			if err := flvMuxer.WritePacket(pkt); err != nil {
				log.Printf("❌ Failed to write packet: %v", err)
				break
			}
		}

		if err := flvMuxer.WriteTrailer(); err != nil {
			log.Printf("⚠️ Failed to write FLV trailer: %v", err)
		}
		
		log.Printf("✅ Stream data copy completed for %s", streamID)
	}()

	// Wait for FFmpeg to finish
	err = cmd.Wait()
	if err != nil {
		if ctx.Err() == context.Canceled {
			log.Printf("✅ FFmpeg stopped gracefully for stream %s", streamID)
		} else {
			log.Printf("❌ FFmpeg exited with error: %v", err)
			sm.handleDisconnection(streamID, sm.streams[streamID])
		}
	} else {
		log.Printf("✅ FFmpeg completed successfully for stream %s", streamID)
	}
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

	// Cancel the FFmpeg context
	if session.cancelFunc != nil {
		session.cancelFunc()
	}

	if session.StatsCollector != nil {
		close(session.StatsCollector)
	}
	if session.HealthCheckTicker != nil {
		session.HealthCheckTicker.Stop()
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
		"stream_id":    streamID,
		"stream_key":   streamKey,
		"rtmp_server":  "rtmp://localhost:1935",
		"rtmp_url":     fmt.Sprintf("rtmp://localhost:1935/%s", streamKey),
		"play_url":     fmt.Sprintf("http://localhost:8080/streams/%s/manifest.mpd", streamID),
		"instructions": "Use 'rtmp_server' as Server URL and 'stream_key' as Stream Key in OBS",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("✅ Stream created successfully: %s", streamID)
	log.Printf("📺 OBS Configuration:")
	log.Printf("   Server: rtmp://localhost:1935")
	log.Printf("   Stream Key: %s", streamKey)
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

	packetLoss := healthData.PacketLossPercent
	bitrate := healthData.CurrentBitrate
	reconnectAttempts := healthData.ReconnectAttempts

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

func main() {
	dbConn := "postgres://molu:incorrect@localhost/youtube?sslmode=disable"
	log.Printf("🚀 Starting RTMP Server with database: %s", dbConn)

	sm, err := NewStreamManager(dbConn)
	if err != nil {
		log.Fatal("❌ Failed to initialize:", err)
	}
	defer sm.dbConn.Close()

	go sm.cleanupStaleStreams()
	go sm.startRTMPServer()

	r := mux.NewRouter()

	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			log.Printf("🌐 %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
			next.ServeHTTP(w, r)
			log.Printf("✅ %s %s completed in %v", r.Method, r.URL.Path, time.Since(start))
		})
	})

	r.HandleFunc("/api/streams", sm.CreateStream).Methods("POST")
	r.HandleFunc("/api/streams", sm.ListStreams).Methods("GET")
	r.HandleFunc("/api/streams/{id}", sm.GetStream).Methods("GET")
	r.HandleFunc("/api/streams/{id}/health", sm.GetStreamHealth).Methods("GET")

	r.PathPrefix("/streams/").Handler(
		http.StripPrefix("/streams/", http.FileServer(http.Dir("./streams"))),
	)

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

	log.Println("🚀 RTMP Server starting on :1935")
	log.Println("🌐 HTTP API starting on :8080")
	log.Println("📡 RTMP endpoint: rtmp://localhost:1935/<stream_key>")
	log.Println("🔧 API endpoints:")
	log.Println("   POST   http://localhost:8080/api/streams")
	log.Println("   GET    http://localhost:8080/api/streams")
	log.Println("   GET    http://localhost:8080/api/streams/{id}")
	log.Println("   GET    http://localhost:8080/api/streams/{id}/health")
	log.Println("💚 Health monitoring enabled")
	log.Println("")
	log.Println("📝 OBS Studio Configuration:")
	log.Println("   1. Create a stream using: POST http://localhost:8080/api/streams")
	log.Println("   2. In OBS Settings → Stream:")
	log.Println("      - Server: rtmp://localhost:1935")
	log.Println("      - Stream Key: <use the stream_key from API response>")
	log.Fatal(http.ListenAndServe("0.0.0.0:8080", r))
}