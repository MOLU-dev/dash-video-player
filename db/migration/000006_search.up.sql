-- -- Step 1: Add the column
-- ALTER TABLE videos
--   ADD COLUMN search_vector tsvector;

-- -- Step 2: Populate existing rows with weighted tsvector
-- UPDATE videos v SET search_vector = (
--   setweight(to_tsvector('english', v.title), 'A') ||
--   setweight(
--     to_tsvector('english', (
--       SELECT string_agg(t.tag, ' ')
--       FROM videotag vt
--       JOIN tag t ON vt.tag_id = t.id
--       WHERE vt.video_id = v.id
--     )), 'B'
--   ) ||
--   setweight(
--     to_tsvector('english', (
--       SELECT name FROM channels c WHERE c.id = v.channel_id
--     )), 'C'
--   ) ||
--   setweight(to_tsvector('english', v.description), 'D')
-- );

-- -- Step 3: Trigger function to update search_vector on insert/update
-- CREATE FUNCTION videos_search_vector_trigger() RETURNS trigger AS $$
-- BEGIN
--   NEW.search_vector :=
--     setweight(to_tsvector('english', NEW.title), 'A') ||
--     setweight(
--       to_tsvector('english', (
--         SELECT string_agg(t.tag, ' ')
--         FROM videotag vt
--         JOIN tag t ON vt.tag_id = t.id
--         WHERE vt.video_id = NEW.id
--       )), 'B'
--     ) ||
--     setweight(
--       to_tsvector('english', (
--         SELECT name FROM channels WHERE id = NEW.channel_id
--       )), 'C'
--     ) ||
--     setweight(to_tsvector('english', NEW.description), 'D');
--   RETURN NEW;
-- END
-- $$ LANGUAGE plpgsql;

-- -- Step 4: Create the trigger on videos table
-- CREATE TRIGGER tsvectorupdate
--   BEFORE INSERT OR UPDATE ON videos
--   FOR EACH ROW
--   EXECUTE FUNCTION videos_search_vector_trigger();

-- -- Step 5: Create a GIN index on the search_vector column
-- CREATE INDEX idx_videos_search_vector ON videos USING GIN (search_vector);


-- Step 1: Add the column
ALTER TABLE videos
  ADD COLUMN search_vector tsvector;

-- Step 2: Populate existing rows with weighted tsvector
UPDATE videos v SET search_vector = (
  setweight(to_tsvector('english', v.title), 'A') ||
  setweight(
    to_tsvector('english', (
      SELECT string_agg(t.tag, ' ')
      FROM videotag vt
      JOIN tag t ON vt.tag_id = t.id
      WHERE vt.video_id = v.id
    )), 'B'
  ) ||
  setweight(
    to_tsvector('english', (
      SELECT name FROM channels c WHERE c.id = v.channel_id
    )), 'C'
  ) ||
  setweight(to_tsvector('english', v.description), 'D')
);

-- Step 3: Trigger function to update search_vector on INSERT/UPDATE of videos
CREATE FUNCTION videos_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', NEW.title), 'A') ||
    setweight(
      to_tsvector('english', (
        SELECT string_agg(t.tag, ' ')
        FROM videotag vt
        JOIN tag t ON vt.tag_id = t.id
        WHERE vt.video_id = NEW.id
      )), 'B'
    ) ||
    setweight(
      to_tsvector('english', (
        SELECT name FROM channels WHERE id = NEW.channel_id
      )), 'C'
    ) ||
    setweight(to_tsvector('english', NEW.description), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Step 4: Attach the trigger to videos table
CREATE TRIGGER tsvectorupdate
  BEFORE INSERT OR UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION videos_search_vector_trigger();

-- Step 5: Add a GIN index for full-text search
CREATE INDEX idx_videos_search_vector ON videos USING GIN (search_vector);

-- ============================================
-- Step 6: Trigger for tag updates
CREATE FUNCTION update_video_vector_on_tag_change()
RETURNS trigger AS $$
BEGIN
  UPDATE videos
  SET search_vector = NULL
  WHERE id IN (
    SELECT video_id FROM videotag WHERE tag_id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tag_update
AFTER UPDATE ON tag
FOR EACH ROW
WHEN (OLD.tag IS DISTINCT FROM NEW.tag)
EXECUTE FUNCTION update_video_vector_on_tag_change();

-- Step 7: Triggers for videotag insert/delete (adding/removing tags)
CREATE FUNCTION update_video_vector_on_videotag_change()
RETURNS trigger AS $$
BEGIN
  UPDATE videos
  SET search_vector = NULL
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_videotag_insert
AFTER INSERT ON videotag
FOR EACH ROW
EXECUTE FUNCTION update_video_vector_on_videotag_change();

CREATE TRIGGER trg_videotag_delete
AFTER DELETE ON videotag
FOR EACH ROW
EXECUTE FUNCTION update_video_vector_on_videotag_change();

-- Step 8: Trigger for channel name changes
CREATE FUNCTION update_video_vector_on_channel_change()
RETURNS trigger AS $$
BEGIN
  UPDATE videos
  SET search_vector = NULL
  WHERE channel_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_channel_update
AFTER UPDATE ON channels
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION update_video_vector_on_channel_change();
