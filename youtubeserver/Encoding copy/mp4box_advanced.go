// encoding/mp4box_final.go
package encoding

import (
	"regexp"
	"strconv"
	"strings"
)

type MP4BoxProgressParser struct {
	segmentCount     int
	totalSegments    int
	lastProgress     float64
}

func NewMP4BoxProgressParser() *MP4BoxProgressParser {
	return &MP4BoxProgressParser{}
}

// Add this Parse method to the struct
func (p *MP4BoxProgressParser) Parse(line string) (float64, bool) {
	line = strings.TrimSpace(line)
	if line == "" {
		return 0, false
	}

	// Skip FFmpeg progress lines (they contain "frame=", "fps=", etc.)
	if strings.Contains(line, "frame=") || 
	   strings.Contains(line, "fps=") || 
	   strings.Contains(line, "time=") ||
	   strings.Contains(line, "bitrate=") {
		return 0, false
	}

	// Skip irrelevant MP4Box lines
	if strings.Contains(line, "[Dasher]") || 
	   strings.Contains(line, "Arg as set but not used") {
		return 0, false
	}

	// Look for MPD progress pattern: "MPD 1.13s 1 %"
	mpdPattern := regexp.MustCompile(`MPD\s+[0-9.]+s\s+([0-9]+(?:\.[0-9]+)?)\s*%`)
	matches := mpdPattern.FindAllStringSubmatch(line, -1)
	
	// Take the LAST MPD progress percentage in the line
	if len(matches) > 0 {
		lastMatch := matches[len(matches)-1]
		if percent, err := strconv.ParseFloat(lastMatch[1], 64); err == nil {
			return percent, true
		}
	}

	// Fallback: take the last percentage found anywhere in the line (but not from FFmpeg)
	percentPattern := regexp.MustCompile(`([0-9]{1,3}(?:\.[0-9]+)?)\s*%`)
	allMatches := percentPattern.FindAllStringSubmatch(line, -1)
	if len(allMatches) > 0 {
		lastMatch := allMatches[len(allMatches)-1]
		if percent, err := strconv.ParseFloat(lastMatch[1], 64); err == nil {
			return percent, true
		}
	}

	return 0, false
}

// You can keep the standalone function for backward compatibility if needed
func parseMP4BoxProgress(line string) (float64, bool) {
	parser := NewMP4BoxProgressParser()
	return parser.Parse(line)
}


