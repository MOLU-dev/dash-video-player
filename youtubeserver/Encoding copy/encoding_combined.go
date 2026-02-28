// // encoding/encoding_combined.go
// package encoding

// import (
// 	"bufio"
// 	"context"
// 	"fmt"
// 	"os"
// 	"os/exec"
// 	"path/filepath"
// 	"regexp"
// 	"strconv"
// 	"sync"
// 	"time"

// 	process "github.com/molu/youtube/process"
// 	"github.com/rs/zerolog/log"
// )

// func RunEncodingWithCombinedProgress(
// 	ctx context.Context,
// 	cfg EncoderConfig,
// ) (<-chan *process.ProgressResponse, error) {
// 	combinedProgressCh := make(chan *process.ProgressResponse, 50)

// 	go func() {
// 		defer close(combinedProgressCh)

// 		var wg sync.WaitGroup
// 		ffmpegProgressCh := make(chan *process.ProgressResponse, 20)
// 		mp4boxProgressCh := make(chan *process.ProgressResponse, 20)

// 		// Weights for combining progress
// 		const (
// 			ffmpegWeight = 0.7 // 70% of encoding stage
// 			mp4boxWeight = 0.3 // 30% of encoding stage
// 		)

// 		// Track current progress for both components
// 		var (
// 			ffmpegProgress float64
// 			mp4boxProgress float64
// 			ffmpegDone     bool
// 			mp4boxDone     bool
// 		)

// 		// Send combined progress with proper formatting
// 		sendCombinedProgress := func() {
// 			if ffmpegDone && mp4boxDone {
// 				combinedProgressCh <- &process.ProgressResponse{
// 					VideoId:         cfg.VideoID,
// 					ProgressPercent: 100,
// 					Message:         "Encoding and packaging completed",
// 				}
// 				return
// 			}

// 			// Calculate weighted progress
// 			combined := (ffmpegProgress * ffmpegWeight) + (mp4boxProgress * mp4boxWeight)

// 			// Round to 1% increments
// 			rounded := float64(int(combined + 0.5))
// 			if rounded > 100 {
// 				rounded = 100
// 			}

// 			// Determine current phase message with proper formatting
// 			var message string
// 			if !ffmpegDone {
// 				message = fmt.Sprintf("Transcoding: %.0f%%", ffmpegProgress)
// 			} else if !mp4boxDone {
// 				message = fmt.Sprintf("Packaging: %.0f%%", mp4boxProgress)
// 			} else {
// 				message = "Finalizing..."
// 			}

// 			select {
// 			case combinedProgressCh <- &process.ProgressResponse{
// 				VideoId:         cfg.VideoID,
// 				ProgressPercent: rounded,
// 				Message:         message,
// 			}:
// 			case <-ctx.Done():
// 				return
// 			}
// 		}

// 		// Channel to signal when FFmpeg is COMPLETELY done (files written)
// 		ffmpegCompleteChan := make(chan struct{})

// 		// Run FFmpeg transcoding
// 		wg.Add(1)
// 		go func() {
// 			defer wg.Done()
// 			defer close(ffmpegProgressCh)

// 			// Run FFmpeg and wait for it to complete
// 			runFFmpegWithProgress(ctx, cfg, ffmpegProgressCh)

// 			// FFmpeg process is done, but files might still be writing
// 			// Give it a moment to ensure all files are completely written
// 			time.Sleep(2 * time.Second)

// 			// Verify that output files exist before proceeding
// 			if !verifyFFmpegOutputFiles(cfg) {
// 				log.Error().Msg("FFmpeg output files missing or incomplete")
// 				return
// 			}

// 			close(ffmpegCompleteChan)
// 			ffmpegDone = true
// 			ffmpegProgress = 100
// 			sendCombinedProgress()
// 		}()

// 		// Monitor FFmpeg progress
// 		wg.Add(1)
// 		go func() {
// 			defer wg.Done()

// 			for progress := range ffmpegProgressCh {
// 				ffmpegProgress = progress.ProgressPercent
// 				sendCombinedProgress()
// 			}
// 		}()

