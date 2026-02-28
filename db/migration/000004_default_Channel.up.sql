ALTER TABLE channels
  ADD COLUMN is_default boolean NOT NULL DEFAULT false;