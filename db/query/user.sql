-- Create a new user
-- name: CreateUser :exec
INSERT INTO "users" ("id", "username", "full_name", "email", "created_at","avatar_url")
VALUES ($1, $2, $3, $4, NOW(), $5)
RETURNING *;

-- Get a user by ID
-- name: GetUserByID :one
SELECT * FROM "users"
WHERE "id" = $1;

-- Get a user by username
-- name: GetUserByUsername :one
SELECT * FROM "users"
WHERE "username" = $1;

-- Get a user by email
-- name: GetUserByEmail :one
SELECT * FROM "users"
WHERE "email" = $1;

-- Update a user's details
-- name: UpdateUser :one
UPDATE "users"
SET "username" = $2, "full_name" = $3, "email" = $4
WHERE "id" = $1
RETURNING *;

-- Delete a user
-- name: DeleteUser :exec
DELETE FROM "users"
WHERE "id" = $1;

