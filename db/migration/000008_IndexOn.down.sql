-- -- Drop indexes in reverse order of creation

-- DROP INDEX IF EXISTS idx_videos_chan_vis;
-- DROP INDEX IF EXISTS idx_video_vis_cat;
-- DROP INDEX IF EXISTS idx_video_cat;
-- DROP INDEX IF EXISTS idx_videos_visibility;

-- Drop indexes
DROP INDEX IF EXISTS idx_sub_categories_name_tsvector;
DROP INDEX IF EXISTS idx_categories_name_tsvector;
DROP INDEX IF EXISTS idx_tag_tag_tsvector;
DROP INDEX IF EXISTS idx_channels_name_tsvector;
DROP INDEX IF EXISTS idx_videos_title_tsvector;
DROP INDEX IF EXISTS idx_videos_visibility;

-- Drop generated columns
ALTER TABLE videos DROP COLUMN IF EXISTS title_tsvector;
ALTER TABLE channels DROP COLUMN IF EXISTS name_tsvector;
ALTER TABLE tag DROP COLUMN IF EXISTS tag_tsvector;
ALTER TABLE categories DROP COLUMN IF EXISTS name_tsvector;
ALTER TABLE sub_categories DROP COLUMN IF EXISTS name_tsvector;