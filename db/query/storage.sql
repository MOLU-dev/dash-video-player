-- Video Storage Queries
-- name: CreateVideoStorage :one
INSERT INTO video_storage (
  id, video_id, file_name, file_size, storage_path, manifest_path
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetVideoStorage :one
SELECT
  id,
  video_id,
  file_name,
  file_size,
  storage_path,
  manifest_path
FROM video_storage
WHERE video_id = $1;

-- name: UpdateVideoStorage :one
UPDATE video_storage SET
  file_name = $2,
  file_size = $3,
  storage_path = $4,
  manifest_path = $5,
  updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateVideoStorageManifest :one
UPDATE video_storage SET
  manifest_path = $2,
  updated_at = now()
WHERE id = $1
RETURNING *;


-- name: DeleteVideoStorage :exec
DELETE FROM video_storage 
WHERE video_id = $1;
