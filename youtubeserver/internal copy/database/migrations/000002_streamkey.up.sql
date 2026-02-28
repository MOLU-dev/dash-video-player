-- -- Add this table to your database
-- CREATE TABLE stream_keys (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
--     key_hash TEXT NOT NULL,
--     is_active BOOLEAN NOT NULL DEFAULT true,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     usage_count INTEGER NOT NULL DEFAULT 0,
--     max_usage INTEGER NOT NULL DEFAULT -1, -- -1 means unlimited
--     valid_until TIMESTAMPTZ NOT NULL,
--     description TEXT,
    
--     -- Indexes for performance
--     CONSTRAINT stream_keys_key_hash_unique UNIQUE (key_hash),
--     CONSTRAINT stream_keys_max_usage_check CHECK (max_usage = -1 OR max_usage > 0)
-- );

-- CREATE INDEX idx_stream_keys_stream_id ON stream_keys(stream_id);
-- CREATE INDEX idx_stream_keys_is_active ON stream_keys(is_active);
-- CREATE INDEX idx_stream_keys_valid_until ON stream_keys(valid_until);

CREATE TABLE stream_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id VARCHAR(36) NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usage_count INTEGER NOT NULL DEFAULT 0,
    max_usage INTEGER NOT NULL DEFAULT -1,
    valid_until TIMESTAMPTZ NOT NULL,
    description TEXT,

    CONSTRAINT stream_keys_key_hash_unique UNIQUE (key_hash),
    CONSTRAINT stream_keys_max_usage_check CHECK (max_usage = -1 OR max_usage > 0)
);

CREATE INDEX idx_stream_keys_stream_id ON stream_keys(stream_id);
CREATE INDEX idx_stream_keys_is_active ON stream_keys(is_active);
CREATE INDEX idx_stream_keys_valid_until ON stream_keys(valid_until);