// 		// Run MP4Box packaging (ONLY after FFmpeg completely finishes)
// 		wg.Add(1)
// 		go func() {
// 			defer wg.Done()
// 			defer close(mp4boxProgressCh)
// 			defer func() { mp4boxDone = true }()

// 			// Wait for FFmpeg to complete AND files to be ready
// 			select {
// 			case <-ffmpegCompleteChan:
// 				// FFmpeg completed successfully, continue with MP4Box
// 				log.Debug().Msg("FFmpeg completed, starting MP4Box")
// 			case <-ctx.Done():
// 				return
// 			}

// 			// Build MP4Box arguments
// 			mp4boxArgs := buildMP4BoxArgs(cfg)

// 			// Run MP4Box with progress tracking
// 			if err := RunMP4BoxWithDetailedProgress(ctx, cfg.VideoID, mp4boxArgs, mp4boxProgressCh); err != nil {
// 				log.Error().Err(err).Msg("MP4Box failed")
// 			} else {
// 				mp4boxProgress = 100
// 				sendCombinedProgress()
// 			}
// 		}()

// 		// Monitor MP4Box progress
// 		wg.Add(1)
// 		go func() {
// 			defer wg.Done()

// 			for progress := range mp4boxProgressCh {
// 				mp4boxProgress = progress.ProgressPercent
// 				sendCombinedProgress()
// 			}
// 		}()

// 		// Wait for all goroutines to complete
// 		wg.Wait()
// 	}()

// 	return combinedProgressCh, nil
// }

// // Verify that FFmpeg output files exist and are readable
// func verifyFFmpegOutputFiles(cfg EncoderConfig) bool {
// 	// Check video files
// 	for i := range cfg.Encodings {
// 		videoPath := filepath.Join(cfg.OutputDir, fmt.Sprintf("video_%d.mp4", i))
// 		if !fileExistsAndReadable(videoPath) {
// 			log.Error().Str("path", videoPath).Msg("Video file missing or unreadable")
// 			return false
// 		}
// 	}

// 	// Check audio file
// 	audioPath := filepath.Join(cfg.OutputDir, "audio.mp4")
// 	if !fileExistsAndReadable(audioPath) {
// 		log.Error().Str("path", audioPath).Msg("Audio file missing or unreadable")
// 		return false
// 	}

// 	return true
// }

// func fileExistsAndReadable(path string) bool {
// 	file, err := os.Open(path)
// 	if err != nil {
// 		return false
// 	}
// 	file.Close()
// 	return true
// }

// // runFFmpegWithProgress runs FFmpeg and reports progress via the channel

// func buildMP4BoxArgs(cfg EncoderConfig) []string {
// 	// Example: Build arguments for DASH packaging
// 	args := []string{
// 		"-dash", "2000",
// 		"-rap",
// 		"-profile", "dashavc264:live",
// 		"-segment-ext", "m4s",
// 		"-out", filepath.Join(cfg.OutputDir, "manifest.mpd"),
// 	}

// 	// Add input video and audio files generated by FFmpeg
// 	for i := range cfg.Encodings {
// 		videoPath := filepath.Join(cfg.OutputDir, fmt.Sprintf("video_%d.mp4", i))
// 		args = append(args, videoPath+"#video")
// 	}
// 	audioPath := filepath.Join(cfg.OutputDir, "audio.mp4")
// 	args = append(args, audioPath+"#audio")

// 	return args
// }

// func runFFmpegWithProgress(ctx context.Context, cfg EncoderConfig, progressCh chan<- *process.ProgressResponse) {
// 	defer close(progressCh)

// 	// Build FFmpeg filter complex
// 	filter := buildFFmpegFilter(cfg.Encodings)

// 	// Assemble ffmpeg args (similar to your original RunEncoding function)
// 	ffArgs := []string{
// 		"-y",
// 		"-fflags", "+genpts",
// 		"-avoid_negative_ts", "make_zero",
// 		"-i", cfg.InputPath,
// 		"-filter_complex", filter,
// 		"-af", "asetpts=PTS-STARTPTS",
// 		"-fps_mode", "cfr",
// 	}

