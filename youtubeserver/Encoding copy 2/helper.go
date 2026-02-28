// worker/encodings.go
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
	"time"

	"github.com/rs/zerolog/log"

	process "github.com/molu/youtube/process"
)

// Predefined encoding rungs for both orientations
var (
	// Landscape rungs (16:9 aspect ratio)
	landscapeRungs = []Encoding{
		{"5000k", "1920x1080", 1920, 1080},
		{"2800k", "1280x720", 1280, 720},
		{"1400k", "854x480", 854, 480},
		{"800k", "640x360", 640, 360},
		{"400k", "426x240", 426, 240},
	}

	// Portrait rungs (9:16 aspect ratio)  
	portraitRungs = []Encoding{
		{"1500k", "720x1280", 720, 1280},
		{"800k", "540x960", 540, 960},
		{"500k", "360x640", 360, 640},
		{"300k", "288x512", 288, 512},
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

	// compile regex once
	percentRe := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)\s*%`)

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
			if percent, ok := parseMP4BoxProgress(line, percentRe); ok {
				// percent is 0..100 (float)
				overall := startPercent + percent*(weight/100.0)
				if overall < startPercent {
					overall = startPercent
				}
				if overall > startPercent+weight {
					overall = startPercent + weight
				}

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
		}
	}()

	// wait for the process to finish or be cancelled
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("MP4Box command failed: %w", err)
	}

	// Send final progress point equal to startPercent + weight
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