package encoding

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	process "github.com/molu/youtube/process"
	"github.com/rs/zerolog/log"
)

// Constants for progress weighting
const (
	ffmpegWeight = 0.7 // 70% of total progress
	mp4boxWeight = 0.3 // 30% of total progress
)

func RunEncoding(
	ctx context.Context,
	cfg EncoderConfig,
) (<-chan *process.ProgressResponse, error) {
	// 1. Clean output dir
	if err := os.RemoveAll(cfg.OutputDir); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("clean output directory: %w", err)
	}
	if err := os.MkdirAll(cfg.OutputDir, 0755); err != nil {
		return nil, fmt.Errorf("create output directory: %w", err)
	}

	// 2. Create a temporary working directory inside cfg.OutputDir
	tempDir, err := os.MkdirTemp(cfg.OutputDir, "encoding_tmp_")
	if err != nil {
		return nil, fmt.Errorf("create temp directory: %w", err)
	}

	if ffmpegWeight+mp4boxWeight <= 0 {
		return nil, fmt.Errorf("invalid weights")
	}
	// ensure tempDir removal at the end of the pipeline
	// we will defer cleanup inside the background goroutine that drives the pipeline
	// so that RunEncoding can return progressCh immediately.

	// 3. Probe original dimensions
	origWidth, origHeight, err := getVideoDimensions(cfg.InputPath)
	if err != nil {
		// immediate cleanup
		_ = os.RemoveAll(tempDir)
		return nil, fmt.Errorf("get video dimensions: %w", err)
	}
	isPortrait := origHeight > origWidth
	log.Info().
		Int("width", origWidth).
		Int("height", origHeight).
		Bool("is_portrait", isPortrait).
		Msg("Detected video orientation")

	// Log selected encodings for verification
	log.Info().Msg("Selected renditions:")
	for i, enc := range cfg.Encodings {
		log.Info().Msgf("  %d. %s @ %s (%dx%d)",
			i+1, enc.Bitrate, enc.Res, enc.Width, enc.Height)
	}

	// 4. Build filter_complex
	filter := buildFFmpegFilter(cfg.Encodings)

	// 5. Assemble ffmpeg args
	ffArgs := []string{
		"-y",
		"-fflags", "+genpts",
		"-avoid_negative_ts", "make_zero",
		"-i", cfg.InputPath,
		"-filter_complex", filter,
		"-af", "asetpts=PTS-STARTPTS",
		"-fps_mode", "cfr",
	}

	for i, enc := range cfg.Encodings {
		outPath := filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", i))
		ffArgs = append(ffArgs,
			"-map", fmt.Sprintf("[vout%d]", i),
			"-c:v", "libx264",
			"-profile:v", "main",
			"-b:v", enc.Bitrate,
			"-r", "30",
			"-g", "60",
			"-keyint_min", "60",
			"-sc_threshold", "0",
			"-force_key_frames", "expr:gte(t,n_forced*2)",
			"-preset", "fast",
			"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
			outPath,
		)
	}

	// audio mapping
	audioPath := filepath.Join(tempDir, "audio.mp4")
	ffArgs = append(ffArgs,
		"-map", "0:a:0",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "44100",
		"-ac", "2",
		"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
		audioPath,
	)
	// add progress pipe to ffmpeg args (place before starting ffmpeg)
	ffArgs = append(ffArgs, "-progress", "pipe:2")

	// Determine duration for ffmpeg percent computation (seconds)
	var durationSec float64
	if d, err := getDurationSeconds(ctx, cfg.InputPath); err == nil && d > 0 {
		durationSec = d
	} else {
		durationSec = 0
	}

	ffCmd := exec.CommandContext(ctx, "ffmpeg", ffArgs...)
	log.Info().Str("cmd", ffCmd.String()).Msg("Starting transcoding")

	ffStderr, err := ffCmd.StderrPipe()
	if err != nil {
		_ = os.RemoveAll(tempDir)
		return nil, fmt.Errorf("ffmpeg stderr pipe: %w", err)
	}

	progressCh := make(chan *process.ProgressResponse, 16)

	// atomic stage percentages (0-100)
	var ffPct int32 = 0
	var mp4Pct int32 = 0

	// helper to compute weighted progress (0-100)
	computeWeightedProgress := func() float64 {
		ff := float64(atomic.LoadInt32(&ffPct)) * ffmpegWeight   // maps 0..100 -> 0..70
		mp4 := float64(atomic.LoadInt32(&mp4Pct)) * mp4boxWeight // maps 0..100 -> 0..30
		total := ff + mp4
		if total > 100 {
			total = 100
		} else if total < 0 {
			total = 0
		}
		return total
	}

	// ffmpeg stderr reader — parse progress (time=...)
	// FFmpeg stderr reader using -progress pipe:2 (out_time_ms=...)
