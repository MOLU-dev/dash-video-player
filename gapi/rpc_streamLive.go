package gapi

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/go-redis/redis"
	"github.com/molu/youtube/pb"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Add these constants at the top of the file
const (
	// Redis keys for live streaming
	redisLiveStreamPrefix    = "live_stream:"
	redisSegmentReadyChannel = "segment_ready:"
	redisSegmentAvailPrefix  = "segment_avail:"

	// Live streaming settings
	segmentPollInterval = 200 * time.Millisecond
	segmentReadyTimeout = 30 * time.Second

	// Live edge buffer - how many segments behind live edge to start
	liveEdgeBuffer = 2 // Start 2 segments behind to ensure smooth playback
)

// Add this StreamingState struct if not already present
type StreamingState struct {
	VideoID           string
	IsLive            bool
	LastSegmentNumber int32
	TotalSegments     int32
	StartTime         time.Time
	mu                sync.RWMutex
}

// Add this LiveStreamManager if not already present
type LiveStreamManager struct {
	streams map[string]*StreamingState
	mu      sync.RWMutex
}

func NewLiveStreamManager() *LiveStreamManager {
	return &LiveStreamManager{
		streams: make(map[string]*StreamingState),
	}
}

func (lsm *LiveStreamManager) RegisterStream(videoID string) *StreamingState {
	lsm.mu.Lock()
	defer lsm.mu.Unlock()

	state := &StreamingState{
		VideoID:           videoID,
		IsLive:            true,
		LastSegmentNumber: -1,
		StartTime:         time.Now(),
	}
	lsm.streams[videoID] = state
	return state
}

func (lsm *LiveStreamManager) GetStream(videoID string) (*StreamingState, bool) {
	lsm.mu.RLock()
	defer lsm.mu.RUnlock()
	state, ok := lsm.streams[videoID]
	return state, ok
}

func (lsm *LiveStreamManager) UpdateSegment(videoID string, segmentNum int32) {
	lsm.mu.Lock()
	defer lsm.mu.Unlock()

	if state, ok := lsm.streams[videoID]; ok {
		if segmentNum > state.LastSegmentNumber {
			state.LastSegmentNumber = segmentNum
		}
	}
}

func (lsm *LiveStreamManager) EndStream(videoID string, totalSegments int32) {
	lsm.mu.Lock()
	defer lsm.mu.Unlock()

	if state, ok := lsm.streams[videoID]; ok {
		state.IsLive = false
		state.TotalSegments = totalSegments
	}
}

// Add this global variable
var liveStreamManager = NewLiveStreamManager()

// getLiveEdge returns the current live edge segment number
func (server *Server) getLiveEdge(ctx context.Context, videoID string) (uint32, error) {
	// Get all available segments from Redis set
	segmentKey := redisSegmentAvailPrefix + videoID
	segments, err := server.redisClient.SMembers(ctx, segmentKey).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get available segments: %w", err)
	}

	if len(segments) == 0 {
		return 0, fmt.Errorf("no segments available yet")
	}

	// Find the highest segment number (live edge)
	var maxSegment uint32
	for _, seg := range segments {
		segNum, err := strconv.ParseUint(seg, 10, 32)
		if err != nil {
			continue
		}
		if uint32(segNum) > maxSegment {
			maxSegment = uint32(segNum)
		}
	}

	return maxSegment, nil
}

// checkSegmentExists checks if a segment is available
func (server *Server) checkSegmentExists(ctx context.Context, videoID string, segmentNum uint32) (bool, error) {
	segmentKey := redisSegmentAvailPrefix + videoID
	exists, err := server.redisClient.SIsMember(ctx, segmentKey, int(segmentNum)).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check segment: %w", err)
	}
	return exists, nil
}

