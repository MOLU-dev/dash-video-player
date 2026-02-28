CREATE TABLE comment_likes (
  "id" SERIAL PRIMARY KEY,
  "comment_id" uuid REFERENCES comments(id) ON DELETE CASCADE,
  "user_id" varchar REFERENCES users(id) ON DELETE CASCADE,
  "is_like" BOOLEAN NOT NULL,
  UNIQUE (comment_id, user_id)
);


ALTER TABLE users
  ADD COLUMN Avatar_url varchar(255);
