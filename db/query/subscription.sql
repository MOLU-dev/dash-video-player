-- Subscribe to a channel
-- name: SubscribeToChannel :one
INSERT INTO "channel_subscriptions" ("id", "channel_id", "user_id", "subscribed_at", "spam")
VALUES ($1, $2, $3, NOW(), false)
RETURNING *;

-- Unsubscribe from a channel
-- name: UnsubscribeFromChannel :exec
DELETE FROM "channel_subscriptions"
WHERE "id" = $1;

-- Get all subscriptions for a user
-- name: DeleteSubscription :exec
DELETE FROM "channel_subscriptions"
WHERE user_id = $1 AND channel_id = $2;

-- Get all subscribers for a channel
-- name: GetSubscribersByChannelID :many
SELECT * FROM "channel_subscriptions"
WHERE "channel_id" = $1;

-- Check if a user is subscribed to a channel
-- name: IsSubscribed :one
SELECT EXISTS(
  SELECT 1 FROM "channel_subscriptions"
  WHERE user_id = $1 AND channel_id = $2
);
-- Mark a subscription as spam
-- name: MarkAsSpam :one
UPDATE "channel_subscriptions"
SET "spam" = true
WHERE "id" = $1
RETURNING *;

-- Unmark a subscription as spam
-- name: UnmarkAsSpam :one
UPDATE "channel_subscriptions"
SET "spam" = false
WHERE "id" = $1
RETURNING *;


-- name: GetChannelSubscriberCount :one
SELECT COUNT(*) FROM "channel_subscriptions"
WHERE channel_id = $1;

