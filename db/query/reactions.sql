-- name: InsertReaction :exec
INSERT INTO video_reactions (user_id, video_id, is_like)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, video_id) DO UPDATE
  SET is_like = EXCLUDED.is_like,
      reacted_at = NOW();

-- name: DeleteReaction :exec
DELETE FROM video_reactions
WHERE user_id = $1 AND video_id = $2;

-- name: GetReaction :one
SELECT is_like
FROM video_reactions
WHERE user_id = $1 AND video_id = $2;

-- name: CountReactions :one
SELECT 
  COUNT(*) FILTER (WHERE is_like)      AS like_count,
  COUNT(*) FILTER (WHERE NOT is_like)  AS dislike_count
FROM video_reactions
WHERE video_id = $1;
