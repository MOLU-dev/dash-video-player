// package gapi

// import (
// 	"context"
// 	"fmt"
// 	"io"
// 	"os"
// 	"path/filepath"
// 	"strconv"

// 	"github.com/molu/youtube/pb"
// 	"github.com/rs/zerolog/log"
// 	"google.golang.org/grpc"
// )

// // StreamSegment streams a requested init/segment file for video or audio in chunks.
// // Note: signature matches the generated pb RegisterYoutubeCloneServer expectation:
// //   StreamSegment(*pb.SegmentRequest, grpc.ServerStreamingServer[pb.SegmentChunk]) error
// func (s *Server) StreamSegment(req *pb.SegmentRequest, stream grpc.ServerStreamingServer[pb.SegmentChunk]) error {
// 	ctx := stream.Context()

// 	// quick cancellation check
// 	select {
// 	case <-ctx.Done():
// 		return ctx.Err()
// 	default:
// 	}

// 	if req.GetVideoId() == "" {
// 		return fmt.Errorf("video_id cannot be empty")
// 	}
// 	if req.GetRepresentationId() == "" {
// 		return fmt.Errorf("representation_id cannot be empty")
// 	}
// 	if req.GetMedia() == "" {
// 		return fmt.Errorf("media cannot be empty (must be \"video\" or \"audio\")")
// 	}

// 	// Optional numeric representation id check (your MPD uses "1","2",...)
// 	repIdx, err := strconv.Atoi(req.GetRepresentationId())
// 	if err != nil {
// 		return fmt.Errorf("representation_id %q is not numeric: %v", req.GetRepresentationId(), err)
// 	}
// 	if repIdx < 1 {
// 		return fmt.Errorf("representation_id must be >= 1, got %d", repIdx)
// 	}
// 	log.Printf("representation_id: %d", repIdx)

// 	// Build filename using a tagged switch (cleaner than if/else).
// 	var filename string
// 	switch media := req.GetMedia(); media {
// 	case "video":
// 		videoIndex := repIdx - 1 // MPD id=1 -> file video_0_...
// 		if req.GetInitSegment() {
// 			filename = fmt.Sprintf("video_%d_dashinit.mp4", videoIndex)
// 			log.Printf("Init segment requested for video representation %s", req.GetRepresentationId())
// 		} else {
// 			filename = fmt.Sprintf("video_%d_dash%d.m4s", videoIndex, req.GetSegmentNumber())
// 		}

// 	case "audio":
// 		if req.GetInitSegment() {
// 			filename = "audio_dashinit.mp4"
// 		} else {
// 			filename = fmt.Sprintf("audio_dash%d.m4s", req.GetSegmentNumber())
// 		}

// 	default:
// 		return fmt.Errorf("unsupported media type %q; must be \"video\" or \"audio\"", media)
// 	}

// 	fullPath := filepath.Join("converted", req.GetVideoId(), filename)

// 	// Open file and stream in chunks to avoid loading entire file into memory.
// 	f, err := os.Open(fullPath)
// 	if err != nil {
// 		return fmt.Errorf("failed to open file %q: %w", fullPath, err)
// 	}
// 	defer f.Close()

// 	const chunkSize = 64 * 1024 // 64 KiB
// 	buf := make([]byte, chunkSize)

// 	for {
// 		// honor cancellation between reads/sends
// 		select {
// 		case <-ctx.Done():
// 			return ctx.Err()
// 		default:
// 		}

// 		n, readErr := f.Read(buf)
// 		if n > 0 {
// 			// Send a chunk containing only the bytes read.
// 			if sendErr := stream.Send(&pb.SegmentChunk{Data: buf[:n]}); sendErr != nil {
// 				return fmt.Errorf("failed to send segment chunk for %q: %w", filename, sendErr)
// 			}
// 		}

// 		if readErr != nil {
// 			if readErr == io.EOF {
// 				// finished streaming successfully
// 				break
// 			}
// 			return fmt.Errorf("failed reading file %q: %w", fullPath, readErr)
// 		}
// 	}

// 	return nil
// }

