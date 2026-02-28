-- Create a new channel
-- name: CreateChannel :exec
INSERT INTO "channels" ("id", "user_id", "name", "description", "created_at", "updated_at", "is_default", "handle", "profile_picture_path")
VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7)
RETURNING *;



-- -- Get a channel by ID
-- -- name: GetChannelByID :one
-- SELECT * FROM "channels"
-- WHERE "id" = $1;

-- name: GetChannelByID :one
SELECT 
  id,
  name,
  -- add any other basic columns you really need here,
  -- but NOT the tsvector or extension types
  created_at,
  updated_at
FROM channels
WHERE id = $1;

-- Get all channels by user ID
-- name: GetChannelsByUserID :many
SELECT * FROM "channels"
WHERE "user_id" = $1;

-- Update a channel's details
-- name: UpdateChannel :one
UPDATE "channels"
SET "name" = $2, "description" = $3, "updated_at" = NOW(), "banner_picture_path" = $4, "profile_picture_path" = $5
WHERE "id" = $1
RETURNING *;

-- Delete a channel
-- name: DeleteChannel :exec
DELETE FROM "channels"
WHERE "id" = $1;



-- name: GetChannelByName :one
SELECT id, user_id, name, description, created_at, updated_at, is_default, handle
FROM channels
WHERE name = $1;

-- name: GetChannelById :one
SELECT id, user_id, name, profile_picture_path, description, created_at, updated_at, is_default, handle
FROM channels
WHERE id = $1;

-- name: UpdateUserDefaultChannels :exec
UPDATE channels
SET is_default = false
WHERE user_id = $1 AND is_default = true;


-- name: UpdateChannelWithMask :one
UPDATE channels
SET
  name = CASE WHEN @set_name::boolean THEN @name ELSE name END,
  description = CASE WHEN @set_description::boolean THEN @description ELSE description END,
  handle = CASE WHEN @set_handle::boolean THEN @handle ELSE handle END,
  updated_at = now()
WHERE id = @id
RETURNING *;



-- name: GetDefaultChannelByUserID :one
SELECT
  id
FROM channels
WHERE user_id   = $1
  AND is_default = true
LIMIT 1;


-- name: GetDefaultChannelNameByUserID :one
SELECT name
FROM channels
WHERE user_id = $1
  AND is_default = true
LIMIT 1;
