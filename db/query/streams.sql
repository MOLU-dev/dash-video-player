-- name: GetStreamByKey :one
SELECT id FROM streams 
WHERE stream_key = $1 AND status = 'ready';

-- name: CreateStream :exec
INSERT INTO streams (id, channel_id, title, description, stream_key, status) 
VALUES ($1, $2, $3, $4, $5, 'ready');

-- name: UpdateStreamToLive :exec
UPDATE streams 
SET status = 'live', 
    start_time = $1
WHERE id = $2;

-- name: UpdateStreamStatus :exec
UPDATE streams SET status = $1 WHERE id = $2;

-- name: UpdateStreamStatusWithEndTime :exec
UPDATE streams 
SET status = $1, 
    end_time = $2 
WHERE id = $3;

-- -- name: InsertStreamAnalytics :exec
-- INSERT INTO stream_analytics (stream_id, viewer_count, bitrate, fps)
-- VALUES ($1, $2, $3, $4);

-- -- name: InsertConnectionLog :exec
-- INSERT INTO connection_logs (stream_id, event_type, details)
-- VALUES ($1, $2, $3);

-- name: GetStream :one
SELECT id, channel_id, title, description, stream_key, status, 
       COALESCE(start_time, NOW()) as start_time, 
       viewer_count, scheduled_for
FROM streams 
WHERE id = $1;

-- name: ListStreams :many
SELECT id, channel_id, title, status, 
       COALESCE(start_time, NOW()) as start_time, 
       viewer_count, scheduled_for
FROM streams 
ORDER BY created_at DESC 
LIMIT 50;

-- name: ListStreamsByChannel :many
SELECT id, title, status, 
       COALESCE(start_time, NOW()) as start_time, 
       viewer_count, scheduled_for, description
FROM streams 
WHERE channel_id = $1
ORDER BY created_at DESC;

-- name: GetStreamHealth :one
SELECT status, 
       COALESCE(start_time, NOW()) as start_time,
       viewer_count
FROM streams 
WHERE id = $1;

-- name: GetStaleStreams :many
SELECT id 
FROM streams 
WHERE status = 'live' 
AND start_time < NOW() - INTERVAL '60 seconds';

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

-- name: UpdateStreamViewerCount :exec
UPDATE streams 
SET viewer_count = $1
WHERE id = $2;

-- name: GetActiveStreams :many
SELECT s.id, s.title, s.channel_id, s.viewer_count, 
       COALESCE(s.start_time, NOW()) as start_time,
       c.name as channel_name
FROM streams s
JOIN channels c ON s.channel_id = c.id
WHERE s.status = 'live'
ORDER BY s.viewer_count DESC;

-- name: GetScheduledStreams :many
SELECT s.id, s.title, s.channel_id, s.scheduled_for, 
       c.name as channel_name, s.description
FROM streams s
JOIN channels c ON s.channel_id = c.id
WHERE s.status = 'scheduled'
AND s.scheduled_for > NOW()
ORDER BY s.scheduled_for ASC;

-- name: UpdateScheduledStreamToLive :exec
UPDATE streams 
SET status = 'live',
    start_time = NOW()
WHERE id = $1 AND status = 'scheduled';

-- -- name: GetStreamAnalytics :many
-- SELECT timestamp, viewer_count, bitrate, fps
-- FROM stream_analytics
-- WHERE stream_id = $1
-- ORDER BY timestamp DESC
-- LIMIT 100;

-- -- name: GetRecentConnectionLogs :many
-- SELECT event_type, timestamp, details
-- FROM connection_logs
-- WHERE stream_id = $1
-- ORDER BY timestamp DESC
-- LIMIT 50;

-- name: GetStreamsByCategory :many
SELECT s.id, s.title, s.channel_id, s.status, s.viewer_count,
       COALESCE(s.start_time, NOW()) as start_time,
       c.name as channel_name
FROM streams s
JOIN channels c ON s.channel_id = c.id
JOIN stream_categories sc ON s.id = sc.stream_id
JOIN categories cat ON sc.category_id = cat.id
WHERE cat.name = $1 AND s.status = 'live'
ORDER BY s.viewer_count DESC;