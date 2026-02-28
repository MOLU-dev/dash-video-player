-- name: GetRecommendedFilters :many
-- ctx, limit, video_id
WITH video_info AS (
  SELECT v.channel_id
    FROM videos v
   WHERE v.id = $2
),
tag_matches AS (
  SELECT t.tag AS value,
         'TAG'::text AS type,
         (COUNT(*) * 10)::int AS score,
         t.tag AS key
    FROM videotag vt
    JOIN tag t ON t.id = vt.tag_id
   WHERE vt.video_id = $2
   GROUP BY t.tag
),
channel_matches AS (
  SELECT c.id::text AS key,
         c.name     AS value,
         'CHANNEL'::text AS type,
         10000 AS score
    FROM channels c
    JOIN video_info vi ON vi.channel_id = c.id
),
global_matches AS (
  SELECT c.name     AS value,
         'GLOBAL'::text AS type,
         1 AS score,
         c.name AS key
    FROM categories c
)
SELECT key, value, type
  FROM (
    SELECT key, value, type, score FROM channel_matches
    UNION ALL
    SELECT key, value, type, score FROM tag_matches
    UNION ALL
    SELECT key, value, type, score FROM global_matches
  ) AS all_chips
 ORDER BY score DESC
 LIMIT $1;
