package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store interface with method signature
type Store interface {
	Querier
	CreateVideoTx(ctx context.Context, arg CreateVideoTxParams) (CreateVideoTxResult, error)
}

// SQLStore struct implements Store interface
type SQLStore struct {
	connPool *pgxpool.Pool
	*Queries
}

// NewStore function to create a new instance of SQLStore
func NewStore(connPool *pgxpool.Pool) Store {
	return &SQLStore{
		connPool: connPool,
		Queries:  New(connPool),
	}
}
