package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/molu/youtube/server/internal/models"
	"github.com/redis/go-redis/v9"
)

type Client struct {
	client *redis.Client
	ctx    context.Context
}

func NewClient(addr, password string, db int) (*Client, error) {
	log.Printf("🔧 Connecting to Redis at %s (DB: %d)", addr, db)

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx := context.Background()

	// Test connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("❌ Failed to connect to Redis: %v", err)
		return nil, err
	}

	log.Println("✅ Redis connection established")
	return &Client{
		client: rdb,
		ctx:    ctx,
	}, nil
}

func (c *Client) SetStreamSession(streamID string, session *models.StreamSession) error {
	key := fmt.Sprintf("stream:session:%s", streamID)

	// Convert to Redis-compatible session
	redisSession := session.ToRedisSession()
	sessionData, err := json.Marshal(redisSession)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %v", err)
	}

	err = c.client.Set(c.ctx, key, sessionData, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to set session in Redis: %v", err)
	}

	log.Printf("💾 Stream session saved to Redis: %s", streamID)
	return nil
}

func (c *Client) GetStreamSession(streamID string) (*models.StreamSession, error) {
	key := fmt.Sprintf("stream:session:%s", streamID)

	data, err := c.client.Get(c.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Session not found
		}
		return nil, fmt.Errorf("failed to get session from Redis: %v", err)
	}

	var redisSession models.RedisStreamSession
	if err := json.Unmarshal([]byte(data), &redisSession); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %v", err)
	}

	// Convert back to full StreamSession
	session := redisSession.ToStreamSession()
	return session, nil
}

func (c *Client) DeleteStreamSession(streamID string) error {
	key := fmt.Sprintf("stream:session:%s", streamID)

	err := c.client.Del(c.ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete session from Redis: %v", err)
	}

	log.Printf("🗑️ Stream session deleted from Redis: %s", streamID)
	return nil
}

func (c *Client) SetStreamKeyMapping(streamKey, streamID string) error {
	key := fmt.Sprintf("stream:key:%s", streamKey)
	err := c.client.Set(c.ctx, key, streamID, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to set stream key mapping: %v", err)
	}
	return nil
}

func (c *Client) GetStreamIDByKey(streamKey string) (string, error) {
	key := fmt.Sprintf("stream:key:%s", streamKey)
	streamID, err := c.client.Get(c.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return "", nil // Key not found
		}
		return "", fmt.Errorf("failed to get stream ID by key: %v", err)
	}
	return streamID, nil
}

func (c *Client) SetStreamHeartbeat(streamID string) error {
	key := fmt.Sprintf("stream:heartbeat:%s", streamID)
	err := c.client.Set(c.ctx, key, time.Now().Format(time.RFC3339), 30*time.Second).Err()
	if err != nil {
		return fmt.Errorf("failed to set stream heartbeat: %v", err)
	}
	return nil
}

func (c *Client) GetActiveStreams() ([]string, error) {
	pattern := "stream:heartbeat:*"
	keys, err := c.client.Keys(c.ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get active streams: %v", err)
	}

	var streamIDs []string
	for _, key := range keys {
		// Extract stream ID from key (stream:heartbeat:{streamID})
		if len(key) > 17 { // length of "stream:heartbeat:"
			streamID := key[17:]
			streamIDs = append(streamIDs, streamID)
		}
	}

	return streamIDs, nil
}

func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
