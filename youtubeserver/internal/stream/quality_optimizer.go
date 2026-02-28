 package stream

// import (
// 	"log"
// 	"sort"
// 	"strconv"

// 	"github.com/nareix/joy4/format/rtmp"
// )

// // OptimizeQualityLadder further refines the quality ladder based on input resolution
// func (m *Manager) OptimizeQualityLadder(inputQuality *StreamQuality, ladder *QualityLadder) *QualityLadder {
// 	log.Printf("🎯 Optimizing quality ladder for %dx%d input", inputQuality.Width, inputQuality.Height)

// 	// Sort profiles by resolution (highest first)
// 	sort.Slice(ladder.Resolutions, func(i, j int) bool {
// 		return ladder.Resolutions[i].Width > ladder.Resolutions[j].Width
// 	})

// 	// Remove profiles that are too close to each other
// 	ladder = m.removeRedundantProfiles(inputQuality, ladder)

// 	// Ensure we have a good spread of qualities
// 	ladder = m.ensureQualitySpread(inputQuality, ladder)

// 	// Adjust bitrates based on actual input quality
// 	ladder = m.adjustBitrates(inputQuality, ladder)

// 	log.Printf("✅ Optimized quality ladder: %d profiles", len(ladder.Resolutions))
// 	for i, profile := range ladder.Resolutions {
// 		log.Printf("   %d. %s (%dx%d) %s", i+1, profile.Name, profile.Width, profile.Height, profile.Bitrate)
// 	}

// 	return ladder
// }

// func (m *Manager) removeRedundantProfiles(inputQuality *StreamQuality, ladder *QualityLadder) *QualityLadder {
// 	if len(ladder.Resolutions) <= 2 {
// 		return ladder
// 	}

// 	var optimized []ResolutionProfile
// 	optimized = append(optimized, ladder.Resolutions[0]) // Keep highest quality

// 	// Calculate minimum quality difference (20% of input width)
// 	minDifference := inputQuality.Width / 5

// 	for i := 1; i < len(ladder.Resolutions); i++ {
// 		current := ladder.Resolutions[i]
// 		previous := optimized[len(optimized)-1]

// 		// Check if this resolution is significantly different from the previous one
// 		widthDiff := previous.Width - current.Width
// 		if widthDiff >= minDifference {
// 			optimized = append(optimized, current)
// 		} else {
// 			log.Printf("   🗑️ Removing redundant profile: %s (%dx%d) - too close to %s (%dx%d)",
// 				current.Name, current.Width, current.Height,
// 				previous.Name, previous.Width, previous.Height)
// 		}
// 	}

// 	ladder.Resolutions = optimized
// 	return ladder
// }

// func (m *Manager) ensureQualitySpread(inputQuality *StreamQuality, ladder *QualityLadder) *QualityLadder {
// 	if len(ladder.Resolutions) >= 3 {
// 		return ladder // Already have good spread
// 	}

// 	// Add intermediate qualities if needed
// 	inputWidth := inputQuality.Width
// 	highestWidth := ladder.Resolutions[0].Width
// 	lowestWidth := ladder.Resolutions[len(ladder.Resolutions)-1].Width

// 	// Calculate potential intermediate resolutions
// 	midPoint := (highestWidth + lowestWidth) / 2

// 	// Only add if the gap is significant (> 300 pixels)
// 	if (highestWidth-lowestWidth) > 600 && midPoint < inputWidth {
// 		// Find the closest standard resolution to the midpoint
// 		standardResolutions := []struct {
// 			name   string
// 			width  int
// 			height int
// 		}{
// 			{"540p", 960, 540},
// 			{"576p", 1024, 576},
// 			{"600p", 1066, 600},
// 		}

// 		var bestMatch struct {
// 			name   string
// 			width  int
// 			height int
// 		}
// 		bestDiff := 10000

// 		for _, res := range standardResolutions {
// 			if res.width < inputWidth {
// 				diff := abs(midPoint - res.width)
// 				if diff < bestDiff {
// 					bestDiff = diff
// 					bestMatch = res
// 				}
// 			}
// 		}

// 		if bestMatch.width > 0 {
// 			// Calculate bitrate for intermediate resolution
// 			baseBitrate := 2500000 // 720p base
// 			basePixels := 1280 * 720
// 			profilePixels := bestMatch.width * bestMatch.height
// 			bitrate := (profilePixels * baseBitrate) / basePixels

// 			intermediateProfile := ResolutionProfile{
// 				Name:    bestMatch.name,
// 				Width:   bestMatch.width,
// 				Height:  bestMatch.height,
// 				Bitrate: strconv.Itoa(bitrate/1000) + "k",
// 				Maxrate: strconv.Itoa(int(float64(bitrate)*1.07)/1000) + "k",
// 				Bufsize: strconv.Itoa(bitrate*2/1000) + "k",
// 			}

