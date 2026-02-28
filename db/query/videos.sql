

-- Get all videos by channel ID with pagination
-- name: GetVideosByChannelID :many
-- Updated GetVideos query
-- name: GetVideos :many
SELECT 
  id,
  total_segment,
  received_s,
  title,
  status,
  visibility,
  description,
  uploaded_at,
  (EXTRACT(EPOCH FROM duration) * 1000000000)::BIGINT AS duration_ns,
  views,
  likes,
  dislikes,
  channel_id
FROM videos
WHERE "channel_id" = $1
ORDER BY RANDOM() -- or ORDER BY "uploaded_at" DESC
LIMIT $2 OFFSET $3;  

-- Delete a video
-- name: DeleteVideo :exec
DELETE FROM "videos"
WHERE "id" = $1;

-- -- Updated GetVideos query
-- -- name: GetVideo :many
-- SELECT 
--   id,
--   total_segment,
--   received_s,
--   title,
--   status,
--   visibility,
--   description,
--   uploaded_at,
--   (EXTRACT(EPOCH FROM duration) * 1000000000)::BIGINT AS duration_ns,
--   views,
--   likes,
--   dislikes,
--   channel_id
-- FROM videos
-- LIMIT $1
-- OFFSET $2;

-- Similarly update GetVideosByChannelID and other queries

-- name: CreateVideo :exec
INSERT INTO videos (id, title, description, duration, channel_id, total_segment)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetVideoByID :one
SELECT id, 
  title, 
  description, 
  duration, 
  channel_id, 
  total_segment, 
  likes, 
  dislikes, 
  views, 
  uploaded_at
FROM videos
WHERE id = $1;

-- -- name: GetVideoByID :one
-- SELECT * FROM videos WHERE id = $1;

-- name: GetVideoRowByID :one
SELECT 
  id,
  total_segment,
  received_s,
  title,
  status,
  visibility,
  description,
  uploaded_at,
  (EXTRACT(EPOCH FROM duration) * 1000000000)::BIGINT AS duration_ns,
  views,
  likes,
  dislikes,
  channel_id
FROM videos
WHERE id = $1;

-- name: UpdateVideo :one
UPDATE videos
SET title = $2, description = $3, duration = $4
WHERE id = $1
RETURNING *;


-- name: UpdateVideoDuration :exec
UPDATE videos
SET duration = $2::interval
WHERE id = $1;


-- name: SetVideoStatus :exec
UPDATE videos
SET status = $2
WHERE id = $1;

-- name: EditVideoWithMask :exec
UPDATE videos
SET
  title = CASE WHEN @set_title::boolean THEN @title ELSE title END,
  visibility = CASE WHEN @set_visibility::boolean THEN @visibility ELSE visibility END,
  description = CASE WHEN @set_description::boolean THEN @description ELSE description END
WHERE id = @id;

-- -- name: GetVideosWithKeywordFilter :many
-- SELECT
--   v.id,
--   v.title,
--   v.views,
--   v.duration,
--   v.uploaded_at,
--   c.id   AS channel_id,
--   c.name AS channel_name
-- FROM (
--   SELECT v.id
--   FROM videos v
--   JOIN channels c ON c.id = v.channel_id
--   LEFT JOIN videotag vt       ON vt.video_id = v.id
--   LEFT JOIN tag t             ON t.id = vt.tag_id
--   LEFT JOIN video_categories vc ON vc.video_id = v.id
--   LEFT JOIN categories cat    ON cat.id = vc.category_id
--   LEFT JOIN sub_categories sc ON sc.id  = vc.sub_category_id
--   WHERE v.visibility = 'public'
--     AND (
--       -- no filter: empty or "All"
--       $1 = '' 
--       OR $1 = 'All'

--       -- title, channel name
--       OR LOWER(v.title)   LIKE LOWER('%' || $1 || '%')
--       OR LOWER(c.name)    LIKE LOWER('%' || $1 || '%')

--       -- tags
--       OR EXISTS (
--         SELECT 1
--         FROM videotag vt2
--         JOIN tag t2 ON t2.id = vt2.tag_id
--         WHERE vt2.video_id = v.id
--           AND LOWER(t2.tag) LIKE LOWER('%' || $1 || '%')
--       )

--       -- categories
--       OR EXISTS (
--         SELECT 1
--         FROM video_categories vc2
--         JOIN categories cat2 ON cat2.id = vc2.category_id
--         WHERE vc2.video_id = v.id
--           AND LOWER(cat2.name) LIKE LOWER('%' || $1 || '%')
--       )

--       -- sub-categories
--       OR EXISTS (
--         SELECT 1
--         FROM video_categories vc3
--         JOIN sub_categories sc2 ON sc2.id = vc3.sub_category_id
--         WHERE vc3.video_id = v.id
--           AND LOWER(sc2.name) LIKE LOWER('%' || $1 || '%')
--       )
--     )
--   ORDER BY random()
--   LIMIT $2
--   OFFSET $3
-- ) AS sub
-- JOIN videos v   ON v.id = sub.id
-- JOIN channels c ON c.id = v.channel_id;

