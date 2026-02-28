-- name: GetChannelByVideoID :one
SELECT ch.id, ch.name
FROM videos v
JOIN channels ch ON v.channel_id = ch.id
WHERE v.id = $1;

-- name: GetPopularCategories :many
SELECT c.id, c.name
FROM video_categories vc
JOIN categories c ON vc.category_id = c.id
GROUP BY c.id, c.name
ORDER BY COUNT(*) DESC
LIMIT 10;

-- name: GetTrendingTags :many
SELECT t.id, t.tag
FROM videotag vt
JOIN tag t ON vt.tag_id = t.id
GROUP BY t.id, t.tag
ORDER BY COUNT(*) DESC
LIMIT 4;