go func() {
	timeRe := regexp.MustCompile(`out_time_ms=(\d+)`)
	scanner := bufio.NewScanner(ffStderr)
	prevReported := -1

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
		}

		line := scanner.Text()

		// parse only the out_time_ms progress lines
		if !strings.HasPrefix(line, "out_time_ms=") {
			continue
		}

		m := timeRe.FindStringSubmatch(line)
		if len(m) < 2 {
			continue
		}

		// out_time_ms is typically in milliseconds (FFmpeg -progress uses microseconds on some builds,
		// if your values are huge adjust divider accordingly). Here we interpret as milliseconds.
		outMs, err := strconv.ParseFloat(m[1], 64)
		if err != nil {
			continue
		}

		// compute percent (safe guard durationSec)
		var pctInt int
		if durationSec > 0 {
			percent := (outMs / 1000.0) / durationSec * 100.0 // outMs -> seconds
			if percent >= 100 {
				pctInt = 100
			} else if percent < 0 {
				pctInt = 0
			} else {
				pctInt = int(percent + 0.5)
			}
		} else {
			// if duration unknown, skip fine-grained percent
			continue
		}

		// send incremental steps from prevReported+1 .. pctInt
		if pctInt > prevReported {
			for i := prevReported + 1; i <= pctInt; i++ {
				atomic.StoreInt32(&ffPct, int32(i))
				overallProgress := computeWeightedProgress()
				msg := fmt.Sprintf("Transcoding: ffmpeg=%d%% mp4box=%d%% total=%.0f%%",
					atomic.LoadInt32(&ffPct), atomic.LoadInt32(&mp4Pct), overallProgress)

				select {
				case progressCh <- &process.ProgressResponse{
					VideoId:         cfg.VideoID,
					ProgressPercent: overallProgress,
					Message:         msg,
				}:
				case <-ctx.Done():
					return
				default:
					// channel full — skip to avoid blocking; keep prevReported so we won't resend
				}
			}
			prevReported = pctInt
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error().Err(err).Msg("ffmpeg progress scanner error")
	}
}()


	// Start ffmpeg
	if err := ffCmd.Start(); err != nil {
		_ = os.RemoveAll(tempDir)
		return nil, fmt.Errorf("ffmpeg start failed: %w", err)
	}

	// Start the main pipeline goroutine that waits for ffmpeg, runs mp4box, cleans up, and closes progressCh
	go func() {
		defer func() {
			// ensure cleanup and closing of progressCh
			if remErr := os.RemoveAll(tempDir); remErr != nil {
				log.Error().Err(remErr).Msg("Failed to clean up tempDir")
			}
			close(progressCh)
		}()

		// wait for ffmpeg to finish / or ctx cancellation
		if err := ffCmd.Wait(); err != nil {
			log.Error().Err(err).Msg("FFmpeg transcoding failed")
			// report failure
			select {
			case progressCh <- &process.ProgressResponse{
				VideoId:         cfg.VideoID,
				ProgressPercent: 0,
				Message:         fmt.Sprintf("Transcoding failed: %v", err),
			}:
			case <-ctx.Done():
			}
			return
		}

		// mark ffmpeg done
		atomic.StoreInt32(&ffPct, 100)
		overallProgress := computeWeightedProgress()
		select {
		case progressCh <- &process.ProgressResponse{
			VideoId:         cfg.VideoID,
			ProgressPercent: float64(overallProgress),
			Message:         fmt.Sprintf("Transcoding complete. ffmpeg=100 mp4box=%d total=%d", atomic.LoadInt32(&mp4Pct), overallProgress),
		}:
		case <-ctx.Done():
			return
		}

		// --- MP4Box packaging with RunMP4BoxWithProgress helper ---
		// Build mp4 inputs
		videoFiles := make([]string, 0, len(cfg.Encodings))
		for i := 0; i < len(cfg.Encodings); i++ {
			videoFiles = append(videoFiles, filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", i)))
		}
		mp4Inputs := make([]string, 0, len(videoFiles)+1)
		for _, vf := range videoFiles {
			mp4Inputs = append(mp4Inputs, vf+"#video:as=0")
		}
		mp4Inputs = append(mp4Inputs, audioPath+"#audio:as=1")

		mp4boxArgs := []string{
			"-dash", "2000",
			"-rap",
			"-profile", "dashavc264:live",
			"-segment-ext", "m4s",
		}
		mp4boxArgs = append(mp4boxArgs, mp4Inputs...)
		mp4boxArgs = append(mp4boxArgs, "-out", filepath.Join(cfg.OutputDir, "manifest.mpd"))

		// raw MP4Box percent channel
		rawMP4Ch := make(chan *process.ProgressResponse, 8)

		// Run MP4Box in background and let it stream raw percents to rawMP4Ch
		go func() {
			// RunMP4BoxWithProgress will send raw 0..100 progress into rawMP4Ch
			if err := RunMP4BoxWithProgress(ctx, cfg.VideoID, mp4boxArgs, rawMP4Ch, 0.0, 100.0); err != nil {
				log.Error().Err(err).Msg("MP4Box failed")
				// notify failure
				select {
				case progressCh <- &process.ProgressResponse{
					VideoId:         cfg.VideoID,
					ProgressPercent: float64(computeWeightedProgress()),
					Message:         fmt.Sprintf("DASH packaging failed: %v", err),
				}:
				case <-ctx.Done():
				}
			}
			// Close the local rawMP4Ch so the forwarding loop stops.
			close(rawMP4Ch)
		}()

		// Forward raw mp4 progress into global progressCh with weighting
		prevMP4 := -1
for pr := range rawMP4Ch {
	select {
	case <-ctx.Done():
		return
	default:
	}

	raw := int(pr.ProgressPercent)
	if raw < 0 {
		raw = 0
	}
	if raw > 100 {
		raw = 100
	}

	if raw > prevMP4 {
		// send each integer step from prevMP4+1 to raw
		for i := prevMP4 + 1; i <= raw; i++ {
			if i < 0 || i > 100 {
				continue
			}
			atomic.StoreInt32(&mp4Pct, int32(i))
			overallProgress := computeWeightedProgress()
			msg := fmt.Sprintf("DASH packaging: ffmpeg=%d%% mp4box=%d%% total=%.0f%%",
				atomic.LoadInt32(&ffPct), atomic.LoadInt32(&mp4Pct), overallProgress)

			select {
			case progressCh <- &process.ProgressResponse{
				VideoId:         cfg.VideoID,
				ProgressPercent: overallProgress,
				Message:         msg,
			}:
			case <-ctx.Done():
				return
			default:
				// channel full — continue; we keep prevMP4 so we won't resend
			}
		}
		prevMP4 = raw
	}
}

		// Ensure finalization
		atomic.StoreInt32(&mp4Pct, 100)
		overallProgress = computeWeightedProgress()
		select {
		case progressCh <- &process.ProgressResponse{
			VideoId:         cfg.VideoID,
			ProgressPercent: float64(overallProgress),
			Message:         fmt.Sprintf("DASH packaging complete (chunked). ffmpeg=%d mp4box=%d total=%d", atomic.LoadInt32(&ffPct), atomic.LoadInt32(&mp4Pct), overallProgress),
		}:
		case <-ctx.Done():
			return
		}
	}()

	return progressCh, nil
}

