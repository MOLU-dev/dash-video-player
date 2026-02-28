// encoding/mp4box_progress.go
package encoding

// import (
// 	"fmt"
// 	"regexp"
// 	"strconv"
// )

// type MP4BoxProgress struct {
// 	Percent    float64
// 	Time       string
// 	Message    string
// }

// // Enhanced parser for MP4Box progress
// func parseMP4BoxProgress(line string) (float64, bool) {
// 	// Try multiple patterns to capture progress
	
// 	// Pattern 1: "MPD 2.83s 1 %"
// 	mpdPattern := regexp.MustCompile(`MPD\s+([0-9.]+)s\s+([0-9]+(?:\.[0-9]+)?)\s*%`)
// 	if matches := mpdPattern.FindStringSubmatch(line); len(matches) >= 3 {
// 		if percent, err := strconv.ParseFloat(matches[2], 64); err == nil {
// 			fmt.Printf("[MP4Box] Pattern1 matched: line='%s' -> %.1f%%\n", line, percent)
// 			return percent, true
// 		}
// 	}
	
// 	// Pattern 2: "[100%] ..."
// 	bracketPattern := regexp.MustCompile(`\[([0-9]+(?:\.[0-9]+)?)%\]`)
// 	if matches := bracketPattern.FindStringSubmatch(line); len(matches) >= 2 {
// 		if percent, err := strconv.ParseFloat(matches[1], 64); err == nil {
// 			fmt.Printf("[MP4Box] Pattern2 matched: line='%s' -> %.1f%%\n", line, percent)
// 			return percent, true
// 		}
// 	}
	
// 	// Pattern 3: Simple "XX %" anywhere in line
// 	simplePattern := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)\s*%`)
// 	matches := simplePattern.FindAllStringSubmatch(line, -1)
// 	if len(matches) > 0 {
// 		// Take the last percentage found (most likely the current progress)
// 		lastMatch := matches[len(matches)-1]
// 		if percent, err := strconv.ParseFloat(lastMatch[1], 64); err == nil {
// 			fmt.Printf("[MP4Box] Pattern3 matched: line='%s' -> %.1f%% (found %d matches)\n", 
// 				line, percent, len(matches))
// 			return percent, true
// 		}
// 	}
	
// 	fmt.Printf("[MP4Box] No pattern matched: '%s'\n", line)
// 	return 0, false
// }