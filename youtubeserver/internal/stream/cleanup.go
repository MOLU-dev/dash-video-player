package stream

import (
	"context"
	"log"
	"time"
)

func (m *Manager) StartCleanup() {
	ctx := context.Background()
	log.Println("🧹 Starting stale streams cleanup routine")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		staleStreams, err := m.queries.GetStaleStreams(ctx)
		if err != nil {
			log.Printf("❌ Cleanup query error: %v", err)
			continue
		}

		if len(staleStreams) > 0 {
			log.Printf("🧹 Found %d stale streams to clean up: %v", len(staleStreams), staleStreams)
		}

		for _, streamID := range staleStreams {
			log.Printf("🧹 Cleaning up stale stream: %s", streamID)
			m.queries.UpdateStreamTimeout(ctx, streamID)
			m.LogConnectionEvent(streamID, "timeout", nil)
			m.StopStream(streamID)
		}
	}
}