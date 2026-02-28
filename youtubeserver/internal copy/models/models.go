package models

import "time"

type StreamSession struct {
	ID                string    `json:"id"`
	FFmpegCmd         string    `json:"ffmpeg_cmd,omitempty"`
	StartTime         time.Time `json:"start_time"`
	Status            string    `json:"status"`
	ResourceURL       string    `json:"resource_url,omitempty"`
	LastHeartbeat     time.Time `json:"last_heartbeat"`
	PacketLossRate    float64   `json:"packet_loss_rate"`
	CurrentBitrate    uint64    `json:"current_bitrate"`
	ReconnectAttempts int       `json:"reconnect_attempts"`
	IsRecovering      bool      `json:"is_recovering"`
	
	// Non-serializable fields - marked with json:"-"
	HealthCheckTicker *time.Ticker `json:"-"`
	StatsCollector    chan struct{} `json:"-"`
	CancelFunc        func()        `json:"-"`
}

// RedisStreamSession is a simplified version for Redis storage
type RedisStreamSession struct {
	ID                string    `json:"id"`
	StartTime         time.Time `json:"start_time"`
	Status            string    `json:"status"`
	ResourceURL       string    `json:"resource_url,omitempty"`
	LastHeartbeat     time.Time `json:"last_heartbeat"`
	PacketLossRate    float64   `json:"packet_loss_rate"`
	CurrentBitrate    uint64    `json:"current_bitrate"`
	ReconnectAttempts int       `json:"reconnect_attempts"`
	IsRecovering      bool      `json:"is_recovering"`
}

// Convert to Redis-compatible session
func (s *StreamSession) ToRedisSession() *RedisStreamSession {
	return &RedisStreamSession{
		ID:                s.ID,
		StartTime:         s.StartTime,
		Status:            s.Status,
		ResourceURL:       s.ResourceURL,
		LastHeartbeat:     s.LastHeartbeat,
		PacketLossRate:    s.PacketLossRate,
		CurrentBitrate:    s.CurrentBitrate,
		ReconnectAttempts: s.ReconnectAttempts,
		IsRecovering:      s.IsRecovering,
	}
}

// Convert from Redis session
func (r *RedisStreamSession) ToStreamSession() *StreamSession {
	return &StreamSession{
		ID:                r.ID,
		StartTime:         r.StartTime,
		Status:            r.Status,
		ResourceURL:       r.ResourceURL,
		LastHeartbeat:     r.LastHeartbeat,
		PacketLossRate:    r.PacketLossRate,
		CurrentBitrate:    r.CurrentBitrate,
		ReconnectAttempts: r.ReconnectAttempts,
		IsRecovering:      r.IsRecovering,
		StatsCollector:    make(chan struct{}), // Initialize new channel
	}
}

// Rest of your existing structs remain the same...
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

type CreateStreamRequest struct {
	Title string `json:"title"`
}

type CreateStreamResponse struct {
	StreamID     string `json:"stream_id"`
	StreamKey    string `json:"stream_key"`
	RTMPServer   string `json:"rtmp_server"`
	RTMPURL      string `json:"rtmp_url"`
	PlayURL      string `json:"play_url"`
	Instructions string `json:"instructions"`
}