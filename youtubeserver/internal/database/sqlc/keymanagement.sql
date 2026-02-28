-- Stream key management
-- name: CreateStreamKey :one
INSERT INTO stream_keys (
    id, stream_id, key_hash, is_active, created_at, last_used, 
    usage_count, max_usage, valid_until, description
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetStreamKeyByHash :one
SELECT * FROM stream_keys WHERE key_hash = $1 AND is_active = true;

-- name: GetActiveStreamKeys :many
SELECT * FROM stream_keys WHERE stream_id = $1 AND is_active = true;

-- name: InvalidateStreamKey :exec
UPDATE stream_keys SET is_active = false WHERE id = $1;

-- name: InvalidateAllStreamKeys :exec
UPDATE stream_keys SET is_active = false WHERE stream_id = $1;

-- name: UpdateStreamKeyUsage :exec
UPDATE stream_keys 
SET last_used = $1, usage_count = usage_count + 1 
WHERE id = $2;

-- name: GetStreamByKeyHash :one
SELECT s.* FROM streams s
JOIN stream_keys sk ON s.id = sk.stream_id
WHERE sk.key_hash = $1 AND sk.is_active = true;

-- name: CleanupExpiredStreamKeys :exec
DELETE FROM stream_keys WHERE valid_until < NOW();