-- Insert a new comment
-- name: CreateComment :one
INSERT INTO "comments" (
  "id", "video_id", "user_id", "username", "parent_comment_id", "content", "created_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, NOW()
)
RETURNING *;

-- Get all comments by video ID
-- name: GetCommentsByVideoID :many
SELECT * FROM "comments"
WHERE "video_id" = $1
ORDER BY "created_at" DESC
LIMIT $2 OFFSET $3;

-- Get a comment by ID
-- name: GetCommentByID :one
SELECT * FROM "comments"
WHERE "id" = $1;

-- Delete a comment by ID
-- name: DeleteComment :exec
DELETE FROM "comments"
WHERE "id" = $1;

-- -- name: GetTopLevelComments :many
-- SELECT *
-- FROM comments c
-- JOIN users u ON u.id = c.user_id
-- LEFT JOIN (
--   SELECT parent_comment_id, COUNT(*) AS reply_count
--   FROM comments
--   WHERE parent_comment_id IS NOT NULL
--   GROUP BY parent_comment_id
-- ) rc ON rc.parent_comment_id = c.id
-- WHERE c.video_id = $1 AND c.parent_comment_id IS NULL
-- ORDER BY c.created_at DESC
-- LIMIT $2 OFFSET $3;


-- -- name: GetReplies :many
-- SELECT
--   c.id, c.user_id, u.username, u.avatar_url,
--   c.content, c.parent_comment_id, c.video_id, c.created_at
-- FROM comments c
-- JOIN users u ON c.user_id = u.id
-- WHERE c.video_id = $1 AND c.parent_comment_id = $2
-- ORDER BY c.created_at ASC;


-- name: GetCommentWithLikesByID :one
SELECT c.id, c.video_id, c.user_id, c.username, c.content, c.parent_comment_id,
       c.created_at, u.avatar_url,
       COUNT(r.id) AS reply_count
FROM comments c
LEFT JOIN users u ON u.id = c.user_id
LEFT JOIN comments r ON r.parent_comment_id = c.id
WHERE c.id = @id
GROUP BY c.id, u.avatar_url;

  
-- name: GetTopLevelCommentsWithLikes :many
SELECT
  c.id,
  c.user_id,
  u.username,
  u.avatar_url,
  c.content,
  c.video_id,
  c.parent_comment_id,
  c.created_at,
  COALESCE(rc.reply_count, 0) AS reply_count,
  COALESCE(likes.like_count, 0) AS like_count,
  COALESCE(dislikes.dislike_count, 0) AS dislike_count,
  ul.is_like AS user_reaction
FROM comments c
JOIN users u ON u.id = c.user_id
LEFT JOIN (
  SELECT parent_comment_id, COUNT(*) AS reply_count
  FROM comments
  WHERE parent_comment_id IS NOT NULL
  GROUP BY parent_comment_id
) rc ON rc.parent_comment_id = c.id
LEFT JOIN (
  SELECT comment_id, COUNT(*) AS like_count
  FROM comment_likes
  WHERE is_like = TRUE
  GROUP BY comment_id
) likes ON likes.comment_id = c.id
LEFT JOIN (
  SELECT comment_id, COUNT(*) AS dislike_count
  FROM comment_likes
  WHERE is_like = FALSE
  GROUP BY comment_id
) dislikes ON dislikes.comment_id = c.id
LEFT JOIN comment_likes ul ON ul.comment_id = c.id AND ul.user_id = $4
WHERE c.video_id = $1 AND c.parent_comment_id IS NULL
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;


-- name: GetRepliesWithLikes :many
SELECT
  c.id,
  c.user_id,
  u.username,
  u.avatar_url,
  c.content,
  c.video_id,
  c.parent_comment_id,
  c.created_at,
  COALESCE(likes.like_count, 0) AS like_count,
  COALESCE(dislikes.dislike_count, 0) AS dislike_count,
  ul.is_like AS user_reaction
FROM comments c
JOIN users u ON u.id = c.user_id
LEFT JOIN (
  SELECT comment_id, COUNT(*) AS like_count
  FROM comment_likes
  WHERE is_like = TRUE
  GROUP BY comment_id
) likes ON likes.comment_id = c.id
LEFT JOIN (
  SELECT comment_id, COUNT(*) AS dislike_count
  FROM comment_likes
  WHERE is_like = FALSE
  GROUP BY comment_id
) dislikes ON dislikes.comment_id = c.id
LEFT JOIN comment_likes ul ON ul.comment_id = c.id AND ul.user_id = $5
WHERE c.video_id = $1 AND c.parent_comment_id = $2
ORDER BY c.created_at ASC
LIMIT $3 OFFSET $4;


-- name: UpdateCommentContent :one
UPDATE comments
SET content = $3
WHERE id = $1 AND user_id = $2
RETURNING id, video_id, user_id, username, content, parent_comment_id, created_at;


--reaction

-- name: UpsertCommentReaction :exec
INSERT INTO comment_likes (comment_id, user_id, is_like)
VALUES ($1, $2, $3)
ON CONFLICT (comment_id, user_id) DO UPDATE
SET is_like = EXCLUDED.is_like, updated_at = now();

-- name: RemoveCommentReaction :exec
DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2;

-- name: GetCommentReaction :one
SELECT is_like FROM comment_likes WHERE comment_id = $1 AND user_id = $2;

-- name: GetCommentReactionCounts :one
SELECT
  COUNT(*) FILTER (WHERE is_like = TRUE) AS like_count,
  COUNT(*) FILTER (WHERE is_like = FALSE) AS dislike_count
FROM comment_likes
WHERE comment_id = $1;
