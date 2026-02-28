package stream

import (
	"database/sql"
	"log"
	"sync"

	_ "github.com/lib/pq"
	"github.com/molu/youtube/server/internal/db"
	"github.com/molu/youtube/server/internal/models"
	"github.com/molu/youtube/server/internal/redis"
)

type Manager struct {
	queries *db.Queries
	dbConn  *sql.DB
	redis   *redis.Client
	streams map[string]*models.StreamSession
	mu      sync.RWMutex
}

func NewManager(dbConn string, redisClient *redis.Client) (*Manager, error) {
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

	return &Manager{
		queries: queries,
		dbConn:  dbConnection,
		redis:   redisClient,
		streams: make(map[string]*models.StreamSession),
	}, nil
}

func (m *Manager) GetSession(streamID string) (*models.StreamSession, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	session, exists := m.streams[streamID]
	return session, exists
}

func (m *Manager) SetSession(streamID string, session *models.StreamSession) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.streams[streamID] = session

	// Also persist to Redis (this will now work with the fixed serialization)
	if err := m.redis.SetStreamSession(streamID, session); err != nil {
		log.Printf("❌ Failed to save session to Redis: %v", err)
	} else {
		log.Printf("💾 Session saved to Redis for stream: %s", streamID)
	}
}

func (m *Manager) DeleteSession(streamID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.streams, streamID)

	// Also delete from Redis
	if err := m.redis.DeleteStreamSession(streamID); err != nil {
		log.Printf("❌ Failed to delete session from Redis: %v", err)
	}
}

func (m *Manager) GetSessionFromRedis(streamID string) (*models.StreamSession, error) {
	return m.redis.GetStreamSession(streamID)
}

func (m *Manager) SetStreamKeyMapping(streamKey, streamID string) error {
	return m.redis.SetStreamKeyMapping(streamKey, streamID)
}

func (m *Manager) GetStreamIDByKey(streamKey string) (string, error) {
	return m.redis.GetStreamIDByKey(streamKey)
}

func (m *Manager) SetStreamHeartbeat(streamID string) error {
	return m.redis.SetStreamHeartbeat(streamID)
}

func (m *Manager) GetActiveStreams() ([]string, error) {
	return m.redis.GetActiveStreams()
}

func (m *Manager) GetQueries() *db.Queries {
	return m.queries
}

func (m *Manager) Close() error {
	if err := m.dbConn.Close(); err != nil {
		return err
	}
	return m.redis.Close()
}