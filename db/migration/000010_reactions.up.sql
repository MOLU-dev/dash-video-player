-- +migrate Up

CREATE TABLE video_reactions (
  user_id     VARCHAR      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    VARCHAR(11)    NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  is_like     BOOLEAN   NOT NULL,
  reacted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);
