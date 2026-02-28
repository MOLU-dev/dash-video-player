-- name: GetStreamByKey :one
SELECT id FROM streams 
WHERE stream_key = $1 AND status = 'ready';

-- name: CreateStream :exec
INSERT INTO streams (id, title, stream_key, status) 
VALUES ($1, $2, $3, 'ready');

-- name: UpdateStreamToLive :exec
UPDATE streams 
SET status = 'live', 
    start_time = $1, 
    last_heartbeat = $1,
    reconnect_attempts = 0 
WHERE id = $2;

-- name: UpdateStreamStatus :exec
UPDATE streams SET status = $1 WHERE id = $2;

-- name: UpdateStreamStatusWithEndTime :exec
UPDATE streams 
SET status = $1, 
    end_time = $2 
WHERE id = $3;

-- name: UpdateConnectionQuality :exec
UPDATE streams SET connection_quality = $1 WHERE id = $2;

-- name: UpdateStreamReconnecting :exec
UPDATE streams 
SET status = 'reconnecting',
    reconnect_attempts = $1 
WHERE id = $2;

-- name: UpdateStreamStats :exec
UPDATE streams 
SET last_heartbeat = $1,
    connection_quality = $2,
    packet_loss_percent = $3,
    current_bitrate = $4
WHERE id = $5;

-- name: InsertStreamAnalytics :exec
INSERT INTO stream_analytics (stream_id, bitrate, fps)
VALUES ($1, $2, $3);

-- name: InsertConnectionLog :exec
INSERT INTO connection_logs (stream_id, event_type, details)
VALUES ($1, $2, $3);

-- name: GetStream :one
SELECT id, title, stream_key, status, 
       COALESCE(start_time, NOW()) as start_time, 
       viewer_count 
FROM streams 
WHERE id = $1;

-- name: ListStreams :many
SELECT id, title, status, 
       COALESCE(start_time, NOW()) as start_time, 
       viewer_count 
FROM streams 
ORDER BY created_at DESC 
LIMIT 50;

-- name: GetStreamHealth :one
SELECT status, 
       COALESCE(connection_quality, 'unknown') as connection_quality,
       COALESCE(packet_loss_percent, 0) as packet_loss_percent,
       COALESCE(current_bitrate, 0) as current_bitrate,
       COALESCE(last_heartbeat, NOW()) as last_heartbeat,
       COALESCE(reconnect_attempts, 0) as reconnect_attempts,
       COALESCE(start_time, NOW()) as start_time
FROM streams 
WHERE id = $1;

-- name: GetConnectionQuality :one
SELECT COALESCE(connection_quality, 'good') as connection_quality
FROM streams 
WHERE id = $1;

-- name: GetStaleStreams :many
SELECT id 
FROM streams 
WHERE status = 'live' 
AND last_heartbeat < NOW() - INTERVAL '60 seconds';

-- name: UpdateStreamTimeout :exec
UPDATE streams 
SET status = 'timeout', 
    end_time = NOW() 
WHERE id = $1;

-- name: UpdateStreamEnded :exec
UPDATE streams 
SET status = 'ended', 
    end_time = $1 
WHERE id = $2;