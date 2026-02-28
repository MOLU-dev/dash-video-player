-- File: db/query/video_metadata.sql

-- name: CreateVideoMetadata :one
INSERT INTO video_metadata (
  id,
  video_id,
  thumbnail_path,
  sprite_path,
  vtt_path, 
  preview_path
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetVideoMetadata :one
SELECT
  id,
  video_id,
  thumbnail_path,
  sprite_path,
  vtt_path,
  gif_path,
  preview_path
FROM video_metadata
WHERE video_id = $1
LIMIT 1;

-- name: UpdateVideoMetadata :one
UPDATE video_metadata
SET
  thumbnail_path = $2,
  sprite_path    = $3,
  vtt_path       = $4,
  gif_path       = $5,
  preview_path   = $6
WHERE video_id = $1
RETURNING *;

-- name: DeleteVideoMetadata :exec
DELETE FROM video_metadata
WHERE video_id = $1;