// --- helpers ---

func getDurationSeconds(ctx context.Context, path string) (float64, error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		path,
	)
	out, err := cmd.Output()
	if err != nil {
		return 0, err
	}
	s := strings.TrimSpace(string(out))
	if s == "" {
		return 0, fmt.Errorf("empty duration from ffprobe")
	}
	return strconv.ParseFloat(s, 64)
}

func countM4S(dir string) (int, error) {
	count := 0
	err := filepath.WalkDir(dir, func(_ string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(strings.ToLower(d.Name()), ".m4s") {
			count++
		}
		return nil
	})
	return count, err
}

// package encoding

// import (
// 	"bufio"
// 	"io"
// 	"strconv"
// 	"strings"

// 	"github.com/molu/youtube/process"
// )

// EncoderConfig holds everything needed to run an encoding pass.
type EncoderConfig struct {
	InputPath     string
	OutputDir     string
	VideoID       string
	Encodings     []Encoding
	TotalDuration float64 // in microseconds
}

// Encoding describes one output rendition.
type Encoding struct {
	Bitrate string
	Res     string
	Width   int
	Height  int
}

// ProgressResponse is used to report conversion progress.

// new version of processProgress that writes into a supplied channel
func processProgress(r io.Reader, totalDuration int64, videoID string, ch chan *process.ProgressResponse) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "out_time_ms=") {
			tms, err := strconv.ParseInt(strings.TrimPrefix(line, "out_time_ms="), 10, 64)
			if err != nil {
				continue
			}
			pct := float64(tms) / float64(totalDuration) * 100
			ch <- &process.ProgressResponse{
				VideoId:         videoID,
				ProgressPercent: pct,
				Message:         "Encoding in progress",
			}
		}
	}
} // worker/encodings.go
// package encoding

