-- Drop foreign keys
ALTER TABLE "stream_categories" DROP CONSTRAINT stream_categories_stream_id_fkey;
ALTER TABLE "stream_categories" DROP CONSTRAINT stream_categories_category_id_fkey;
ALTER TABLE "streams" DROP CONSTRAINT streams_channel_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS streams_channel_id_idx;
DROP INDEX IF EXISTS streams_status_idx;
DROP INDEX IF EXISTS streams_scheduled_for_idx;

-- Drop tables
DROP TABLE IF EXISTS "stream_categories";
DROP TABLE IF EXISTS "streams";