-- -- name: GetVideosWithKeywordFilters :many
-- SELECT
--     v.id,
--     v.title,
--     v.views,
--     v.duration,
--     v.uploaded_at,
--     c.id AS channel_id,
--     c.name AS channel_name
-- FROM (
--     SELECT v.id
--     FROM videos v
--     JOIN channels c ON c.id = v.channel_id
--     WHERE v.visibility = 'public'
--       AND (
--         COALESCE(TRIM($1), '') IN ('', 'All')
--         OR LOWER(v.title) LIKE '%' || LOWER(TRIM($1)) || '%'
--         OR LOWER(c.name)  LIKE '%' || LOWER(TRIM($1)) || '%'
--         OR (
--           EXISTS (
--             SELECT 1 FROM videotag vt
--             JOIN tag t ON t.id = vt.tag_id
--             WHERE vt.video_id = v.id
--               AND LOWER(t.tag) LIKE '%' || LOWER(TRIM($1)) || '%'
--           )
--         )
--         OR (
--           EXISTS (
--             SELECT 1 FROM video_categories vc
--             JOIN categories cat ON cat.id = vc.category_id
--             WHERE vc.video_id = v.id
--               AND LOWER(cat.name) LIKE '%' || LOWER(TRIM($1)) || '%'
--           )
--         )
--         OR (
--           EXISTS (
--             SELECT 1 FROM video_categories vc
--             JOIN sub_categories sc ON sc.id = vc.sub_category_id
--             WHERE vc.video_id = v.id
--               AND LOWER(sc.name) LIKE '%' || LOWER(TRIM($1)) || '%'
--           )
--         )
--       )
--     ORDER BY random()
--     LIMIT $2 OFFSET $3
-- ) AS sub
-- JOIN videos v ON v.id = sub.id            ----How to aggregate ticks into candle in real system, and add resistance to our model
-- JOIN channels c ON c.id = v.channel_id;


-- name: GetVideosWithKeywordFilter :many
SELECT
    v.id,
    v.title,
    v.views,
    (EXTRACT(EPOCH FROM duration) * 1000000000)::BIGINT AS duration_ns,
    v.uploaded_at,
    c.id AS channel_id,
    c.name AS channel_name
FROM (
    SELECT v.id
    FROM videos v
    JOIN channels c ON c.id = v.channel_id
    WHERE v.visibility = 'public' AND v.status = 'processed'
      AND (
        COALESCE(TRIM($1), '') IN ('', 'All')
        OR v.title_tsvector @@ plainto_tsquery('english', $1)
        OR c.name_tsvector @@ plainto_tsquery('english', $1)
        OR EXISTS (
            SELECT 1 FROM videotag vt
            JOIN tag t ON t.id = vt.tag_id
            WHERE vt.video_id = v.id
            AND t.tag_tsvector @@ plainto_tsquery('english', $1)
        )
        OR EXISTS (
            SELECT 1 FROM video_categories vc
            JOIN categories cat ON cat.id = vc.category_id
            WHERE vc.video_id = v.id
            AND cat.name_tsvector @@ plainto_tsquery('english', $1)
        )
        OR EXISTS (
            SELECT 1 FROM video_categories vc
            JOIN sub_categories sc ON sc.id = vc.sub_category_id
            WHERE vc.video_id = v.id
            AND sc.name_tsvector @@ plainto_tsquery('english', $1)
        )
      )
    ORDER BY md5(v.id::text || $4)  -- Consistent seeded ordering
    LIMIT $2 OFFSET $3
) AS sub
JOIN videos v ON v.id = sub.id
JOIN channels c ON c.id = v.channel_id;

-- (EXTRACT(EPOCH FROM duration) * 1000000000)::BIGINT AS duration_ns,
--  COALESCE((EXTRACT(EPOCH FROM v.duration) * 1000000000)::BIGINT, 0) AS duration_ns,