// import (
// 	"bufio"
// 	"context"
// 	"fmt"
// 	"os/exec"
// 	"path/filepath"
// 	"regexp"
// 	"strconv"
// 	"strings"
// 	"time"
// 	"github.com/rs/zerolog/log"

// 	"github.com/molu/youtube/process"
// )

// Predefined encoding rungs for both orientations
var (
	// Landscape rungs (16:9 aspect ratio)
	landscapeRungs = []Encoding{
		{"35000", "3840 × 2160", 3840, 2160},
		{"15000", "2560 × 1440", 2560, 1440},
		{"6000k", "1920x1080", 1920, 1080},
		{"3000k", "1280x720", 1280, 720},
		{"1200", "854x480", 854, 480},
		{"600k", "640x360", 640, 360},
		{"300", "426x240", 426, 240},
		{"150", "256x144", 256, 144},
	}

	// Portrait rungs (9:16 aspect ratio)
	portraitRungs = []Encoding{
		{"1500k", "720x1280", 720, 1280},
		{"800k", "540x960", 540, 960},
		{"500k", "360x640", 360, 640},
		{"300k", "288x512", 240, 426},
		{"150k", "144x256", 144, 256},
	}
)

func buildFFmpegFilter(encodings []Encoding) string {
	n := len(encodings)
	splits := make([]string, n)
	for i := range splits {
		splits[i] = fmt.Sprintf("[v%d]", i)
	}

	filter := "[0:v]setpts=PTS-STARTPTS," + fmt.Sprintf("split=%d%s", n, strings.Join(splits, ""))
	for i, enc := range encodings {
		// Use exact scaling to match the normalized rungs exactly
		filter += fmt.Sprintf(
			";[v%d]scale=%d:%d:flags=lanczos,setsar=1/1[vout%d]",
			i, enc.Width, enc.Height, i,
		)
	}
	return filter
}

func BuildEncodings(origWidth, origHeight int, origBitrate string) []Encoding {
	isPortrait := origHeight > origWidth
	log.Printf("Source video: %dx%d (portrait: %v)", origWidth, origHeight, isPortrait)

	// Select the appropriate ladder based on orientation
	var ladder []Encoding
	if isPortrait {
		ladder = portraitRungs
	} else {
		ladder = landscapeRungs
	}

	// Find the closest rung that matches or is smaller than the original
	var normalizedOriginal Encoding
	foundMatch := false

	// For portrait, compare by height; for landscape, compare by width
	if isPortrait {
		for _, rung := range ladder {
			if rung.Height <= origHeight {
				normalizedOriginal = rung
				foundMatch = true
				break
			}
		}
	} else {
		for _, rung := range ladder {
			if rung.Width <= origWidth {
				normalizedOriginal = rung
				foundMatch = true
				break
			}
		}
	}

	// If no suitable rung found (source is smaller than smallest rung), use the smallest
	if !foundMatch && len(ladder) > 0 {
		normalizedOriginal = ladder[len(ladder)-1] // Smallest rung
	}

	// Use the original bitrate for the normalized rung
	normalizedOriginal.Bitrate = origBitrate

	// Include all rungs from the normalized one down to the smallest
	var filtered []Encoding
	startAdding := false

	for _, rung := range ladder {
		if !startAdding {
			// Start adding when we hit the normalized rung
			if rung.Width == normalizedOriginal.Width && rung.Height == normalizedOriginal.Height {
				startAdding = true
				filtered = append(filtered, normalizedOriginal)
			}
		} else {
			// Add all smaller rungs
			filtered = append(filtered, rung)
		}
	}

	// If we didn't start adding (edge case), just use all rungs
	if len(filtered) == 0 {
		filtered = ladder
		if len(filtered) > 0 {
			// Use original bitrate for the largest rung
			filtered[0].Bitrate = origBitrate
		}
	}

	log.Printf("Normalized original %dx%d to rung: %s @ %s",
		origWidth, origHeight, normalizedOriginal.Bitrate, normalizedOriginal.Res)
	log.Printf("Selected %d quality renditions:", len(filtered))
	for i, e := range filtered {
		log.Printf("%d. %s @ %s (%dx%d)", i+1, e.Bitrate, e.Res, e.Width, e.Height)
	}

	return filtered
}