// streamAvailableSegments streams all available segments up to target segment
func (server *Server) streamAvailableSegments(
	ctx context.Context,
	stream pb.YoutubeClone_StreamVideoLiveServer,
	videoID string,
	representationID string,
	baseDir string,
	targetSegment uint32,
) error {
	segmentKey := redisSegmentAvailPrefix + videoID
	segments, err := server.redisClient.SMembers(ctx, segmentKey).Result()
	if err != nil {
		return fmt.Errorf("failed to get available segments: %w", err)
	}

	// Convert to sorted list
	var availableSegments []uint32
	for _, seg := range segments {
		segNum, err := strconv.ParseUint(seg, 10, 32)
		if err != nil {
			continue
		}
		segUint := uint32(segNum)
		if segUint <= targetSegment {
			availableSegments = append(availableSegments, segUint)
		}
	}

	// Sort segments
	sort.Slice(availableSegments, func(i, j int) bool {
		return availableSegments[i] < availableSegments[j]
	})

	// Stream each available segment
	for _, segNum := range availableSegments {
		// Updated: Use getSegmentPath with representationID
		segmentPath := server.getSegmentPath(baseDir, representationID, segNum)

		// Check if file exists
		if _, err := os.Stat(segmentPath); os.IsNotExist(err) {
			log.Warn().
				Str("path", segmentPath).
				Uint32("segment", segNum).
				Msg("Segment file not found, skipping")
			continue
		}

		if err := server.streamSegment(stream, segmentPath, segNum, false); err != nil {
			log.Error().
				Err(err).
				Uint32("segment", segNum).
				Msg("Failed to stream segment")
			return err
		}

		log.Debug().
			Uint32("segment", segNum).
			Msg("Streamed catchup segment")
	}

	return nil
}

// getStartSegment determines where to start streaming from
func (server *Server) getStartSegment(
	ctx context.Context,
	req *pb.StreamVideoRequest,
	videoID string,
) (uint32, error) {
	// If user explicitly specified a start segment
	if req.GetStartSegment() > 0 {
		return req.GetStartSegment(), nil
	}

	// If not starting from live edge, start from beginning
	if !req.GetStartFromLiveEdge() {
		return 0, nil
	}

	// Get current live edge
	liveEdge, err := server.getLiveEdge(ctx, videoID)
	if err != nil {
		// No segments available yet, start from 0
		log.Warn().
			Str("video_id", videoID).
			Msg("No segments available, starting from 0")
		return 0, nil
	}

	// Calculate segments behind live
	segmentsBehind := req.GetSegmentsBehindLive()
	if segmentsBehind == 0 {
		segmentsBehind = liveEdgeBuffer // Default to 2 segments behind
	}

	// Start from live edge minus buffer
	var startSegment uint32
	if liveEdge > segmentsBehind {
		startSegment = liveEdge - segmentsBehind
	} else {
		startSegment = 0 // Not enough segments yet, start from beginning
	}

	log.Info().
		Str("video_id", videoID).
		Uint32("live_edge", liveEdge).
		Uint32("start_segment", startSegment).
		Uint32("segments_behind", segmentsBehind).
		Msg("Starting from live edge")

	return startSegment, nil
}

