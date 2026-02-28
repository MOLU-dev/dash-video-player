-- Insert a new sub-category
-- name: CreateSubCategory :one
INSERT INTO "sub_categories" ("id", "category_id", "name")
VALUES ($1, $2, $3)
RETURNING *;

-- Get all sub-categories by category ID
-- name: GetSubCategoriesByCategoryID :many
SELECT * FROM "sub_categories"
WHERE "category_id" = $1;

-- Get a sub-category by ID
-- name: GetSubCategoryByID :one
SELECT * FROM "sub_categories"
WHERE "id" = $1;

-- Update a sub-category's details
-- name: UpdateSubCategory :one
UPDATE "sub_categories"
SET "name" = $2
WHERE "id" = $1
RETURNING *;

-- Delete a sub-category by ID
-- name: DeleteSubCategory :exec
DELETE FROM "sub_categories"
WHERE "id" = $1;
