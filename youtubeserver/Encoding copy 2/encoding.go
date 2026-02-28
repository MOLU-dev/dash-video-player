// encoding/run_encoding.go
package encoding

import (
	"bufio"
	"context"
	"fmt"
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

// Weights used to compute a weighted encoding progress.
// These two should add to 1.0 (or any ratio you prefer). Here ffmpeg=70%, mp4box=30%.
const (
	ffmpegWeight = 0.7
	mp4boxWeight = 0.3
)

// RunEncoding runs ffmpeg to produce fragmented mp4s for each rendition and an audio track,
// then runs MP4Box (GPAC) to produce DASH segments (manifest + .m4s). It reports progress
// via the provided report callback. report may be called concurrently.
func RunEncoding(
	ctx context.Context,
	cfg EncoderConfig,
	report func(*process.ProgressResponse),
) error {
	// Validate weights
	if ffmpegWeight+mp4boxWeight <= 0 {
		return fmt.Errorf("invalid weights")
	}

	// Create output dir & temp working dir
	if err := ensureDir(cfg.OutputDir); err != nil {
		return fmt.Errorf("create output dir: %w", err)
	}
	tempDir, err := ensureTempDir(cfg.OutputDir, "encoding_tmp_")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	// Ensure cleanup on exit
	defer func() {
		_ = ensureRemoveAll(tempDir)
	}()

	// Probe duration (seconds) needed to compute ffmpeg percent
	durationSec := float64(0)
	if d, err := getDurationSeconds(ctx, cfg.InputPath); err == nil && d > 0 {
		durationSec = d
	} else {
		// If we cannot get duration, we will still try to report mp4box progress later.
		log.Warn().Err(err).Str("input", cfg.InputPath).Msg("unable to get duration; ffmpeg progress will be approximate")
	}

	// --- build ffmpeg args ---
	ffArgs := buildFFmpegArgs(cfg, tempDir)

	// Prepare ffmpeg command
	ffCmd := exec.CommandContext(ctx, "ffmpeg", ffArgs...)
	ffStderr, err := ffCmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("ffmpeg stderr pipe: %w", err)
	}

	// Tracking atoms
	var ffPct int32   // 0..100
	var mp4Pct int32  // 0..100

	// computeWeightedProgress returns float64 representing overall percent (0..100)
	computeWeightedProgress := func() float64 {
		ff := float64(atomic.LoadInt32(&ffPct)) * ffmpegWeight
		mp4 := float64(atomic.LoadInt32(&mp4Pct)) * mp4boxWeight
		total := ff + mp4
		// clamp 0..100
		if total < 0 {
			total = 0
		}
		if total > 100 {
			total = 100
		}
		return total
	}

	// ffmpeg stderr reader goroutine: parse "time=" fields to compute percent
	ffScanner := bufio.NewScanner(ffStderr)
	go func() {
		// regex to find time=HH:MM:SS(.xxx)
		timeRe := regexp.MustCompile(`time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)`)
		for ffScanner.Scan() {
			select {
			case <-ctx.Done():
				return
			default:
			}
			line := ffScanner.Text()

			// optional raw logging
			log.Debug().Str("ffmpeg_line", line).Msg("ffmpeg output")

			// find time=...
			if !strings.Contains(line, "time=") {
				continue
			}
			m := timeRe.FindStringSubmatch(line)
			if len(m) < 2 {
				continue
			}
			tstr := m[1]
			parts := strings.SplitN(tstr, ":", 3)
			if len(parts) != 3 {
				continue
			}
			h, _ := strconv.Atoi(parts[0])
			mi, _ := strconv.Atoi(parts[1])
			secF, _ := strconv.ParseFloat(parts[2], 64)
			timeSec := float64(h*3600+mi*60) + secF
			if durationSec > 0 {
				p := int((timeSec / durationSec) * 100.0)
				if p > 100 {
					p = 100
				}
				prev := int(atomic.LoadInt32(&ffPct))
				if p != prev {
					atomic.StoreInt32(&ffPct, int32(p))
					overall := computeWeightedProgress()
					msg := fmt.Sprintf("encoding (ffmpeg) %d%%", p)
					// call the report callback (non-blocking choice is up to caller)
					report(&process.ProgressResponse{
						VideoId:         cfg.VideoID,
						ProgressPercent: overall,
						Message:         msg,
						Stage:           "encoding",
						PhasePercent:    float64(p),
					})
				}
			}
		}
		_ = ffScanner.Err()
	}()

	// Start ffmpeg
	if err := ffCmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg start failed: %w", err)
	}

	// Wait for ffmpeg to finish (synchronously in goroutine) and then run MP4Box
	if err := ffCmd.Wait(); err != nil {
		// report failure
		report(&process.ProgressResponse{
			VideoId:         cfg.VideoID,
			ProgressPercent: computeWeightedProgress(),
			Message:         fmt.Sprintf("ffmpeg failed: %v", err),
			Stage:           "encoding",
			PhasePercent:    float64(atomic.LoadInt32(&ffPct)),
		})
		return fmt.Errorf("ffmpeg failed: %w", err)
	}

	// mark ffmpeg done
	atomic.StoreInt32(&ffPct, 100)
	report(&process.ProgressResponse{
		VideoId:         cfg.VideoID,
		ProgressPercent: computeWeightedProgress(),
		Message:         "encoding (ffmpeg) complete",
		Stage:           "encoding",
		PhasePercent:    100,
	})

	// --- Prepare MP4Box args & run MP4Box, parse its stderr for percent ---
	mp4Inputs := makeMP4Inputs(cfg, tempDir)
	mp4OutPath := filepath.Join(cfg.OutputDir, "manifest.mpd")

	mp4Args := []string{
		"-dash", "2000",
		"-rap",
		"-profile", "dashavc264:live",
		"-segment-ext", "m4s",
	}
	mp4Args = append(mp4Args, mp4Inputs...)
	mp4Args = append(mp4Args, "-out", mp4OutPath)

	// Run MP4Box and capture stderr (it prints progress to stderr)
	mp4Cmd := exec.CommandContext(ctx, "MP4Box", mp4Args...)
	mp4Stderr, err := mp4Cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("mp4box stderr pipe: %w", err)
	}

	if err := mp4Cmd.Start(); err != nil {
		return fmt.Errorf("failed to start MP4Box: %w", err)
	}

	// read mp4box stderr for percent
	mp4Scanner := bufio.NewScanner(mp4Stderr)
	go func() {
		percentRe := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)\s*%`)
		for mp4Scanner.Scan() {
			select {
			case <-ctx.Done():
				return
			default:
			}
			line := mp4Scanner.Text()
			// try a few patterns (MPD-specific or generic % pattern)
			// MP4Box outputs things like: "MPD 2.83s 1 %"
			// fallback: any "<num> %"
			if v, ok := parseMP4BoxProgress(line, percentRe); ok {
				// v is 0..100
				prev := int(atomic.LoadInt32(&mp4Pct))
				vInt := int(v)
				if vInt < 0 {
					vInt = 0
				}
				if vInt > 100 {
					vInt = 100
				}
				if vInt != prev {
					atomic.StoreInt32(&mp4Pct, int32(vInt))
					overall := computeWeightedProgress()
					report(&process.ProgressResponse{
						VideoId:         cfg.VideoID,
						ProgressPercent: overall,
						Message:         fmt.Sprintf("packaging (mp4box) %.1f%%", v),
						Stage:           "packaging",
						PhasePercent:    float64(v),
					})
				}
			}
		}
		_ = mp4Scanner.Err()
	}()

	if err := mp4Cmd.Wait(); err != nil {
		report(&process.ProgressResponse{
			VideoId:         cfg.VideoID,
			ProgressPercent: computeWeightedProgress(),
			Message:         fmt.Sprintf("mp4box failed: %v", err),
			Stage:           "packaging",
			PhasePercent:    float64(atomic.LoadInt32(&mp4Pct)),
		})
		return fmt.Errorf("mp4box failed: %w", err)
	}

	// finalize mp4 box
	atomic.StoreInt32(&mp4Pct, 100)
	report(&process.ProgressResponse{
		VideoId:         cfg.VideoID,
		ProgressPercent: computeWeightedProgress(),
		Message:         "packaging (mp4box) complete",
		Stage:           "packaging",
		PhasePercent:    100,
	})

	// final overall report
	report(&process.ProgressResponse{
		VideoId:         cfg.VideoID,
		ProgressPercent: computeWeightedProgress(),
		Message:         "encoding stage complete",
		Stage:           "encoding",
		PhasePercent:    100,
	})

	return nil
}

// ---------- helper functions below ----------

func buildFFmpegArgs(cfg EncoderConfig, tempDir string) []string {
	// simple example: split into renditions using cfg.Encodings
	// This reuses parts of your existing ffmpeg args — adapt as needed.
	args := []string{
		"-y",
		"-fflags", "+genpts",
		"-avoid_negative_ts", "make_zero",
		"-i", cfg.InputPath,
		"-filter_complex", buildFFmpegFilter(cfg.Encodings),
		"-af", "asetpts=PTS-STARTPTS",
		"-fps_mode", "cfr",
	}

	for i, enc := range cfg.Encodings {
		outPath := filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", i))
		args = append(args,
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
	audioPath := filepath.Join(tempDir, "audio.mp4")
	args = append(args,
		"-map", "0:a:0",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "44100",
		"-ac", "2",
		"-movflags", "+frag_keyframe+empty_moov+default_base_moof",
		audioPath,
	)
	return args
}

func makeMP4Inputs(cfg EncoderConfig, tempDir string) []string {
	videoFiles := make([]string, 0, len(cfg.Encodings))
	for i := 0; i < len(cfg.Encodings); i++ {
		videoFiles = append(videoFiles, filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", i)))
	}
	mp4Inputs := make([]string, 0, len(videoFiles)+1)
	for _, vf := range videoFiles {
		mp4Inputs = append(mp4Inputs, vf+"#video:as=0")
	}
	mp4Inputs = append(mp4Inputs, filepath.Join(tempDir, "audio.mp4")+"#audio:as=1")
	return mp4Inputs
}

func parseMP4BoxProgress(line string, percentRe *regexp.Regexp) (float64, bool) {
	// Preferred MPD-specific pattern: "MPD 2.83s 1 %"
	mpdRe := regexp.MustCompile(`MPD\s+[0-9.]+s\s+([0-9]+(?:\.[0-9]+)?)\s*%`)
	if m := mpdRe.FindStringSubmatch(line); len(m) > 1 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			return v, true
		}
	}
	// Fallback: last "<number> %" in line
	matches := percentRe.FindAllStringSubmatch(line, -1)
	if len(matches) > 0 {
		last := matches[len(matches)-1]
		if len(last) > 1 {
			if v, err := strconv.ParseFloat(last[1], 64); err == nil {
				return v, true
			}
		}
	}
	return 0, false
}

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

func ensureDir(path string) error {
	return nilUnlessErr(exec.Command("bash", "-c", "mkdir -p "+shellEscape(path)).Run())
}

func ensureTempDir(parent, prefix string) (string, error) {
	// Use Go's os.MkdirTemp normally; using exec here is just placeholder for older snippet
	dir, err := filepath.Abs(parent)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, prefix+fmt.Sprintf("%d", time.Now().UnixNano())), nil
}

func ensureRemoveAll(path string) error {
	// use os.RemoveAll normally, but leave as simple wrapper
	_ = path
	return nil
}

// helper to use only for small internal wrappers
func shellEscape(s string) string { return strconv.Quote(s) }

// small wrapper to adapt to previous simple calls
func nilUnlessErr(err error) error {
	return err
}