// StreamVideoLive - Updated to support live edge
func (s *Server) StreamVideoLive(
	req *pb.StreamVideoRequest,
	stream pb.YoutubeClone_StreamVideoLiveServer,
) error {
	ctx := stream.Context()

	videoID := req.GetVideoId()
	representationID := req.GetRepresentationId()

	log.Info().
		Str("video_id", videoID).
		Str("representation", representationID).
		Bool("live_edge", req.GetStartFromLiveEdge()).
		Msg("Live stream viewer connected")

	// Check if stream is live
	liveKey := redisLiveStreamPrefix + videoID
	streamStatus, err := s.redisClient.Get(ctx, liveKey).Result()
	if err != nil && err != redis.Nil {
		return status.Errorf(codes.Internal, "failed to check stream status")
	}

	isLive := streamStatus == "live"
	isComplete := streamStatus == "complete"

	// Get or create stream state
	streamState, _ := liveStreamManager.GetStream(videoID)

	// Subscribe to segment ready notifications
	pubsub := s.redisClient.Subscribe(ctx, redisSegmentReadyChannel+videoID)
	defer pubsub.Close()

	// Send initialization segment first
	baseDir := s.getSegmentBaseDir(videoID)
	if err := s.streamInitSegment(stream, baseDir, representationID); err != nil {
		log.Warn().Err(err).Msg("Init segment not ready, will retry")
		time.Sleep(1 * time.Second)
		if err := s.streamInitSegment(stream, baseDir, representationID); err != nil {
			return err
		}
	}

	// Determine starting segment (live edge or beginning)
	currentSegment, err := s.getStartSegment(ctx, req, videoID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to determine start segment")
		currentSegment = 0
	}

	// If starting from live edge, stream existing segments first
	if req.GetStartFromLiveEdge() && currentSegment > 0 {
		// Get all available segments up to current segment
		if err := s.streamAvailableSegments(
			ctx,
			stream,
			videoID,  
			representationID,
			baseDir,
			currentSegment,
		); err != nil {
			log.Warn().Err(err).Msg("Failed to stream initial segments")
			// Continue anyway
		}

		// Update current segment to latest
		liveEdge, _ := s.getLiveEdge(ctx, videoID)
		if liveEdge > currentSegment {
			currentSegment = liveEdge
		}
	}

	// Stream segments as they become available (real-time)
	segmentTimeout := time.After(segmentReadyTimeout)

	for {
		select {
		case <-ctx.Done():
			log.Info().Str("video_id", videoID).Msg("Client disconnected")
			return nil

		case <-segmentTimeout:
			if isLive {
				// Check if we're falling behind
				liveEdge, _ := s.getLiveEdge(ctx, videoID)
				if liveEdge > currentSegment+10 {
					log.Warn().
						Str("video_id", videoID).
						Uint32("current", currentSegment).
						Uint32("live_edge", liveEdge).
						Msg("Viewer falling behind, catching up")

					// Fast-forward to catch up
					currentSegment = liveEdge - liveEdgeBuffer
				}

				// Reset timeout for next segment
				segmentTimeout = time.After(segmentReadyTimeout)
			} else {
				// VOD mode - no more segments coming
				return nil
			}

		case msg := <-pubsub.Channel():
			// New segment available
			segmentNum, _ := strconv.Atoi(msg.Payload)

			// Only stream if this is the next expected segment or newer
			if uint32(segmentNum) >= currentSegment {
				// Stream all segments up to this one
				for currentSegment <= uint32(segmentNum) {
					segmentPath := s.getSegmentPath(baseDir, representationID, currentSegment)

					// Wait for segment file to be fully written
					if err := s.waitForSegmentFile(ctx, segmentPath); err != nil {
						log.Error().
							Err(err).
							Uint32("segment", currentSegment).
							Msg("Segment not available")
						break
					}

					// Stream the segment
					isFinal := isComplete && streamState != nil &&
						currentSegment >= uint32(streamState.TotalSegments-1)

					if err := s.streamSegment(stream, segmentPath, currentSegment, isFinal); err != nil {
						return err
					}

					log.Info().
						Str("video_id", videoID).
						Uint32("segment", currentSegment).
						Msg("Streamed segment to viewer")

					currentSegment++

					if isFinal {
						log.Info().Str("video_id", videoID).Msg("Stream complete")
						return nil
					}
				}
			}

			// Reset timeout after receiving segment
			segmentTimeout = time.After(segmentReadyTimeout)
		}

		// Check if stream completed while we were waiting
		streamStatus, _ := s.redisClient.Get(ctx, liveKey).Result()
		if streamStatus == "complete" {
			isLive = false
			isComplete = true

			// Stream any remaining segments
			if streamState != nil {
				for currentSegment < uint32(streamState.TotalSegments) {
					segmentPath := s.getSegmentPath(baseDir, representationID, currentSegment)
					isFinal := currentSegment >= uint32(streamState.TotalSegments-1)

					if err := s.streamSegment(stream, segmentPath, currentSegment, isFinal); err != nil {
						log.Error().Err(err).Msg("Failed to stream final segments")
						break
					}
					currentSegment++
				}
			}
			return nil
		}
	}
}

