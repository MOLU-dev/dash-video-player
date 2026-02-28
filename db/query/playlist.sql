-- name: CreatePlaylist :one
INSERT INTO playlists (
    owner_id, title, description, visibility
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPlaylist :one
SELECT * FROM playlists 
WHERE id = $1;

-- name: UpdatePlaylist :one
UPDATE playlists
SET
    title = COALESCE($2, title),
    description = COALESCE($3, description),
    visibility = COALESCE($4, visibility),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeletePlaylist :exec
DELETE FROM playlists
WHERE id = $1;

-- -- name: ListPlaylists :many
-- SELECT * FROM playlists
-- WHERE 
--     CASE WHEN $3::text != 'ALL' THEN
--         visibility = $3::visibility
--     ELSE
--         TRUE
--     END
-- ORDER BY created_at DESC
-- LIMIT $1
-- OFFSET $2;

-- name: ListPlaylists :many
SELECT * FROM playlists
WHERE 
    CASE WHEN $3::text IS NOT NULL AND $3::text != '' AND $3::text != 'ALL' THEN
        visibility = $3::visibility
    ELSE
        TRUE
    END
ORDER BY created_at DESC
LIMIT $1
OFFSET $2;


-- name: AddPlaylistItem :one
WITH max_pos AS (
    SELECT COALESCE(MAX(position), 0) AS position
    FROM playlist_items 
    WHERE playlist_id = $1
)
INSERT INTO playlist_items (
    playlist_id, video_id, position
) VALUES (
    $1, 
    $2, 
    CASE WHEN $3 > 0 THEN $3 ELSE (SELECT position + 1 FROM max_pos) END
)
RETURNING *;

-- name: RemovePlaylistItem :exec
DELETE FROM playlist_items
WHERE playlist_id = $1 AND id = $2;

-- name: MovePlaylistItem :one
WITH item AS (
    SELECT position FROM playlist_items
    WHERE id = $2 AND playlist_id = $1
)
UPDATE playlist_items pi
SET position = 
    CASE 
        WHEN pi.id = $2 THEN $3
        WHEN pi.position >= $3 AND pi.position < (SELECT position FROM item) 
            THEN pi.position + 1
        WHEN pi.position <= $3 AND pi.position > (SELECT position FROM item) 
            THEN pi.position - 1
        ELSE pi.position
    END
WHERE pi.playlist_id = $1
RETURNING pi.*;

-- name: ListPlaylistItems :many
SELECT * FROM playlist_items
WHERE playlist_id = $1
ORDER BY position
LIMIT $2 OFFSET $3;

-- name: IncrementVideoCount :exec
UPDATE playlists
SET video_count = video_count + 1
WHERE id = $1;

-- name: DecrementVideoCount :exec
UPDATE playlists
SET video_count = video_count - 1
WHERE id = $1;