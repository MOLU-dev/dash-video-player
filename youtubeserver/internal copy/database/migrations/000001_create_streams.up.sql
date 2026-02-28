-- schema.sql
CREATE TABLE IF NOT EXISTS streams (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    stream_key VARCHAR(255) UNIQUE,
    status VARCHAR(50),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    viewer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_heartbeat TIMESTAMP,
    connection_quality VARCHAR(20) DEFAULT 'good',
    packet_loss_percent DECIMAL(5,2) DEFAULT 0,
    current_bitrate BIGINT,
    reconnect_attempts INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stream_analytics (
    id SERIAL PRIMARY KEY,
    stream_id VARCHAR(36) REFERENCES streams(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    viewer_count INTEGER,
    bitrate BIGINT,
    fps INTEGER
);

CREATE TABLE IF NOT EXISTS connection_logs (
    id SERIAL PRIMARY KEY,
    stream_id VARCHAR(36) REFERENCES streams(id),
    event_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    details JSONB
);