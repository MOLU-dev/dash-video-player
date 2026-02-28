-- CREATE TYPE "video_status" AS ENUM (
--   'failed',
--   'uploading',
--   'processing',
--   'violation',
--   'copyright_infringement'
-- );

-- CREATE TYPE "visibility" AS ENUM (
--   'public',
--   'unlisted',
--   'private'
-- );

-- CREATE TABLE "users" (
--   "id" varchar PRIMARY KEY,
--   "username" varchar(50) UNIQUE NOT NULL,
--   "full_name" varchar(255) NOT NULL,
--   "email" varchar(255) UNIQUE NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "channels" (
--   "id" varchar(11) PRIMARY KEY,
--   "user_id" varchar NOT NULL,
--   "name" varchar(255) NOT NULL,
--   "description" text,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()',
--   "updated_at" timestamptz NOT NULL DEFAULT 'now()',
--   "banner_picture_path" varchar(255),
--   "profile_picture_path" varchar(255)
-- );

-- CREATE TABLE "channel_subscriptions" (
--   "id" uuid PRIMARY KEY,
--   "channel_id" varchar(11) NOT NULL,
--   "user_id" varchar NOT NULL,
--   "subscribed_at" timestamptz NOT NULL DEFAULT 'now()',
--   "spam" boolean NOT NULL DEFAULT false
-- );

-- CREATE TABLE "videos" (
--   "id" varchar(11) PRIMARY KEY,
--   "total_segment" integer NOT NULL,
--   "received_s" integer NOT NULL DEFAULT 0,
--   "title" varchar(255) NOT NULL,
--   "status" video_status DEFAULT 'uploading',
--   "visibility" visibility NOT NULL DEFAULT 'public',
--   "description" text,
--   "uploaded_at" timestamptz NOT NULL DEFAULT 'now()',
--   "duration" interval,
--   "views" bigint NOT NULL DEFAULT 0,
--   "likes" bigint NOT NULL DEFAULT 0,
--   "dislikes" bigint NOT NULL DEFAULT 0,
--   "channel_id" varchar(11) NOT NULL
-- );

-- CREATE TABLE "video_fingerprints" (
--   "id" uuid PRIMARY KEY,
--   "video_id" varchar NOT NULL,
--   "fingerprint" varchar(255) UNIQUE NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "video_storage" (
--   "id" uuid PRIMARY KEY,
--   "video_id" varchar NOT NULL,
--   "file_name" varchar(255) NOT NULL,
--   "file_size" bigint,
--   "storage_path" varchar(255) NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()',
--   "updated_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "video_metadata" (
--   "id" uuid PRIMARY KEY,
--   "video_id" varchar NOT NULL,
--   "thumbnail_path" varchar(255),
--   "gif_path" varchar(255)
-- );

-- CREATE TABLE "comments" (
--   "id" uuid PRIMARY KEY,
--   "video_id" varchar NOT NULL,
--   "user_id" varchar NOT NULL,
--   "comment_text" text NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "comment_replies" (
--   "id" uuid PRIMARY KEY,
--   "comment_id" uuid NOT NULL,
--   "reply_text" text NOT NULL,
--   "user_id" varchar NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "tag" (
--   "id" uuid PRIMARY KEY,
--   "tag" varchar(50) NOT NULL
-- );

-- CREATE TABLE "videotag" (
--   "video_id" varchar(11) NOT NULL,
--   "tag_id" uuid NOT NULL,
--   PRIMARY KEY ("video_id", "tag_id")
-- );

-- CREATE TABLE "categories" (
--   "id" uuid PRIMARY KEY,
--   "name" varchar(50) UNIQUE NOT NULL
-- );

-- CREATE TABLE "video_categories" (
--   "video_id" varchar NOT NULL,
--   "category_id" uuid NOT NULL,
--   "sub_category_id" uuid NOT NULL
-- );

-- CREATE TABLE "watch_history" (
--   "id" uuid PRIMARY KEY,
--   "user_id" varchar,
--   "session_id" uuid NOT NULL,
--   "video_id" varchar NOT NULL,
--   "watched_at" timestamptz NOT NULL DEFAULT 'now()',
--   "duration" integer
-- );

-- CREATE TABLE "search_history" (
--   "id" uuid PRIMARY KEY,
--   "user_id" varchar NOT NULL,
--   "search_query" varchar(255) NOT NULL,
--   "searched_at" timestamptz NOT NULL DEFAULT 'now()'
-- );

-- CREATE TABLE "flags" (
--   "id" uuid PRIMARY KEY,
--   "video_id" varchar,
--   "user_id" varchar,
--   "from_duration" integer,
--   "to_duration" integer,
--   "reason" text NOT NULL,
--   "created_at" timestamptz NOT NULL DEFAULT 'now()',
--   "resolved" boolean NOT NULL DEFAULT false,
--   "resolved_at" timestamptz
-- );

-- CREATE TABLE "sub_categories" (
--   "id" uuid PRIMARY KEY,
--   "category_id" uuid NOT NULL,
--   "name" varchar(50) UNIQUE NOT NULL
-- );

-- CREATE TABLE "sessions" (
--   "id" uuid PRIMARY KEY,
--   "user_id" varchar,
--   "refresh_token" varchar NOT NULL,
--   "user_agent" varchar NOT NULL,
--   "client_ip" varchar NOT NULL,
--   "is_blocked" boolean DEFAULT false,
--   "expires_at" timestamptz NOT NULL,
--   "created_at" timestamptz DEFAULT 'now()'
-- );

-- CREATE INDEX ON "channels" ("name");

-- CREATE UNIQUE INDEX ON "channel_subscriptions" ("channel_id", "user_id");

-- CREATE INDEX ON "videos" ("title");

-- CREATE INDEX ON "videos" ("channel_id");

-- CREATE INDEX ON "video_fingerprints" ("video_id");

-- CREATE INDEX ON "video_fingerprints" ("fingerprint");

-- CREATE UNIQUE INDEX ON "video_storage" ("video_id");

-- CREATE INDEX ON "tag" ("tag");

-- CREATE INDEX ON "categories" ("name");

-- CREATE INDEX ON "watch_history" ("user_id");

-- CREATE INDEX ON "watch_history" ("session_id");

-- CREATE INDEX ON "watch_history" ("video_id");

-- CREATE INDEX ON "watch_history" ("watched_at");

-- CREATE INDEX ON "search_history" ("user_id");

-- CREATE INDEX ON "search_history" ("searched_at");

-- CREATE INDEX ON "flags" ("video_id");

-- CREATE INDEX ON "flags" ("user_id");

-- CREATE INDEX ON "flags" ("created_at");

-- CREATE INDEX ON "sub_categories" ("category_id");

-- CREATE INDEX ON "sub_categories" ("name");

-- CREATE INDEX "idx_sessions_userid" ON "sessions" ("user_id");

-- CREATE INDEX "idx_sessions_expiry" ON "sessions" ("expires_at");

-- CREATE INDEX "idx_sessions_created" ON "sessions" ("created_at");

-- ALTER TABLE "videotag" ADD FOREIGN KEY ("tag_id") REFERENCES "tag" ("id");

-- ALTER TABLE "videotag" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "channels" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "channel_subscriptions" ADD FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE;

-- ALTER TABLE "channel_subscriptions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "videos" ADD FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_fingerprints" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_storage" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_metadata" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "comments" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "comments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "comment_replies" ADD FOREIGN KEY ("comment_id") REFERENCES "comments" ("id") ON DELETE CASCADE;

-- ALTER TABLE "comment_replies" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_categories" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE;

-- ALTER TABLE "watch_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "watch_history" ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE;

-- ALTER TABLE "watch_history" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "search_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "flags" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

-- ALTER TABLE "flags" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "sub_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE;

-- ALTER TABLE "sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ALTER TABLE "video_categories" ADD FOREIGN KEY ("sub_category_id") REFERENCES "sub_categories" ("id") ON DELETE CASCADE;


CREATE TYPE "video_status" AS ENUM (
  'failed',
  'uploading',
  'processing',
  'violation',
  'copyright_infringement',
  'processed'
);

CREATE TYPE "visibility" AS ENUM (
  'public',
  'unlisted',
  'private'
);

CREATE TABLE "users" (
  "id" varchar PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT 'now()'
);

CREATE TABLE "channels" (
  "id" varchar(11) PRIMARY KEY,
  "user_id" varchar NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT 'now()',
  "updated_at" timestamptz NOT NULL DEFAULT 'now()',
  "banner_picture_path" varchar(255),
  "profile_picture_path" varchar(255)
);

CREATE TABLE "channel_subscriptions" (
  "id" uuid PRIMARY KEY,
  "channel_id" varchar(11) NOT NULL,
  "user_id" varchar NOT NULL,
  "subscribed_at" timestamptz NOT NULL DEFAULT 'now()',
  "spam" boolean NOT NULL DEFAULT false
);

CREATE TABLE "videos" (
  "id" varchar(11) PRIMARY KEY,
  "total_segment" integer NOT NULL,
  "received_s" integer NOT NULL DEFAULT 0,
  "title" varchar(255) NOT NULL,
  "status" video_status DEFAULT 'uploading',
  "visibility" visibility NOT NULL DEFAULT 'public',
  "description" text,
  "uploaded_at" timestamptz NOT NULL DEFAULT 'now()',
  "duration" interval,
  "views" bigint NOT NULL DEFAULT 0,
  "likes" bigint NOT NULL DEFAULT 0,
  "dislikes" bigint NOT NULL DEFAULT 0,
  "channel_id" varchar(11) NOT NULL
);

CREATE TABLE "video_fingerprints" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar NOT NULL,
  "fingerprint" varchar(255) UNIQUE NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT 'now()'
);

CREATE TABLE "video_storage" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_size" bigint,
  "storage_path" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT 'now()',
  "updated_at" timestamptz NOT NULL DEFAULT 'now()'
);

CREATE TABLE "video_metadata" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar NOT NULL,
  "thumbnail_path" varchar(255),
  "gif_path" varchar(255)
);

CREATE TABLE "comments" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  "username" text NOT NULL,
  "content" text NOT NULL,
  "parent_comment_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT 'now()'
);

