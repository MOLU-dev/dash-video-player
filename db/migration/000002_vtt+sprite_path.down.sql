ALTER TABLE video_metadata
  DROP COLUMN IF EXISTS sprite_path,
  DROP COLUMN IF EXISTS vtt_path,
  DROP COLUMN IF EXISTS preview_path;
