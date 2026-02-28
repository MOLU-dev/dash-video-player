-- db/queries/categories.sql

-- name: CreateCategory :one
INSERT INTO categories (id, name)
VALUES ($1, $2)
RETURNING *;


-- name: UpdateCategory :one
UPDATE categories
SET name = $2
WHERE id = $1
RETURNING *;

-- name: GetCategory :one
SELECT *
FROM categories
WHERE id = $1;

-- name: GetCategoryByName :one
SELECT *
FROM categories
WHERE name = $1;

-- name: ListCategories :many
SELECT id, name
FROM categories
ORDER BY name;

-- name: DeleteCategory :exec
DELETE FROM categories
WHERE id = $1;


-- db/queries/subcategories.sql

-- name: CreateSubcategory :one
INSERT INTO sub_categories (id, category_id, name)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateSubcategory :one
UPDATE sub_categories
SET name = $2
WHERE id = $1
RETURNING *;

-- name: GetSubcategory :one
SELECT *
FROM sub_categories
WHERE id = $1;


-- name: GetSubcategoryByName :one
SELECT *
FROM sub_categories
WHERE name = $1;

-- name: ListSubcategoriesByCategory :many
SELECT *
FROM sub_categories
WHERE category_id = $1
ORDER BY name;

-- name: DeleteSubcategory :exec
DELETE FROM sub_categories
WHERE id = $1;

---video categories and subcategories

-- name: CreateVideoCategory :one
INSERT INTO video_categories (
   video_id, category_id, sub_category_id
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetVideoCategoryByVideoID :one
SELECT * FROM video_categories
WHERE video_id = $1;

-- name: UpdateVideoCategory :one
UPDATE video_categories
SET category_id = $2,
    sub_category_id = $3
WHERE video_id = $1
RETURNING *;

-- name: DeleteVideoCategory :exec
DELETE FROM video_categories
WHERE video_id = $1;