// GetLiveEdgeInfo - Helper RPC to get current live edge info
func (s *Server) GetLiveEdgeInfo(
	ctx context.Context,
	req *pb.GetLiveEdgeRequest,
) (*pb.GetLiveEdgeResponse, error) {
	videoID := req.GetVideoId()

	// Get live edge
	liveEdge, err := s.getLiveEdge(ctx, videoID)
	if err != nil {
		return &pb.GetLiveEdgeResponse{
			VideoId:           videoID,
			LiveEdge:          0,
			AvailableSegments: 0,
			IsLive:            false,
		}, nil
	}

	// Get available segments count
	segmentKey := redisSegmentAvailPrefix + videoID
	count, _ := s.redisClient.SCard(ctx, segmentKey).Result()

	// Check if live
	liveKey := redisLiveStreamPrefix + videoID
	streamStatus, _ := s.redisClient.Get(ctx, liveKey).Result()

	return &pb.GetLiveEdgeResponse{
		VideoId:           videoID,
		LiveEdge:          liveEdge,
		AvailableSegments: uint32(count),
		IsLive:            streamStatus == "live",
		RecommendedStart:  maxUint32(0, liveEdge-liveEdgeBuffer),
	}, nil
}

func maxUint32(a, b uint32) uint32 {
	if a > b {
		return a
	}
	return b
}

// Helper functions (already defined in previous code)
func (s *Server) waitForSegmentFile(ctx context.Context, path string) error {
	ticker := time.NewTicker(segmentPollInterval)
	defer ticker.Stop()

	timeout := time.After(5 * time.Second)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timeout:
			return fmt.Errorf("timeout waiting for segment file")
		case <-ticker.C:
			if s.isSegmentReady(path) {
				return nil
			}
		}
	}
}

func (s *Server) isSegmentReady(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}

	if info.Size() == 0 {
		return false
	}

	initialSize := info.Size()
	time.Sleep(50 * time.Millisecond)

	info2, err := os.Stat(path)
	if err != nil {
		return false
	}

	return info2.Size() == initialSize
}

// func (s *Server) getSegmentPath(baseDir string, segNum uint32, generator pb.Generator) string {
// 	switch generator {
// 	case pb.Generator_GENERATOR_FFMPEG:
// 		return filepath.Join(baseDir, fmt.Sprintf("segment_%d.m4s", segNum))
// 	case pb.Generator_GENERATOR_GPAC:
// 		return filepath.Join(baseDir, fmt.Sprintf("chunk-%05d.m4s", segNum))
// 	default:
// 		return filepath.Join(baseDir, fmt.Sprintf("seg_%d.m4s", segNum))
// 	}
// }


func (s *Server) getSegmentPath(baseDir, representationID string, segNum uint32) string {
	// Format: chunk-stream{representationID}-{segmentNum:05d}.m4s
	return filepath.Join(baseDir, fmt.Sprintf("chunk-stream%s-%05d.m4s", representationID, segNum))
}

func (s *Server) getSegmentBaseDir(videoID string) string {
	return filepath.Join(
		// s.config.FileBaseDir, // This is "videos" but WHIP uses "converted"
		"converted",
		videoID,
	)
}

