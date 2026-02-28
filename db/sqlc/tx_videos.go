package db

import (
	"context"
	"os"
)

type CreateVideoTxParams struct {
	CreateVideoParams
	VideoFilePath string
	AfterCreate   func(Video) error
}

type CreateVideoTxResult struct {
	Video GetVideoByIDRow //Video
}

func (store *SQLStore) CreateVideoTx(ctx context.Context, arg CreateVideoTxParams) (CreateVideoTxResult, error) {
	var result CreateVideoTxResult

	// Cleanup function to delete the video file if the transaction fails
	cleanup := func() {
		if arg.VideoFilePath != "" {
			if _, err := os.Stat(arg.VideoFilePath); err == nil {
				_ = os.Remove(arg.VideoFilePath)
			}
		}
	}

	err := store.execTx(ctx, func(q *Queries) error {
		// Create the video record; q.CreateVideo returns only an error.
		if err := q.CreateVideo(ctx, arg.CreateVideoParams); err != nil {
			return err
		}

		// Retrieve the inserted video record.
		video, err := q.GetVideoByID(ctx, arg.CreateVideoParams.ID)
		if err != nil {
			return err
		}
		result.Video = video

		return nil
	})

	if err != nil {
		cleanup()
	}

	return result, err
}
