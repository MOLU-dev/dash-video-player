-- 20250610_add_trgm_indexes.sql

-- Enable pg_trgm extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy matching for video titles
CREATE INDEX IF NOT EXISTS trgm_idx_videos_title ON videos USING gin (title gin_trgm_ops);

-- Fuzzy matching for channel names
CREATE INDEX IF NOT EXISTS trgm_idx_channels_name ON channels USING gin (name gin_trgm_ops);

-- Fuzzy matching for tags
CREATE INDEX IF NOT EXISTS trgm_idx_tag_tag ON tag USING gin (tag gin_trgm_ops);
