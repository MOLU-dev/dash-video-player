
CREATE TYPE "stream_status" AS ENUM (
  'offline',
  'live',
  'ended',
  'scheduled'
);

CREATE TABLE "streams" (
  "id" varchar(11) PRIMARY KEY,
  "channel_id" varchar(11) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "stream_key" varchar(255) UNIQUE NOT NULL,
  "status" stream_status DEFAULT 'offline',
  "start_time" timestamptz,
  "end_time" timestamptz,
  "viewer_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT 'now()',
  "scheduled_for" timestamptz
);


CREATE TABLE "stream_categories" (
  "id" uuid PRIMARY KEY,
  "stream_id" varchar(11) NOT NULL,
  "category_id" uuid NOT NULL
);

CREATE TABLE "stream_metadata" (
  "id" uuid PRIMARY KEY,
  "stream_id" varchar NOT NULL,
  "thumbnail_path" varchar(255),
  "gif_path" varchar(255)
);


CREATE INDEX ON "streams" ("channel_id");

CREATE INDEX ON "streams" ("status");

CREATE INDEX ON "streams" ("scheduled_for");

CREATE UNIQUE INDEX ON "stream_categories" ("stream_id", "category_id");


ALTER TABLE "streams" ADD FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE;

ALTER TABLE "stream_categories" ADD FOREIGN KEY ("stream_id") REFERENCES "streams" ("id") ON DELETE CASCADE;

ALTER TABLE "stream_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE;

ALTER TABLE "stream_metadata" ADD FOREIGN KEY ("stream_id") REFERENCES "streams" ("id") ON DELETE CASCADE;
