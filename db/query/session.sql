-- name: CreateSession :one
INSERT INTO sessions (
  id,
  user_id,
  refresh_token,
  user_agent,
  client_ip,
  expires_at
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetSession :one
SELECT * FROM sessions
WHERE id = $1;

-- name: UpdateSessionBlocked :exec
UPDATE sessions
SET is_blocked = $2
WHERE id = $1;

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = $1;


-- name: GetSessionsByUserId :one
SELECT * FROM sessions
WHERE user_id = $1;

-- name: UpdateSession :one
UPDATE sessions
SET
    refresh_token = $2,
    expires_at    = $3
WHERE id = $1
RETURNING *;

-- name: AutocompleteVideoTitles :many
SELECT title AS suggestion
FROM videos
WHERE title ILIKE sqlc.arg('pattern')
LIMIT sqlc.arg('limit');


-- name: AutocompleteChannelNames :many
SELECT name AS suggestion
FROM channels
WHERE name ILIKE sqlc.arg('pattern')
LIMIT sqlc.arg('limit');


-- name: AutocompleteTags :many
SELECT tag AS suggestion
FROM tag
WHERE tag ILIKE sqlc.arg('pattern')
LIMIT sqlc.arg('limit');
