package stream

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/molu/youtube/server/internal/db"
	"github.com/molu/youtube/server/internal/models"
)


func (m *Manager) MonitorHealth(streamID string, session *models.StreamSession) {
	log.Printf("❤️ Starting health monitoring for stream %s", streamID)
	ticker := time.NewTicker(5 * time.Second)
	session.HealthCheckTicker = ticker
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.updateStreamStats(streamID, session)
		case <-session.StatsCollector:
			log.Printf("❤️ Health monitoring stopped for stream %s", streamID)
			return
		}
	}
}

func (m *Manager) updateStreamStats(streamID string, session *models.StreamSession) {
	ctx := context.Background()
	session.LastHeartbeat = time.Now()

	// Update Redis heartbeat
	if err := m.SetStreamHeartbeat(streamID); err != nil {
		log.Printf("❌ Failed to update Redis heartbeat: %v", err)
	}

	quality := "good"

	err := m.queries.UpdateStreamStats(ctx, db.UpdateStreamStatsParams{
		LastHeartbeat:     sql.NullTime{Time: time.Now(), Valid: true},
		ConnectionQuality: sql.NullString{String: quality, Valid: true},
		PacketLossPercent: sql.NullString{String: "0.00", Valid: true},
		CurrentBitrate:    sql.NullInt64{Int64: 0, Valid: true},
		ID:                streamID,
	})

	if err != nil {
		log.Printf("❌ Failed to update stream stats: %v", err)
	}

	m.queries.InsertStreamAnalytics(ctx, db.InsertStreamAnalyticsParams{
		StreamID: sql.NullString{String: streamID, Valid: true},
		Bitrate:  sql.NullInt64{Int64: 0, Valid: true},
		Fps:      sql.NullInt32{Int32: 30, Valid: true},
	})

	// Update session in Redis
	m.SetSession(streamID, session)

	log.Printf("📊 Stream %s stats - Quality: %s", streamID, quality)
}


func (m *Manager) HandleDisconnection(streamID string, session *models.StreamSession) {
	ctx := context.Background()

	m.mu.Lock()
	session.IsRecovering = true
	session.ReconnectAttempts++
	attempts := session.ReconnectAttempts
	m.mu.Unlock()

	log.Printf("🔄 Stream %s disconnected, attempting recovery (attempt %d)", streamID, attempts)

	m.queries.UpdateStreamReconnecting(ctx, db.UpdateStreamReconnectingParams{
		ReconnectAttempts: sql.NullInt32{Int32: int32(attempts), Valid: true},
		ID:                streamID,
	})

	m.LogConnectionEvent(streamID, "reconnecting", map[string]interface{}{
		"attempt": attempts,
	})

	time.Sleep(30 * time.Second)

	currentSession, exists := m.GetSession(streamID)

	if !exists || currentSession.Status != "live" {
		if attempts >= 3 {
			log.Printf("❌ Stream %s failed after %d reconnection attempts", streamID, attempts)
			m.queries.UpdateStreamStatusWithEndTime(ctx, db.UpdateStreamStatusWithEndTimeParams{
				Status:  sql.NullString{String: "failed", Valid: true},
				EndTime: sql.NullTime{Time: time.Now(), Valid: true},
				ID:      streamID,
			})
			m.LogConnectionEvent(streamID, "failed_max_retries", map[string]interface{}{
				"attempts": attempts,
			})
			m.StopStream(streamID)
		}
	} else {
		log.Printf("✅ Stream %s reconnected successfully", streamID)
		m.mu.Lock()
		session.IsRecovering = false
		m.mu.Unlock()

		m.queries.UpdateStreamStatus(ctx, db.UpdateStreamStatusParams{
			Status: sql.NullString{String: "live", Valid: true},
			ID:     streamID,
		})
		m.LogConnectionEvent(streamID, "reconnected", nil)
	}
}