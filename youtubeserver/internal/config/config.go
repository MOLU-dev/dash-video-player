package config

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL   string
	HTTPPort      string
	RTMPPort      string
	RedisAddr     string
	RedisPassword string
	RedisDB       int
}

func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://molu:incorrect@localhost/streaming?sslmode=disable"),
		HTTPPort:      getEnv("HTTP_PORT", "8080"),
		RTMPPort:      getEnv("RTMP_PORT", "1935"),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return fallback
}
