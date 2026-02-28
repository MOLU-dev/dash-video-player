package stream

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"

	"github.com/nareix/joy4/format/flv"
	"github.com/nareix/joy4/format/rtmp"
)

func (m *Manager) StartFFmpegTranscoding(ctx context.Context, streamID, outputDir string, conn *rtmp.Conn) {
	//dbCtx := context.Background()
	log.Printf("Starting FFmpeg transcoding for stream %s", streamID)

	// Analyze incoming stream quality first
	quality, err := m.AnalyzeStreamQuality(conn)
	if err != nil {
		log.Printf("Failed to analyze stream quality: %v, using defaults", err)
		quality = &StreamQuality{
			Width:      1280,
			Height:     720,
			Bitrate:    2500000,
			Resolution: "720p",
		}
	}

	// Generate appropriate quality ladder (no upscaling)
	ladder := m.GenerateQualityLadder(quality)

	// Determine encoding preset based on input quality
	preset := m.getOptimalPreset(quality)

	log.Printf("Using encoding preset: %s for %s input", preset, quality.Resolution)

	// Build FFmpeg command with dynamic quality ladder
	args := []string{
		"-re",
		"-i", "pipe:0",
		"-c:v", "libx264",
		"-preset", preset,
		"-tune", "zerolatency",
		"-g", "60",
		"-keyint_min", "60",
		"-sc_threshold", "0",
		"-profile:v", "high",
		"-level", "4.0",
		// Audio settings - single audio stream
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
		"-map", "0:a:0", // Map only the first audio stream from input
	}

	// Add video streams for each quality profile
	for i, profile := range ladder.Resolutions {
		args = append(args,
			"-map", "0:v:0", // Map video for each quality
			"-s:v:"+strconv.Itoa(i), fmt.Sprintf("%dx%d", profile.Width, profile.Height),
			"-b:v:"+strconv.Itoa(i), profile.Bitrate,
			"-maxrate:v:"+strconv.Itoa(i), profile.Maxrate,
			"-bufsize:v:"+strconv.Itoa(i), profile.Bufsize,
		)
	}

	// Add DASH output configuration
	// Calculate stream indices: audio stream index = number of video streams
	videoStreamCount := len(ladder.Resolutions)
	adaptationSets := fmt.Sprintf("id=0,streams=v id=1,streams=a:%d", videoStreamCount)

	args = append(args,
    "-f", "dash",
    "-seg_duration", "2",
    "-use_template", "1",
    "-use_timeline", "1",
    "-streaming", "1",
    "-ldash", "1",
    "-window_size", "5",
    "-extra_window_size", "10",

    "-representation_id", "0",

    // Video naming
    "-init_seg_name:v", "video_$RepresentationID$_dashinit.$ext$",
    "-media_seg_name:v", "video_$RepresentationID$_dash$Number$.$ext$",

    // Audio naming
    "-init_seg_name:a", "audio_dashinit.$ext$",
    "-media_seg_name:a", "audio_dash$Number$.$ext$",

    "-adaptation_sets", adaptationSets,
    "-utc_timing_url", "https://time.akamai.com/?iso",

    fmt.Sprintf("%s/manifest.mpd", outputDir),
)


	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		log.Printf("Failed to create stdin pipe: %v", err)
		session, _ := m.GetSession(streamID)
		m.HandleDisconnection(streamID, session)
		return
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		log.Printf("FFmpeg start error: %v", err)
		session, _ := m.GetSession(streamID)
		m.HandleDisconnection(streamID, session)
		return
	}
	log.Printf("FFmpeg started with PID: %d, %d quality profiles", cmd.Process.Pid, len(ladder.Resolutions))

	go func() {
		defer stdin.Close()

		streams, err := conn.Streams()
		if err != nil {
			log.Printf("Failed to get streams: %v", err)
			return
		}

		flvMuxer := flv.NewMuxer(stdin)

		if err := flvMuxer.WriteHeader(streams); err != nil {
			log.Printf("Failed to write FLV header: %v", err)
			return
		}

		for {
			pkt, err := conn.ReadPacket()
			if err != nil {
				log.Printf("📺 Stream %s ended: %v", streamID, err)
				break
			}

			if err := flvMuxer.WritePacket(pkt); err != nil {
				log.Printf("Failed to write packet: %v", err)
				break
			}
		}

		flvMuxer.WriteTrailer()
		log.Printf("Stream data copy completed for %s", streamID)
	}()

	err = cmd.Wait()
	if err != nil {
		if ctx.Err() == context.Canceled {
			log.Printf("FFmpeg stopped gracefully for stream %s", streamID)
		} else {
			log.Printf("FFmpeg exited with error: %v", err)
			session, _ := m.GetSession(streamID)
			m.HandleDisconnection(streamID, session)
		}
	}
}

func (m *Manager) getOptimalPreset(quality *StreamQuality) string {
	// Use faster presets for higher resolutions to reduce CPU load
	switch {
	case quality.Width >= 3840 || quality.Height >= 2160: // 4K
		return "medium"
	case quality.Width >= 1920 || quality.Height >= 1080: // 1080p
		return "fast"
	case quality.Width >= 1280 || quality.Height >= 720: // 720p
		return "faster"
	default: // 480p and below
		return "veryfast"
	}
}
