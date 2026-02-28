-- DROP INDEX IF EXISTS idx_videos_search_vector;

-- DROP TRIGGER IF EXISTS tsvectorupdate ON videos;

-- DROP FUNCTION IF EXISTS videos_search_vector_trigger();

-- ALTER TABLE videos DROP COLUMN IF EXISTS search_vector;


BEGIN;

-- 1. Drop the full-text index
DROP INDEX IF EXISTS idx_videos_search_vector;

-- 2. Drop the search_vector column
ALTER TABLE videos
  DROP COLUMN IF EXISTS search_vector;

-- 3. Drop the trigger & trigger function on videos
DROP TRIGGER IF EXISTS tsvectorupdate ON videos;
DROP FUNCTION IF EXISTS videos_search_vector_trigger();

-- 4. Drop the tag-update trigger & function
DROP TRIGGER IF EXISTS trg_tag_update ON tag;
DROP FUNCTION IF EXISTS update_video_vector_on_tag_change();

-- 5. Drop the videotag-insert/delete triggers & function
DROP TRIGGER IF EXISTS trg_videotag_insert ON videotag;
DROP TRIGGER IF EXISTS trg_videotag_delete ON videotag;
DROP FUNCTION IF EXISTS update_video_vector_on_videotag_change();

-- 6. Drop the channel-update trigger & function
DROP TRIGGER IF EXISTS trg_channel_update ON channels;
DROP FUNCTION IF EXISTS update_video_vector_on_channel_change();

COMMIT;