// 	// Create temp directory for intermediate files
// 	tempDir, err := os.MkdirTemp(cfg.OutputDir, "encoding_tmp_")
// 	if err != nil {
// 		log.Error().Err(err).Msg("Failed to create temp directory")
// 		return
// 	}
// 	defer os.RemoveAll(tempDir)

// 	// Add video outputs
// 	for i, enc := range cfg.Encodings {
// 		outPath := filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", i))
// 		ffArgs = append(ffArgs,
// 			"-map", fmt.Sprintf("[vout%d]", i),
// 			"-c:v", "libx264",
// 			"-profile:v", "main",
// 			"-b:v", enc.Bitrate,
// 			"-r", "30",
// 			"-g", "60",
// 			"-keyint_min", "60",
// 			"-sc_threshold", "0",
// 			"-force_key_frames", "expr:gte(t,n_forced*2)",
// 			"-preset", "fast",
// 			"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
// 			outPath,
// 		)
// 	}

// 	// Add audio output
// 	audioPath := filepath.Join(tempDir, "audio.mp4")
// 	ffArgs = append(ffArgs,
// 		"-map", "0:a:0",
// 		"-c:a", "aac",
// 		"-b:a", "128k",
// 		"-ar", "44100",
// 		"-ac", "2",
// 		"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
// 		audioPath,
// 	)

// 	// Get video duration for progress calculation
// 	durationSec, err := getDurationSeconds(ctx, cfg.InputPath)
// 	if err != nil {
// 		log.Warn().Err(err).Msg("Failed to get duration, progress will be time-based")
// 		durationSec = 0
// 	}

// 	// Create and start FFmpeg command
// 	cmd := exec.CommandContext(ctx, "ffmpeg", ffArgs...)

// 	stderr, err := cmd.StderrPipe()
// 	if err != nil {
// 		log.Error().Err(err).Msg("Failed to get stderr pipe")
// 		return
// 	}

// 	if err := cmd.Start(); err != nil {
// 		log.Error().Err(err).Msg("Failed to start FFmpeg")
// 		return
// 	}

// 	// Parse FFmpeg progress from stderr
// 	scanner := bufio.NewScanner(stderr)
// 	timeRe := regexp.MustCompile(`time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})`)
// 	lastReportedPercent := -1

// 	for scanner.Scan() {
// 		select {
// 		case <-ctx.Done():
// 			cmd.Process.Kill()
// 			return
// 		default:
// 		}

// 		line := scanner.Text()

// 		// Parse time progress
// 		if matches := timeRe.FindStringSubmatch(line); matches != nil {
// 			hours, _ := strconv.Atoi(matches[1])
// 			minutes, _ := strconv.Atoi(matches[2])
// 			seconds, _ := strconv.Atoi(matches[3])
// 			currentTimeSec := float64(hours*3600 + minutes*60 + seconds)

// 			var progressPercent float64
// 			if durationSec > 0 {
// 				progressPercent = (currentTimeSec / durationSec) * 100
// 				if progressPercent > 100 {
// 					progressPercent = 100
// 				}
// 			} else {
// 				// Fallback: use a simple counter if duration is unknown
// 				progressPercent = 50 // Placeholder
// 			}

// 			// Only send if progress advanced by at least 1%
// 			currentPercent := int(progressPercent + 0.5)
// 			if currentPercent > lastReportedPercent {
// 				select {
// 				case progressCh <- &process.ProgressResponse{
// 					VideoId:         cfg.VideoID,
// 					ProgressPercent: progressPercent,
// 					Message:         fmt.Sprintf("Transcoding: %d%%", currentPercent),
// 				}:
// 					lastReportedPercent = currentPercent
// 				case <-ctx.Done():
// 					return
// 				}
// 			}
// 		}
// 	}

// 	// Wait for command to complete
// 	if err := cmd.Wait(); err != nil {
// 		log.Error().Err(err).Msg("FFmpeg command failed")
// 	} else {
// 		// Send final progress
// 		select {
// 		case progressCh <- &process.ProgressResponse{
// 			VideoId:         cfg.VideoID,
// 			ProgressPercent: 100,
// 			Message:         "Transcoding completed",
// 		}:
// 		case <-ctx.Done():
// 		}
// 	}
// }
