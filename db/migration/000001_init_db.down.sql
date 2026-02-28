-- Drop foreign keys in correct order
ALTER TABLE videotag DROP CONSTRAINT IF EXISTS videotag_video_id_fkey;
ALTER TABLE videotag DROP CONSTRAINT IF EXISTS videotag_tag_id_fkey;

-- Now it's safe to drop the tables
DROP TABLE IF EXISTS 
  video_metadata,
  video_sub_categories,
  flags,
  search_history,
  watch_history,
  video_categories,
  videotag,
  tag,
  --comment_replies,
  comments,
  video_storage,
  video_fingerprints,
  videos,
  channel_subscriptions,
  sub_categories,
  categories,
  sessions,
  channels,
  users;

-- Drop enum type last
DROP TYPE IF EXISTS video_status;
DROP TYPE IF EXISTS visibility;

