-- -- Drop invalid index attempt if it exists
-- DROP INDEX IF EXISTS idx_videos_vis_cat;

-- -- Create useful indexes
-- CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);

-- -- Index on category ID (for filtering)
-- CREATE INDEX IF NOT EXISTS idx_video_cat ON video_categories(category_id);

-- -- Join-friendly index for (video_id, category_id) mapping
-- CREATE INDEX IF NOT EXISTS idx_video_vis_cat ON video_categories(video_id, category_id);

-- -- GIN index on tag association table would be unnecessary
-- -- unless you store tags as an array in videos (you don’t here)

-- -- Index for filtering by channel and visibility
-- CREATE INDEX IF NOT EXISTS idx_videos_chan_vis ON videos(channel_id, visibility);


-- Add generated columns for full-text search
ALTER TABLE videos
ADD COLUMN title_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', title)) STORED;

ALTER TABLE channels
ADD COLUMN name_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', name)) STORED;

ALTER TABLE tag
ADD COLUMN tag_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', tag)) STORED;

ALTER TABLE categories
ADD COLUMN name_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', name)) STORED;

ALTER TABLE sub_categories
ADD COLUMN name_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', name)) STORED;

-- Create indexes
CREATE INDEX  idx_videos_visibility ON videos(visibility);
CREATE INDEX  idx_videos_title_tsvector ON videos USING GIN(title_tsvector);
CREATE INDEX  idx_channels_name_tsvector ON channels USING GIN(name_tsvector);
CREATE INDEX  idx_tag_tag_tsvector ON tag USING GIN(tag_tsvector);
CREATE INDEX  idx_categories_name_tsvector ON categories USING GIN(name_tsvector);
CREATE INDEX  idx_sub_categories_name_tsvector ON sub_categories USING GIN(name_tsvector);