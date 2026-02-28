
-- Drop the trigram indexes
DROP INDEX IF EXISTS trgm_idx_videos_title;
DROP INDEX IF EXISTS trgm_idx_channels_name;
DROP INDEX IF EXISTS trgm_idx_tag_tag;

-- Optionally drop the extension (only if not needed elsewhere)
DROP EXTENSION IF EXISTS pg_trgm;
