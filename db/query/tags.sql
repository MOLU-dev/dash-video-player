-- Insert a new tag for a video
-- name: CreateVideoTag :one
INSERT INTO "videotag" ("video_id", "tag_id")
VALUES ($1, $2)
RETURNING *;

-- Insert create a new tag
-- name: CreateTag :one
INSERT INTO "tag" ("id", "tag")
VALUES ($1, $2)
RETURNING *;


-- Get all tags for a video by video ID
-- name: GetTagsByVideoID :many
SELECT * FROM "videotag"
WHERE "video_id" = $1;


-- Delete a video tag by ID
-- name: DeleteVideoTags :exec
DELETE FROM "videotag"
WHERE "video_id" = $1;

-- name: GetTagsByName :many
SELECT * FROM tag WHERE name = ANY($1::text[]);

-- name: AddVideoTag :exec
INSERT INTO videotag (video_id, tag_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;
-- Get a video tag by ID

-- name: GetTagIdsForVideo :many
SELECT tag_id FROM videotag WHERE video_id = $1;

-- name: GetVideoTagNames :many
SELECT t.tag
FROM tag   AS t
JOIN videotag AS vt ON vt.tag_id = t.id
WHERE vt.video_id = $1;