// streamSegment streams a single segment file in chunks
func (s *Server) streamSegment(
	stream pb.YoutubeClone_StreamVideoLiveServer,
	segmentPath string,
	segmentNum uint32,
	isFinalSegment bool,
) error {
	file, err := os.Open(segmentPath)
	if err != nil {
		return status.Errorf(codes.NotFound, "segment %d not found", segmentNum)
	}
	defer file.Close()

	const chunkSize = 64 * 1024 // 64KB
	buffer := make([]byte, chunkSize)

	for {
		n, err := file.Read(buffer)
		if err == io.EOF {
			break
		}
		if err != nil {
			return status.Errorf(codes.Internal, "failed to read segment: %v", err)
		}

		chunk := &pb.StreamVideoChunk{
			SegmentNumber: segmentNum,
			Data:          buffer[:n],
			IsInit:        false,
			IsLastChunk:   false,
		}

		if err := stream.Send(chunk); err != nil {
			return status.Errorf(codes.Internal, "failed to send chunk: %v", err)
		}
	}

	// Send final chunk marker for this segment
	if err := stream.Send(&pb.StreamVideoChunk{
		SegmentNumber:  segmentNum,
		IsLastChunk:    true,
		IsFinalSegment: isFinalSegment,
	}); err != nil {
		return err
	}

	return nil
}

func (s *Server) streamInitSegment(
	stream pb.YoutubeClone_StreamVideoLiveServer,
	baseDir string,
	representationID string,
) error {
	initPath := filepath.Join(baseDir, fmt.Sprintf("init-stream%s.m4s", representationID))

	file, err := os.Open(initPath)
	if err != nil {
		return status.Errorf(codes.NotFound, "initialization segment not found at %s", initPath)
	}
	defer file.Close()

	const chunkSize = 64 * 1024
	buffer := make([]byte, chunkSize)

	for {
		n, err := file.Read(buffer)
		if err == io.EOF {
			break
		}
		if err != nil {
			return status.Errorf(codes.Internal, "failed to read init segment: %v", err)
		}

		chunk := &pb.StreamVideoChunk{
			SegmentNumber: 0,
			Data:          buffer[:n],
			IsInit:        true,
			IsLastChunk:   false,
		}

		if err := stream.Send(chunk); err != nil {
			return status.Errorf(codes.Internal, "failed to send chunk: %v", err)
		}
	}

	// Send final chunk marker for init segment
	if err := stream.Send(&pb.StreamVideoChunk{
		SegmentNumber: 0,
		IsInit:        true,
		IsLastChunk:   true,
	}); err != nil {
		return err
	}

	return nil
}

func (s *Server) StreamLiveManifest(
	req *pb.LiveManifestRequest,
	stream pb.YoutubeClone_StreamLiveManifestServer,
) error {
	ctx := stream.Context()
	videoID := req.GetVideoId()
	
	log.Info().
		Str("video_id", videoID).
		Msg("Client connected to live manifest stream")
	
	// Check if stream is live
	liveKey := redisLiveStreamPrefix + videoID
	streamStatus, err := s.redisClient.Get(ctx, liveKey).Result()
	if err != nil && err != redis.Nil {
		return status.Errorf(codes.Internal, "failed to check stream status")
	}
	
	isLive := streamStatus == "live"
	if !isLive {
		return status.Errorf(codes.InvalidArgument, "video is not a live stream")
	}
	
	// Send initial full manifest if requested
	if req.GetIncludeInitialManifest() {
		mpdXml, err := s.generateDynamicManifest(ctx, videoID)
		if err != nil {
			return status.Errorf(codes.Internal, "failed to generate manifest: %v", err)
		}
		
		if err := stream.Send(&pb.LiveManifestUpdate{
			Type:   pb.LiveManifestUpdate_FULL_MANIFEST,
			MpdXml: mpdXml,
		}); err != nil {
			return err
		}
		
		log.Info().
			Str("video_id", videoID).
			Msg("Sent initial manifest")
	}
	
	// Subscribe to segment availability notifications
	pubsub := s.redisClient.Subscribe(ctx, redisSegmentReadyChannel+videoID)
	defer pubsub.Close()
	
	// Also subscribe to stream status changes
	statusChannel := "stream_status:" + videoID
	statusPubsub := s.redisClient.Subscribe(ctx, statusChannel)
	defer statusPubsub.Close()
	
	// Send periodic manifest updates (every 5 seconds as per DASH spec)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			log.Info().Str("video_id", videoID).Msg("Client disconnected from manifest stream")
			return nil
			
		case <-pubsub.Channel():
			// New segment available - send segment availability notification
			if err := stream.Send(&pb.LiveManifestUpdate{
				Type: pb.LiveManifestUpdate_SEGMENT_AVAILABLE,
			}); err != nil {
				return err
			}
			
			log.Debug().
				Str("video_id", videoID).
				Msg("Notified segment availability")
			
		case statusMsg := <-statusPubsub.Channel():
			// Stream status changed
			if statusMsg.Payload == "complete" {
				// Send stream ended notification
				if err := stream.Send(&pb.LiveManifestUpdate{
					Type:    pb.LiveManifestUpdate_STREAM_ENDED,
					//Message: "Stream has ended",
				}); err != nil {
					return err
				}
				
				log.Info().Str("video_id", videoID).Msg("Stream ended")
				return nil
			}
			
		case <-ticker.C:
			// Send periodic manifest update (DASH requirement)
			mpdXml, err := s.generateDynamicManifest(ctx, videoID)
			if err != nil {
				log.Error().Err(err).Msg("Failed to generate periodic manifest")
				continue
			}
			
			if err := stream.Send(&pb.LiveManifestUpdate{
				Type:   pb.LiveManifestUpdate_FULL_MANIFEST,
				MpdXml: mpdXml,
			}); err != nil {
				return err
			}
			
			log.Debug().
				Str("video_id", videoID).
				Msg("Sent periodic manifest update")
		}
	}
}

