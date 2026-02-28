package stream

import (
	"log"
	"strconv"

	"github.com/nareix/joy4/av"
	"github.com/nareix/joy4/format/rtmp"
)

type StreamQuality struct {
	Width      int
	Height     int
	Bitrate    int
	Framerate  float64
	Resolution string
}

type QualityLadder struct {
	Resolutions []ResolutionProfile
}

type ResolutionProfile struct {
	Name     string
	Width    int
	Height   int
	Bitrate  string
	Maxrate  string
	Bufsize  string
}

func (m *Manager) AnalyzeStreamQuality(conn *rtmp.Conn) (*StreamQuality, error) {
	log.Println("Analyzing incoming stream quality...")

	streams, err := conn.Streams()
	if err != nil {
		return nil, err
	}

	var width, height int
	var foundVideo bool

	// Look for video stream and extract dimensions
	for _, stream := range streams {
		if stream.Type().IsVideo() {
			if vstream, ok := stream.(av.VideoCodecData); ok {
				// Get width and height using the interface methods
				width = vstream.Width()
				height = vstream.Height()
				foundVideo = true
				log.Printf("Found video stream: %dx%d, codec: %s", 
					width, height, vstream.Type().String())
				break
			}
		}
	}

	if !foundVideo {
		log.Println("No video stream found, using default quality")
		return &StreamQuality{
			Width:      1280,
			Height:     720,
			Bitrate:    2500000,
			Framerate:  30,
			Resolution: "720p",
		}, nil
	}

	quality := &StreamQuality{
		Width:  width,
		Height: height,
	}

	// Determine resolution name
	switch {
	case quality.Width >= 3840 || quality.Height >= 2160:
		quality.Resolution = "4k"
		quality.Bitrate = 8000000
	case quality.Width >= 1920 || quality.Height >= 1080:
		quality.Resolution = "1080p"
		quality.Bitrate = 5000000
	case quality.Width >= 1280 || quality.Height >= 720:
		quality.Resolution = "720p"
		quality.Bitrate = 2500000
	case quality.Width >= 854 || quality.Height >= 480:
		quality.Resolution = "480p"
		quality.Bitrate = 1000000
	case quality.Width >= 640 || quality.Height >= 360:
		quality.Resolution = "360p"
		quality.Bitrate = 500000
	default:
		quality.Resolution = "240p"
		quality.Bitrate = 300000
	}

	quality.Framerate = 30.0 // Default assumption

	log.Printf("Stream quality analyzed: %dx%d (%s), estimated bitrate: %d",
		quality.Width, quality.Height, quality.Resolution, quality.Bitrate)

	return quality, nil
}

func (m *Manager) GenerateQualityLadder(inputQuality *StreamQuality) *QualityLadder {
	log.Printf("Generating quality ladder for input: %dx%d (%s)",
		inputQuality.Width, inputQuality.Height, inputQuality.Resolution)

	ladder := &QualityLadder{}

	// Define all possible output profiles (from highest to lowest)
	allProfiles := []ResolutionProfile{
		{"1080p", 1920, 1080, "5000k", "5350k", "10000k"},
		{"720p", 1280, 720, "2800k", "2996k", "5600k"},
		{"480p", 854, 480, "1400k", "1498k", "2800k"},
		{"360p", 640, 360, "800k", "856k", "1600k"},
		{"240p", 426, 240, "400k", "428k", "800k"},
	}

	// Filter profiles to only include those equal to or smaller than input
	for _, profile := range allProfiles {
		if profile.Width <= inputQuality.Width && profile.Height <= inputQuality.Height {
			ladder.Resolutions = append(ladder.Resolutions, profile)
			log.Printf("Added profile: %s (%dx%d)", profile.Name, profile.Width, profile.Height)
		} else {
			log.Printf("Skipped profile (too large): %s (%dx%d) - input is %dx%d",
				profile.Name, profile.Width, profile.Height, inputQuality.Width, inputQuality.Height)
		}
	}

	// If no profiles match (input is very small), use the smallest available
	if len(ladder.Resolutions) == 0 && len(allProfiles) > 0 {
		smallest := allProfiles[len(allProfiles)-1]
		ladder.Resolutions = append(ladder.Resolutions, smallest)
		log.Printf("Input too small, using smallest profile: %s", smallest.Name)
	}

	// If input resolution doesn't match any standard profile, add it as a custom profile
	inputMatches := false
	for _, profile := range ladder.Resolutions {
		if profile.Width == inputQuality.Width && profile.Height == inputQuality.Height {
			inputMatches = true
			break
		}
	}

	if !inputMatches {
		// Calculate bitrate for custom resolution (proportional to 720p)
		baseBitrate := 2500000 // 720p base
		basePixels := 1280 * 720
		inputPixels := inputQuality.Width * inputQuality.Height
		customBitrate := (inputPixels * baseBitrate) / basePixels

		customProfile := ResolutionProfile{
			Name:    "source",
			Width:   inputQuality.Width,
			Height:  inputQuality.Height,
			Bitrate: strconv.Itoa(customBitrate/1000) + "k",
			Maxrate: strconv.Itoa(int(float64(customBitrate)*1.07)/1000) + "k",
			Bufsize: strconv.Itoa(customBitrate*2/1000) + "k",
		}
		ladder.Resolutions = append([]ResolutionProfile{customProfile}, ladder.Resolutions...)
		log.Printf("   🔧 Added custom profile: %s (%dx%d) %s",
			customProfile.Name, customProfile.Width, customProfile.Height, customProfile.Bitrate)
	}

	log.Printf("Generated quality ladder with %d profiles", len(ladder.Resolutions))
	return ladder
}