CREATE TABLE "tag" (
  "id" uuid PRIMARY KEY,
  "tag" varchar(50) NOT NULL
);

CREATE TABLE "videotag" (
  "video_id" varchar(11) NOT NULL,
  "tag_id" uuid NOT NULL,
  PRIMARY KEY ("video_id", "tag_id")
);

CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY,
  "name" varchar(50) UNIQUE NOT NULL
);

CREATE TABLE "video_categories" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar NOT NULL,
  "category_id" uuid NOT NULL,
  "sub_category_id" uuid NOT NULL
);

CREATE TABLE "watch_history" (
  "id" uuid PRIMARY KEY,
  "user_id" varchar,
  "session_id" uuid NOT NULL,
  "video_id" varchar NOT NULL,
  "watched_at" timestamptz NOT NULL DEFAULT 'now()',
  "duration" integer
);

CREATE TABLE "search_history" (
  "id" uuid PRIMARY KEY,
  "user_id" varchar NOT NULL,
  "search_query" varchar(255) NOT NULL,
  "searched_at" timestamptz NOT NULL DEFAULT 'now()'
);

CREATE TABLE "flags" (
  "id" uuid PRIMARY KEY,
  "video_id" varchar,
  "user_id" varchar,
  "from_duration" integer,
  "to_duration" integer,
  "reason" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT 'now()',
  "resolved" boolean NOT NULL DEFAULT false,
  "resolved_at" timestamptz
);