// func (s *Server) StreamLiveManifest(
// 	req *pb.LiveManifestRequest,
// 	stream pb.YoutubeClone_StreamLiveManifestServer,
// ) error {
// 	ctx := stream.Context()
// 	videoID := req.GetVideoId()
	
// 	log.Info().
// 		Str("video_id", videoID).
// 		Msg("Client connected to live manifest stream")
	
// 	// Check if stream is live
// 	liveKey := redisLiveStreamPrefix + videoID
// 	streamStatus, err := s.redisClient.Get(ctx, liveKey).Result()
// 	if err != nil && err != redis.Nil {
// 		return status.Errorf(codes.Internal, "failed to check stream status")
// 	}
	
// 	isLive := streamStatus == "live"
// 	if !isLive {
// 		return status.Errorf(codes.InvalidArgument, "video is not a live stream")
// 	}
	
// 	// Send initial full manifest if requested
// 	if req.GetIncludeInitialManifest() {
// 		mpdXml, err := s.generateDynamicManifest(ctx, videoID)
// 		if err != nil {
// 			return status.Errorf(codes.Internal, "failed to generate manifest: %v", err)
// 		}
		
// 		liveEdge, _ := s.getLiveEdge(ctx, videoID)
// 		segmentKey := redisSegmentAvailPrefix + videoID
// 		availCount, _ := s.redisClient.SCard(ctx, segmentKey).Result()
		
// 		if err := stream.Send(&pb.LiveManifestUpdate{
// 			Type:              pb.LiveManifestUpdate_FULL_MANIFEST,
// 			MpdXml:            mpdXml,
// 			LiveEdge:          liveEdge,
// 			AvailableSegments: uint32(availCount),
// 			Timestamp:         time.Now().Unix(),
// 		}); err != nil {
// 			return err
// 		}
		
// 		log.Info().
// 			Str("video_id", videoID).
// 			Uint32("live_edge", liveEdge).
// 			Msg("Sent initial manifest")
// 	}
	
// 	// Subscribe to segment availability notifications
// 	pubsub := s.redisClient.Subscribe(ctx, redisSegmentReadyChannel+videoID)
// 	defer pubsub.Close()
	
// 	// Also subscribe to stream status changes
// 	statusChannel := "stream_status:" + videoID
// 	statusPubsub := s.redisClient.Subscribe(ctx, statusChannel)
// 	defer statusPubsub.Close()
	
