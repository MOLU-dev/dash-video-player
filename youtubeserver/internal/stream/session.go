package stream

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/molu/youtube/server/internal/db"
	"github.com/sqlc-dev/pqtype"
)

func (m *Manager) LogConnectionEvent(streamID, eventType string, details map[string]interface{}) {
	ctx := context.Background()
	detailsJSON, _ := json.Marshal(details)

	err := m.queries.InsertConnectionLog(ctx, db.InsertConnectionLogParams{
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

func (m *Manager) StopStream(streamID string) {
	ctx := context.Background()
	m.mu.Lock()
	defer m.mu.Unlock()

	session, exists := m.streams[streamID]
	if !exists {
		log.Printf("⚠️ Stream %s not found for stopping", streamID)
		return
	}

	log.Printf("🛑 Stopping stream %s", streamID)

	if session.CancelFunc != nil {
		session.CancelFunc()
	}

	if session.StatsCollector != nil {
		close(session.StatsCollector)
	}
	if session.HealthCheckTicker != nil {
		session.HealthCheckTicker.Stop()
	}

	err := m.queries.UpdateStreamEnded(ctx, db.UpdateStreamEndedParams{
		EndTime: sql.NullTime{Time: time.Now(), Valid: true},
		ID:      streamID,
	})

	if err != nil {
		log.Printf("❌ Failed to update stream status: %v", err)
	} else {
		log.Printf("✅ Stream %s status updated to 'ended'", streamID)
	}

	delete(m.streams, streamID)
	log.Printf("✅ Stream %s completely stopped", streamID)
}