// 			// Insert at appropriate position
// 			var newProfiles []ResolutionProfile
// 			inserted := false
// 			for _, profile := range ladder.Resolutions {
// 				if !inserted && profile.Width < intermediateProfile.Width {
// 					newProfiles = append(newProfiles, intermediateProfile)
// 					inserted = true
// 					log.Printf("   ➕ Added intermediate profile: %s (%dx%d)",
// 						intermediateProfile.Name, intermediateProfile.Width, intermediateProfile.Height)
// 				}
// 				newProfiles = append(newProfiles, profile)
// 			}
// 			ladder.Resolutions = newProfiles
// 		}
// 	}

// 	return ladder
// }

// func (m *Manager) adjustBitrates(inputQuality *StreamQuality, ladder *QualityLadder) *QualityLadder {
// 	// Adjust bitrates based on actual input resolution and estimated quality
// 	// inputPixels := inputQuality.Width * inputQuality.Height

// 	for i := range ladder.Resolutions {
// 		profile := &ladder.Resolutions[i]
// 		profilePixels := profile.Width * profile.Height

// 		// Base bitrate calculation on 720p = 2500k
// 		baseBitrate := 2500000
// 		basePixels := 1280 * 720

// 		// Calculate proportional bitrate
// 		calculatedBitrate := (profilePixels * baseBitrate) / basePixels

// 		// For non-standard resolutions, use calculated bitrate
// 		if profile.Name == "source" {
// 			calculatedBitrate = inputQuality.Bitrate
// 		}

// 		// Ensure minimum bitrate for watchable quality
// 		minBitrate := 400000 // 400k minimum
// 		if calculatedBitrate < minBitrate {
// 			calculatedBitrate = minBitrate
// 		}

// 		// Update the profile with calculated bitrate
// 		profile.Bitrate = strconv.Itoa(calculatedBitrate/1000) + "k"
// 		profile.Maxrate = strconv.Itoa(int(float64(calculatedBitrate)*1.07)/1000) + "k"
// 		profile.Bufsize = strconv.Itoa(calculatedBitrate*2/1000) + "k"
// 	}

// 	return ladder
// }

// func abs(x int) int {
// 	if x < 0 {
// 		return -x
// 	}
// 	return x
// }

// // Enhanced quality analysis for better resolution detection
// func (m *Manager) EnhancedAnalyzeStreamQuality(conn *rtmp.Conn) (*StreamQuality, error) {
// 	quality, err := m.AnalyzeStreamQuality(conn)
// 	if err != nil {
// 		return quality, err
// 	}

// 	// Map to nearest standard resolution for better categorization
// 	quality = m.mapToStandardResolution(quality)

// 	return quality, nil
// }

// func (m *Manager) mapToStandardResolution(quality *StreamQuality) *StreamQuality {
// 	standardResolutions := []struct {
// 		width       int
// 		height      int
// 		name        string
// 		baseBitrate int
// 	}{
// 		{3840, 2160, "4k", 8000000},
// 		{2560, 1440, "1440p", 6000000},
// 		{1920, 1080, "1080p", 5000000},
// 		{1280, 720, "720p", 2500000},
// 		{1024, 576, "576p", 1500000},
// 		{854, 480, "480p", 1000000},
// 		{640, 360, "360p", 500000},
// 		{426, 240, "240p", 300000},
// 	}

// 	var bestMatch struct {
// 		width       int
// 		height      int
// 		name        string
// 		baseBitrate int
// 	}
// 	bestDiff := 1000000

// 	for _, res := range standardResolutions {
// 		// Calculate difference in total pixels
// 		inputPixels := quality.Width * quality.Height
// 		resPixels := res.width * res.height
// 		diff := abs(inputPixels - resPixels)

// 		// Prefer resolutions that are equal to or smaller than input
// 		if resPixels <= inputPixels && diff < bestDiff {
// 			bestDiff = diff
// 			bestMatch = res
// 		}
// 	}

// 	// If we found a good match and it's within 15% difference, use it
// 	if bestMatch.width > 0 && bestDiff < (inputPixels/7) {
// 		log.Printf("   🎯 Mapped %dx%d to standard resolution: %s",
// 			quality.Width, quality.Height, bestMatch.name)
// 		quality.Resolution = bestMatch.name
// 		quality.Bitrate = bestMatch.baseBitrate
// 	} else {
// 		log.Printf("   🔧 Keeping custom resolution: %dx%d", quality.Width, quality.Height)
// 	}

// 	return quality
// }