// 	// Send periodic manifest updates (every 5 seconds as per DASH spec)
// 	ticker := time.NewTicker(5 * time.Second)
// 	defer ticker.Stop()
	
// 	for {
// 		select {
// 		case <-ctx.Done():
// 			log.Info().Str("video_id", videoID).Msg("Client disconnected from manifest stream")
// 			return nil
			
// 		case msg := <-pubsub.Channel():
// 			// New segment available
// 			segmentNum, _ := strconv.Atoi(msg.Payload)
			
// 			// Get current live edge
// 			liveEdge, _ := s.getLiveEdge(ctx, videoID)
// 			segmentKey := redisSegmentAvailPrefix + videoID
// 			availCount, _ := s.redisClient.SCard(ctx, segmentKey).Result()
			
// 			// Send segment availability notification
// 			if err := stream.Send(&pb.LiveManifestUpdate{
// 				Type:              pb.LiveManifestUpdate_SEGMENT_AVAILABLE,
// 				SegmentNumber:     int32(segmentNum),
// 				LiveEdge:          liveEdge,
// 				AvailableSegments: uint32(availCount),
// 				Timestamp:         time.Now().Unix(),
// 			}); err != nil {
// 				return err
// 			}
			
// 			log.Debug().
// 				Str("video_id", videoID).
// 				Int("segment", segmentNum).
// 				Uint32("live_edge", liveEdge).
// 				Msg("Notified segment availability")
			
// 		case statusMsg := <-statusPubsub.Channel():
// 			// Stream status changed
// 			if statusMsg.Payload == "complete" {
// 				// Send stream ended notification
// 				if err := stream.Send(&pb.LiveManifestUpdate{
// 					Type:      pb.LiveManifestUpdate_STREAM_ENDED,
// 					Timestamp: time.Now().Unix(),
// 					Message:   "Stream has ended",
// 				}); err != nil {
// 					return err
// 				}
				
// 				log.Info().Str("video_id", videoID).Msg("Stream ended")
// 				return nil
// 			}
			
// 		case <-ticker.C:
// 			// Send periodic manifest update (DASH requirement)
// 			mpdXml, err := s.generateDynamicManifest(ctx, videoID)
// 			if err != nil {
// 				log.Error().Err(err).Msg("Failed to generate periodic manifest")
// 				continue
// 			}
			
// 			liveEdge, _ := s.getLiveEdge(ctx, videoID)
// 			segmentKey := redisSegmentAvailPrefix + videoID
// 			availCount, _ := s.redisClient.SCard(ctx, segmentKey).Result()
			
// 			if err := stream.Send(&pb.LiveManifestUpdate{
// 				Type:              pb.LiveManifestUpdate_FULL_MANIFEST,
// 				MpdXml:            mpdXml,
// 				LiveEdge:          liveEdge,
// 				AvailableSegments: uint32(availCount),
// 				Timestamp:         time.Now().Unix(),
// 			}); err != nil {
// 				return err
// 			}
			
// 			log.Debug().
// 				Str("video_id", videoID).
// 				Msg("Sent periodic manifest update")
// 		}
// 	}
// }

// generateDynamicManifest reads the MPD manifest from the file directory
func (s *Server) generateDynamicManifest(ctx context.Context, videoID string) ([]byte, error) {
	// Check if stream exists
	_, ok := liveStreamManager.GetStream(videoID)
	if !ok {
		return nil, fmt.Errorf("stream not found")
	}
	
	// Construct path to the manifest file
	// The manifest should be in: converted/{videoID}/manifest.mpd
	videoDir := filepath.Join("converted", videoID)
	mpdPath := filepath.Join(videoDir, "manifest.mpd")
	
	// Read the manifest file
	data, err := os.ReadFile(mpdPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest %q: %w", mpdPath, err)
	}
	
	log.Info().
		Str("video_id", videoID).
		Str("manifest_path", mpdPath).
		Int("manifest_size", len(data)).
		Msg("Read dynamic manifest from file")
	
	return data, nil
}