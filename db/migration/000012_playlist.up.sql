
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (LENGTH(title) <= 150),
    description TEXT CHECK (LENGTH(description) <= 5000),
    visibility visibility NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    video_count INT NOT NULL DEFAULT 0
);

CREATE TABLE playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (playlist_id, video_id)
);

CREATE INDEX idx_playlist_items_order ON playlist_items (playlist_id, position);