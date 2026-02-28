ALTER TABLE video_metadata
  ADD COLUMN sprite_path VARCHAR(255),
  ADD COLUMN vtt_path    VARCHAR(255),
  ADD COLUMN preview_path VARCHAR(255);