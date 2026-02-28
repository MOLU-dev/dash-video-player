-- Drop dependent table first (playlist_items depends on playlists)
DROP INDEX IF EXISTS idx_playlist_items_order;
DROP TABLE IF EXISTS playlist_items;

-- Then drop playlists
DROP TABLE IF EXISTS playlists;

-- Finally drop the custom ENUM type
DROP TYPE IF EXISTS visibility;
