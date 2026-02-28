# === 🔧 Configuration ===
CONTAINER_NAME := Moludb
DB_USER        := molu
DB_NAME        := streaming
NOW            := $(shell date +%Y%m%d_%H%M%S)
BACKUP_NAME    := backup_$(NOW).dump
CONTAINER_BACKUP_PATH := /tmp/$(BACKUP_NAME)
HOST_BACKUP_DIR       := ./db_backups
RESTORE_FILE   ?= latest.dump  # Default now matches the symlink name

# === 🛠️ Utilities ===
.PHONY: init tidy proto sqlc mock server add_migration

init:
	mkdir -p $(HOST_BACKUP_DIR)

tidy:
	go mod tidy

proto:
	rm -f pb/*.go
	protoc --proto_path=proto \
		--go_out=pb   --go_opt=paths=source_relative \
		--go-grpc_out=pb --go-grpc_opt=paths=source_relative \
		proto/*.proto

sqlc:
	sqlc generate

mock:
	mockgen -package mockdb \
		-destination db/mock/store.go \
		github.com/Grpc-gig/Youtubeclone/db/sqlc Store
	mockgen -package mockwk \
		-destination worker/mock/distributor.go \
		github.com/techschool/simplebank/worker TaskDistributor

server:
	go run main.go

add_migration:
	migrate create -ext sql -dir internal/database/migrations -seq $(name)

# === 🐘 Postgres container ===
.PHONY: postgres start stop createdb dropdb

postgres:
	docker run --name $(CONTAINER_NAME) \
	  -e POSTGRES_DB=$(DB_NAME) \
	  -e POSTGRES_USER=$(DB_USER) \
	  -e POSTGRES_PASSWORD=incorrect \
	  -v $(PWD)/pgdata:/var/lib/postgresql/data \
	  -p 5432:5432 \
	  postgres:latest

start:
	docker start $(CONTAINER_NAME)

stop:
	docker stop $(CONTAINER_NAME)

createdb:
	docker exec -it $(CONTAINER_NAME) \
		createdb --username=$(DB_USER) --owner=$(DB_USER) $(DB_NAME)

dropdb:
	docker exec -it $(CONTAINER_NAME) \
		dropdb -U $(DB_USER) $(DB_NAME)


# === 🔼🔽 Migrations ===
.PHONY: migrateup migratedown migrateup1 migratedown1

migrateup:
	migrate -path internal/database/migrations \
		-database "postgresql://$(DB_USER):incorrect@localhost:5432/$(DB_NAME)?sslmode=disable" \
		-verbose up

migratedown:
	migrate -path internal/database/migrations \
		-database "postgresql://$(DB_USER):incorrect@localhost:5432/$(DB_NAME)?sslmode=disable" \
		-verbose down

roll_up:
	migrate -path db/migration \
		-database "postgresql://$(DB_USER):incorrect@localhost:5432/$(DB_NAME)?sslmode=disable" \
		-verbose up 1

roll_back:
	migrate -path db/migration \
		-database "postgresql://$(DB_USER):incorrect@localhost:5432/$(DB_NAME)?sslmode=disable" \
		-verbose down 1

# === 💾 Backup / Restore ===
.PHONY: backup copy backup-all

backup: init
	docker exec -t $(CONTAINER_NAME) \
		pg_dump -U $(DB_USER) -F c -b -v \
		-f $(CONTAINER_BACKUP_PATH) $(DB_NAME)

copy:
	docker cp $(CONTAINER_NAME):$(CONTAINER_BACKUP_PATH) \
		$(HOST_BACKUP_DIR)/$(BACKUP_NAME)
	docker exec $(CONTAINER_NAME) rm -f $(CONTAINER_BACKUP_PATH)

backup-all: backup copy
	ln -sf $(BACKUP_NAME) $(HOST_BACKUP_DIR)/latest.dump
	@echo "✅ Backup saved to: $(HOST_BACKUP_DIR)/$(BACKUP_NAME)"

# ─────────────────────────────────────────────────────────
# Compute which file to restore (un-indented)
ifeq ($(RESTORE_FILE),latest.dump)
TARGET_BACKUP := $(strip $(HOST_BACKUP_DIR)/latest.dump)
else
TARGET_BACKUP := $(strip $(HOST_BACKUP_DIR)/$(RESTORE_FILE))
endif

# (Above, after TARGET_BACKUP assignment...)

# Resolve symlink so we always copy a real file:
REAL_BACKUP := $(strip $(shell realpath $(TARGET_BACKUP) 2>/dev/null))

.PHONY: restore
restore:
	@echo "🔍 RESTORE_FILE = $(RESTORE_FILE)"
	@echo "🔍 TARGET_BACKUP = $(TARGET_BACKUP)"
	@echo "🔍 REAL_BACKUP = $(REAL_BACKUP)"

	@if [ ! -f "$(REAL_BACKUP)" ]; then \
	  echo "❌ Backup file not found: $(REAL_BACKUP)"; \
	  exit 1; \
	fi

	@echo "♻️  Copying $(REAL_BACKUP) into container..."
	docker cp "$(REAL_BACKUP)" $(CONTAINER_NAME):/var/lib/postgresql/restore.dump

	@echo "🔍 Inside container:"
	docker exec $(CONTAINER_NAME) ls -l /var/lib/postgresql/restore.dump

	@echo "♻️  Restoring..."
	docker exec -t $(CONTAINER_NAME) \
	  pg_restore -U $(DB_USER) -d $(DB_NAME) -v -c --if-exists /var/lib/postgresql/restore.dump

	@echo "♻️  Cleaning up..."
	docker exec $(CONTAINER_NAME) rm -f /var/lib/postgresql/restore.dump

	@echo "✅ Database restored successfully!"