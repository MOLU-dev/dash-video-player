 package encoding

// import (
// 	"bufio"
// 	"io"
// 	"strconv"
// 	"strings"

// 	process"github.com/molu/youtube/process"
// )

// // EncoderConfig holds everything needed to run an encoding pass.
// type EncoderConfig struct {
//     InputPath     string
//     OutputDir     string
//     VideoID       string
//     Encodings     []Encoding
//     TotalDuration int64 // in microseconds
// }

// // Encoding describes one output rendition.
// type Encoding struct {
//     Bitrate string
//     Res     string
//     Width   int
//     Height  int
// }

// // ProgressResponse is used to report conversion progress.



// // new version of processProgress that writes into a supplied channel
// func processProgress(r io.Reader, totalDuration int64, videoID string, ch chan *process.ProgressResponse) {
// 	scanner := bufio.NewScanner(r)
// 	for scanner.Scan() {
// 		line := scanner.Text()
// 		if strings.HasPrefix(line, "out_time_ms=") {
// 			tms, err := strconv.ParseInt(strings.TrimPrefix(line, "out_time_ms="), 10, 64)
// 			if err != nil {
// 				continue
// 			}
// 			pct := float64(tms) / float64(totalDuration) * 100
// 			ch <- &process.ProgressResponse{
// 				VideoId:         videoID,
// 				ProgressPercent: pct,
// 				Message:         "Encoding in progress",
// 			}
// 		}
// 	}
// }
