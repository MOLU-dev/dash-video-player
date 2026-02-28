-- ============================
-- DOWN MIGRATION
-- ============================

-- 1. Drop indexes
DROP INDEX IF EXISTS idx_stream_keys_valid_until;
DROP INDEX IF EXISTS idx_stream_keys_is_active;
DROP INDEX IF EXISTS idx_stream_keys_stream_id;

-- 2. Drop table
DROP TABLE IF EXISTS stream_keys;