CREATE TABLE "sub_categories" (
  "id" uuid PRIMARY KEY,
  "category_id" uuid NOT NULL,
  "name" varchar(50) UNIQUE NOT NULL
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY,
  "user_id" varchar,
  "refresh_token" varchar NOT NULL,
  "user_agent" varchar NOT NULL,
  "client_ip" varchar NOT NULL,
  "is_blocked" boolean DEFAULT false,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT 'now()'
);

CREATE INDEX ON "channels" ("name");

CREATE UNIQUE INDEX ON "channel_subscriptions" ("channel_id", "user_id");

CREATE INDEX ON "videos" ("title");

CREATE INDEX ON "videos" ("channel_id");

CREATE INDEX ON "video_fingerprints" ("video_id");

CREATE INDEX ON "video_fingerprints" ("fingerprint");

CREATE UNIQUE INDEX ON "video_storage" ("video_id");

CREATE INDEX ON "comments" ("video_id");

CREATE INDEX ON "comments" ("parent_comment_id");

CREATE INDEX ON "tag" ("tag");

CREATE INDEX ON "categories" ("name");

CREATE INDEX ON "watch_history" ("user_id");

CREATE INDEX ON "watch_history" ("session_id");

CREATE INDEX ON "watch_history" ("video_id");

CREATE INDEX ON "watch_history" ("watched_at");

CREATE INDEX ON "search_history" ("user_id");

CREATE INDEX ON "search_history" ("searched_at");

CREATE INDEX ON "flags" ("video_id");

CREATE INDEX ON "flags" ("user_id");

CREATE INDEX ON "flags" ("created_at");

CREATE INDEX ON "sub_categories" ("category_id");

CREATE INDEX ON "sub_categories" ("name");

CREATE INDEX "idx_sessions_userid" ON "sessions" ("user_id");

CREATE INDEX "idx_sessions_expiry" ON "sessions" ("expires_at");

CREATE INDEX "idx_sessions_created" ON "sessions" ("created_at");

ALTER TABLE "videotag" ADD FOREIGN KEY ("tag_id") REFERENCES "tag" ("id");

ALTER TABLE "videotag" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "channels" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "channel_subscriptions" ADD FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE;

ALTER TABLE "channel_subscriptions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "videos" ADD FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE;

ALTER TABLE "video_fingerprints" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "video_storage" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "video_metadata" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "comments" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "comments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "comments" ADD FOREIGN KEY ("parent_comment_id") REFERENCES "comments" ("id");

ALTER TABLE "video_categories" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "video_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE;

ALTER TABLE "watch_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "watch_history" ADD FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE;

ALTER TABLE "watch_history" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "search_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "flags" ADD FOREIGN KEY ("video_id") REFERENCES "videos" ("id") ON DELETE CASCADE;

ALTER TABLE "flags" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "sub_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE;

ALTER TABLE "sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "video_categories" ADD FOREIGN KEY ("sub_category_id") REFERENCES "sub_categories" ("id") ON DELETE CASCADE;
