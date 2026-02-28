package main

import (
	"log"

	"github.com/molu/youtube/server/internal/api"
	"github.com/molu/youtube/server/internal/config"
	"github.com/molu/youtube/server/internal/redis"
	"github.com/molu/youtube/server/internal/rtmp"
	"github.com/molu/youtube/server/internal/stream"
)

func main() {
	cfg := config.Load()
	log.Printf("🚀 Starting RTMP Server with database: %s", cfg.DatabaseURL)

	// Initialize Redis client
	redisClient, err := redis.NewClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatal("❌ Failed to connect to Redis:", err)
	}
	defer redisClient.Close()

	streamManager, err := stream.NewManager(cfg.DatabaseURL, redisClient)
	if err != nil {
		log.Fatal("❌ Failed to initialize:", err)
	}
	defer streamManager.Close()

	go streamManager.StartCleanup()

	rtmpServer := rtmp.NewServer(streamManager)
	go rtmpServer.Start()

	apiServer := api.NewServer(streamManager)
	log.Fatal(apiServer.Start(cfg.HTTPPort))
}