-- Insert a new watch history record
-- name: CreateWatchHistory :one
INSERT INTO "watch_history" ("user_id", "session_id", "video_id", "watched_at", "duration")
VALUES ($1, $2, $3, NOW(), $4)
RETURNING *;

-- Get all watch history records for a user
-- name: GetWatchHistoryByUserID :many
SELECT * FROM "watch_history"
WHERE "user_id" = $1
ORDER BY "watched_at" DESC;

-- Get all watch history records for a session
-- name: GetWatchHistoryBySessionID :many
SELECT * FROM "watch_history"
WHERE "session_id" = $1
ORDER BY "watched_at" DESC;

-- Get all watch history records for a specific video
-- name: GetWatchHistoryByVideoID :many
SELECT * FROM "watch_history"
WHERE "video_id" = $1
ORDER BY "watched_at" DESC;

-- Update the duration of a watch history record
-- name: UpdateWatchHistoryDuration :exec
UPDATE "watch_history"
SET "duration" = $2
WHERE "id" = $1;

-- Delete a watch history record by ID
-- name: DeleteWatchHistoryByID :exec
DELETE FROM "watch_history"
WHERE "id" = $1;


-- Insert a new search history entry
-- name: CreateSearchHistory :one
INSERT INTO "search_history" ("id", "user_id", "search_query", "searched_at")
VALUES ($1, $2, $3, NOW())
RETURNING *;

-- Get all search history entries by user ID with pagination
-- name: GetSearchHistoryByUserID :many
SELECT * FROM "search_history"
WHERE "user_id" = $1
ORDER BY "searched_at" DESC
LIMIT $2 OFFSET $3;

-- Get a specific search history entry by ID
-- name: GetSearchHistoryByID :one
SELECT * FROM "search_history"
WHERE "id" = $1;

-- Delete a search history entry by ID
-- name: DeleteSearchHistory :exec
DELETE FROM "search_history"
WHERE "id" = $1;