// getVideoDimensions returns width and height of the video
func getVideoDimensions(inputPath string) (int, int, error) {
	cmd := exec.Command("ffprobe", "-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=p=0",
		inputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe failed: %w", err)
	}

	// Output format: "width,height"
	dimensions := strings.Split(strings.TrimSpace(string(output)), ",")
	if len(dimensions) != 2 {
		return 0, 0, fmt.Errorf("unexpected ffprobe output: %s", string(output))
	}

	width, err := strconv.Atoi(dimensions[0])
	if err != nil {
		return 0, 0, fmt.Errorf("parse width failed: %w", err)
	}

	height, err := strconv.Atoi(dimensions[1])
	if err != nil {
		return 0, 0, fmt.Errorf("parse height failed: %w", err)
	}

	return width, height, nil
}

func monitorMP4BoxProgress(
	ctx context.Context,
	outputDir string,
	totalSegments int,
	videoID string,
	progressCh chan<- *process.ProgressResponse,
) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastCount := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Count generated segments
			files, _ := filepath.Glob(filepath.Join(outputDir, "*.m4s"))
			current := len(files)

			// Prevent sending on closed channel
			select {
			case <-ctx.Done():
				return
			default:
			}

			if current > lastCount {
				progress := 50 + (float64(current)/float64(totalSegments))*50
				message := fmt.Sprintf("Packaging DASH: %d/%d segments", current, totalSegments)

				// Safely send progress update
				select {
				case progressCh <- &process.ProgressResponse{
					VideoId:         videoID,
					ProgressPercent: progress,
					Message:         message,
				}:
				case <-ctx.Done():
					return
				}

				lastCount = current
			}

			// Exit when all segments are generated
			if current >= totalSegments {
				return
			}
		}
	}
}

func RunMP4BoxWithProgress(
	ctx context.Context,
	videoID string,
	cmdArgs []string,
	progressCh chan<- *process.ProgressResponse,
	startPercent float64,
	weight float64,
) error {
	// build command
	cmd := exec.CommandContext(ctx, "MP4Box", cmdArgs...)

	// get stderr (MP4Box prints progress to stderr)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start MP4Box: %w", err)
	}

	// scanner reads lines from stderr
	scanner := bufio.NewScanner(stderr)
	go func() {
		for scanner.Scan() {
			select {
			case <-ctx.Done():
				return
			default:
			}

			line := scanner.Text()

			// try to parse a percent value from the MP4Box output
			if percent, ok := parseMP4BoxProgress(line); ok {
				// percent is 0..100 (float)
				overall := startPercent + percent*(weight/100.0)
				// clamp to [startPercent, startPercent+weight]
				if overall < startPercent {
					overall = startPercent
				}
				if overall > startPercent+weight {
					overall = startPercent + weight
				}

				// non-blocking send (respect context)
				select {
				case <-ctx.Done():
					return
				case progressCh <- &process.ProgressResponse{
					VideoId:         videoID,
					ProgressPercent: overall,
					Message:         "DASH packaging in progress",
				}:
				}
			}

			// keep the raw line logged (worker should log as needed)
			// Note: avoid importing your worker logging package here to prevent cycles.
			// You can forward the raw line back to the worker over another channel if you need it.
		}

		// ignore scanner.Err() here; caller can check cmd.Wait() result
	}()

	// wait for the process to finish or be cancelled
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("MP4Box command failed: %w", err)
	}

	// Send final progress point equal to startPercent + weight (i.e., MP4Box finished)
	select {
	case <-ctx.Done():
		return ctx.Err()
	case progressCh <- &process.ProgressResponse{
		VideoId:         videoID,
		ProgressPercent: startPercent + weight,
		Message:         "DASH packaging complete",
	}:
	}

	return nil
}

// // parseMP4BoxProgress attempts to extract a percentage value from MP4Box stderr lines.
// // Returns (percent, true) when a percent was found, otherwise (0,false).
// func parseMP4BoxProgress(line string) (float64, bool) {
// 	// Preferred MPD-specific pattern: "MPD 2.83s 1 %"
// 	mpdRe := regexp.MustCompile(`MPD\s+[0-9.]+s\s+([0-9]+(?:\.[0-9]+)?)\s*%`)
// 	if m := mpdRe.FindStringSubmatch(line); len(m) > 1 {
// 		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
// 			return v, true
// 		}
// 	}

// 	// Fallback: find the last occurrence of "<number> %" in the line
// 	percentRe := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)\s*%`)
// 	matches := percentRe.FindAllStringSubmatch(line, -1)
// 	if len(matches) > 0 {
// 		last := matches[len(matches)-1]
// 		if len(last) > 1 {
// 			if v, err := strconv.ParseFloat(last[1], 64); err == nil {
// 				return v, true
// 			}
// 		}
// 	}

// 	// No percent found
// 	_ = line // keep for debugging if you wire logging from worker
// 	return 0, false
// }
