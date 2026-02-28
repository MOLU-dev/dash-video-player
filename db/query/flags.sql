-- Insert a new flag
-- name: CreateFlag :one
INSERT INTO flags (
  id,
  video_id,
  user_id,
  from_duration,
  to_duration,
  reason,
  created_at,
  resolved,
  resolved_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), false, NULL
) RETURNING *;

-- Get a flag by ID
-- name: GetFlagByID :one
SELECT * FROM flags
WHERE id = $1;

-- Get all flags by video ID
-- name: GetFlagsByVideoID :many
SELECT * FROM flags
WHERE video_id = $1;

-- Get all flags by user ID
-- name: GetFlagsByUserID :many
SELECT * FROM flags
WHERE user_id = $1;

-- Get all unresolved flags
-- name: GetUnresolvedFlags :many
SELECT * FROM flags
WHERE resolved = false;

-- Resolve a flag by ID
-- name: ResolveFlag :exec
UPDATE flags
SET resolved = true, resolved_at = NOW()
WHERE id = $1;

-- Delete a flag by ID
-- name: DeleteFlag :exec
DELETE FROM flags
WHERE id = $1;