// // GetManifest returns the MPD manifest bytes for a given video id.
// func (s *Server) GetManifest(ctx context.Context, req *pb.ManifestRequest) (*pb.ManifestResponse, error) {
// 	videoDir := filepath.Join("converted", req.GetVideoId())
// 	mpdPath := filepath.Join(videoDir, "manifest.mpd")

// 	data, err := os.ReadFile(mpdPath)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to read manifest %q: %w", mpdPath, err)
// 	}
// 	return &pb.ManifestResponse{MpdXml: data}, nil
// }

package gapi

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/molu/youtube/pb"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"
)

// StreamSegment streams a requested init/segment file for video or audio in chunks.
// Now supports both MP4Box (GPAC) and FFmpeg naming patterns based on the generator field.
func (s *Server) StreamSegment(req *pb.SegmentRequest, stream grpc.ServerStreamingServer[pb.SegmentChunk]) error {
	ctx := stream.Context()

	// Quick cancellation check
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	if req.GetVideoId() == "" {
		return fmt.Errorf("video_id cannot be empty")
	}
	if req.GetRepresentationId() == "" {
		return fmt.Errorf("representation_id cannot be empty")
	}
	if req.GetMedia() == "" {
		return fmt.Errorf("media cannot be empty (must be \"video\" or \"audio\")")
	}

	// Get generator from request (default to GPAC for backward compatibility)
	generator := req.GetGenerator()
	if generator == pb.Generator_GENERATOR_UNKNOWN {
		// If unknown, try to auto-detect based on representation ID format
		// GPAC usually uses numeric IDs, FFmpeg might use different patterns
		generator = pb.Generator_GENERATOR_GPAC // default to GPAC
	}

	log.Printf("StreamSegment request: video_id=%s, representation_id=%s, segment=%d, init=%v, media=%s, generator=%v",
		req.GetVideoId(), req.GetRepresentationId(), req.GetSegmentNumber(), req.GetInitSegment(), req.GetMedia(), generator)

	var filename string

	// Build filename based on generator type
	switch generator {
	case pb.Generator_GENERATOR_FFMPEG:
		// FFmpeg naming pattern
		// Pattern: init-stream$RepresentationID$.m4s for init
		// Pattern: chunk-stream$RepresentationID$-$Number%05d$.m4s for segments

		if req.GetInitSegment() {
			filename = fmt.Sprintf("init-stream%s.m4s", req.GetRepresentationId())
		} else {
			// Format segment number with 5 digits (padded with zeros)
			formattedSegmentNumber := fmt.Sprintf("%05d", req.GetSegmentNumber())
			filename = fmt.Sprintf("chunk-stream%s-%s.m4s", req.GetRepresentationId(), formattedSegmentNumber)
		}
		log.Printf("Using FFmpeg naming pattern: %s", filename)

	case pb.Generator_GENERATOR_GPAC:
		fallthrough // Fall through to default GPAC handling
	default:
		// MP4Box (GPAC) naming pattern - original code

		// Convert representation_id to integer for MP4Box format
		repIdx, err := strconv.Atoi(req.GetRepresentationId())
		if err != nil {
			return fmt.Errorf("representation_id %q is not numeric for GPAC format: %v", req.GetRepresentationId(), err)
		}
		if repIdx < 1 {
			return fmt.Errorf("representation_id must be >= 1 for GPAC format, got %d", repIdx)
		}

		switch media := req.GetMedia(); media {
		case "video":
			videoIndex := repIdx - 1 // MPD id=1 -> file video_0_...
			if req.GetInitSegment() {
				filename = fmt.Sprintf("video_%d_dashinit.mp4", videoIndex)
				log.Printf("Init segment requested for video representation %s (GPAC format)", req.GetRepresentationId())
			} else {
				filename = fmt.Sprintf("video_%d_dash%d.m4s", videoIndex, req.GetSegmentNumber())
			}

		case "audio":
			if req.GetInitSegment() {
				filename = "audio_dashinit.mp4"
			} else {
				filename = fmt.Sprintf("audio_dash%d.m4s", req.GetSegmentNumber())
			}

		default:
			return fmt.Errorf("unsupported media type %q; must be \"video\" or \"audio\"", media)
		}
		log.Printf("Using GPAC naming pattern: %s", filename)
	}

	// Check for invalid segment numbers (should be > 0 for non-init segments)
	if !req.GetInitSegment() && req.GetSegmentNumber() <= 0 {
		return fmt.Errorf("segment_number must be > 0 for non-init segments, got %d", req.GetSegmentNumber())
	}

	fullPath := filepath.Join("converted", req.GetVideoId(), filename)

	// Alternative path search for backward compatibility
	// Try to find the file if it's not in the expected location
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Printf("File not found at primary path: %s, trying to find alternative", fullPath)

		// Try to find the file by scanning the directory
		videoDir := filepath.Join("converted", req.GetVideoId())
		if files, err := os.ReadDir(videoDir); err == nil {
			// Look for files with similar patterns
			pattern := ""
			if req.GetInitSegment() {
				if generator == pb.Generator_GENERATOR_FFMPEG {
					pattern = fmt.Sprintf("init-stream%s", req.GetRepresentationId())
				} else {
					if req.GetMedia() == "video" {
						repIdx, _ := strconv.Atoi(req.GetRepresentationId())
						pattern = fmt.Sprintf("video_%d_dashinit", repIdx-1)
					} else {
						pattern = "audio_dashinit"
					}
				}
			} else {
				if generator == pb.Generator_GENERATOR_FFMPEG {
					pattern = fmt.Sprintf("chunk-stream%s-%05d", req.GetRepresentationId(), req.GetSegmentNumber())
				} else {
					if req.GetMedia() == "video" {
						repIdx, _ := strconv.Atoi(req.GetRepresentationId())
						pattern = fmt.Sprintf("video_%d_dash%d", repIdx-1, req.GetSegmentNumber())
					} else {
						pattern = fmt.Sprintf("audio_dash%d", req.GetSegmentNumber())
					}
				}
			}

			found := false
			for _, file := range files {
				if strings.Contains(file.Name(), pattern) {
					fullPath = filepath.Join(videoDir, file.Name())
					log.Printf("Found alternative file: %s", fullPath)
					found = true
					break
				}
			}

			if !found {
				return fmt.Errorf("file not found: %s (also tried pattern: %s)", filename, pattern)
			}
		} else {
			return fmt.Errorf("failed to open file %q: %w", fullPath, err)
		}
	}

	// Open file and stream in chunks to avoid loading entire file into memory.
	f, err := os.Open(fullPath)
	if err != nil {
		return fmt.Errorf("failed to open file %q: %w", fullPath, err)
	}
	defer f.Close()

	log.Printf("Streaming file: %s, size: will stream in chunks", fullPath)

	const chunkSize = 64 * 1024 // 64 KiB
	buf := make([]byte, chunkSize)

	for {
		// Honor cancellation between reads/sends
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, readErr := f.Read(buf)
		if n > 0 {
			// Send a chunk containing only the bytes read.
			if sendErr := stream.Send(&pb.SegmentChunk{Data: buf[:n]}); sendErr != nil {
				return fmt.Errorf("failed to send segment chunk for %q: %w", filename, sendErr)
			}
		}

		if readErr != nil {
			if readErr == io.EOF {
				// Finished streaming successfully
				log.Printf("Successfully streamed file: %s", filename)
				break
			}
			return fmt.Errorf("failed reading file %q: %w", fullPath, readErr)
		}
	}

	return nil
}

// GetManifest returns the MPD manifest bytes for a given video id.
func (s *Server) GetManifest(ctx context.Context, req *pb.ManifestRequest) (*pb.ManifestResponse, error) {
	videoDir := filepath.Join("converted", req.GetVideoId())
	mpdPath := filepath.Join(videoDir, "manifest.mpd")

	data, err := os.ReadFile(mpdPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest %q: %w", mpdPath, err)
	}
	return &pb.ManifestResponse{MpdXml: data}, nil
}
