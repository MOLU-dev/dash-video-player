-- name: AutocompleteSuggestions :many
SELECT DISTINCT suggestion
FROM (
  -- From video titles
  SELECT DISTINCT title AS suggestion
  FROM videos
  WHERE title ILIKE sqlc.arg('prefix') || '%'

  UNION

  -- From tags
  SELECT DISTINCT t.tag AS suggestion
  FROM videotag vt
  JOIN tag t ON vt.tag_id = t.id
  WHERE t.tag ILIKE sqlc.arg('prefix') || '%'

  UNION

  -- From popular searches
  SELECT query AS suggestion
  FROM search_suggestions
  WHERE query ILIKE sqlc.arg('prefix') || '%'
  ORDER BY count DESC
) combined
ORDER BY suggestion
LIMIT  sqlc.arg('limit');



-- name: SearchVideos :many
WITH q AS (
  SELECT
    to_tsquery('english', regexp_replace(sqlc.arg('query'), '[^\w]+', '', 'g') || ':*') AS tsq,
    '%' || sqlc.arg('query') || '%' AS ilike
),
ranked AS (
  SELECT
    v.id,
    ts_headline('english', v.title, q.tsq) AS title_hi,
    v.title,
    v.views,
    v.duration,
    v.uploaded_at,
    c.id AS channel_id,
    c.name AS channel_name,
    -- Fixed: Cast relevance to INTEGER
    CAST((
      ts_rank(v.title_tsvector, q.tsq) * 10 +
      ts_rank(c.name_tsvector, q.tsq) * 5 +
      COALESCE((
        SELECT MAX(ts_rank(t2.tag_tsvector, q.tsq))
        FROM videotag vt2
        JOIN tag t2 ON t2.id = vt2.tag_id
        WHERE vt2.video_id = v.id
      ), 0) * 3
    ) AS INTEGER) AS relevance,
    array_remove(array_agg(DISTINCT t.tag), NULL) AS tags,
    sqlc.arg('seed')::double precision AS seed
  FROM videos v
  JOIN channels c       ON c.id = v.channel_id
  LEFT JOIN videotag vt ON vt.video_id = v.id
  LEFT JOIN tag t       ON t.id = vt.tag_id
  CROSS JOIN q
  WHERE v.visibility = 'public'
    AND (
      v.title_tsvector @@ q.tsq OR
      c.name_tsvector @@ q.tsq OR
      t.tag_tsvector @@ q.tsq OR
      v.title ILIKE q.ilike OR
      c.name ILIKE q.ilike OR
      t.tag ILIKE q.ilike
    )
    AND CASE
      WHEN sqlc.arg('duration') = 'short'  THEN v.duration < INTERVAL '240 seconds'
      WHEN sqlc.arg('duration') = 'medium' THEN v.duration BETWEEN INTERVAL '240 seconds' AND INTERVAL '1200 seconds'
      WHEN sqlc.arg('duration') = 'long'   THEN v.duration > INTERVAL '1200 seconds'
      ELSE TRUE
    END
    AND CASE
      WHEN sqlc.arg('upload_date') = 'last_hour' THEN v.uploaded_at > NOW() - INTERVAL '1 hour'
      WHEN sqlc.arg('upload_date') = 'today'     THEN v.uploaded_at > CURRENT_DATE
      WHEN sqlc.arg('upload_date') = 'this_week' THEN v.uploaded_at > CURRENT_DATE - INTERVAL '7 days'
      WHEN sqlc.arg('upload_date') = 'this_month' THEN v.uploaded_at > CURRENT_DATE - INTERVAL '30 days'
      WHEN sqlc.arg('upload_date') = 'this_year'  THEN v.uploaded_at > CURRENT_DATE - INTERVAL '365 days'
      ELSE TRUE
    END
  GROUP BY v.id, c.id, q.tsq
)
SELECT
  id,
  title,
  title_hi,
  views,
  duration,
  uploaded_at,
  channel_id,
  channel_name,
  relevance,
  tags,
  seed
FROM ranked
ORDER BY
  CASE WHEN sqlc.arg('sort_by') = 'relevance'  THEN relevance   END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'newest'     THEN uploaded_at END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'view_count' THEN views       END DESC,
  CASE WHEN seed IS NOT NULL THEN
    (('x' || substr(md5(id || seed::text),1,16))::bit(64)::bigint)
  END DESC
LIMIT  sqlc.arg('limit')
OFFSET sqlc.arg('offset');