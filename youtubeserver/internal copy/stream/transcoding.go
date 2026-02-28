package stream

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/nareix/joy4/format/flv"
	"github.com/nareix/joy4/format/rtmp"
)

func (m *Manager) StartFFmpegTranscoding(ctx context.Context, streamID, outputDir string, conn *rtmp.Conn) {
	dbCtx := context.Background()
	log.Printf("🎬 Starting FFmpeg transcoding for stream %s", streamID)

	quality, err := m.queries.GetConnectionQuality(dbCtx, streamID)
	if err != nil {
		quality = "good"
	}

	preset := "veryfast"
	if quality == "poor" {
		preset = "ultrafast"
	}

	cmd := exec.CommandContext(ctx, "ffmpeg",
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
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:0", "1920x1080", "-b:v:0", "5000k", "-maxrate:v:0", "5350k", "-bufsize:v:0", "10000k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:1", "1280x720", "-b:v:1", "2800k", "-maxrate:v:1", "2996k", "-bufsize:v:1", "5600k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:2", "854x480", "-b:v:2", "1400k", "-maxrate:v:2", "1498k", "-bufsize:v:2", "2800k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:3", "640x360", "-b:v:3", "600k", "-maxrate:v:3", "642k", "-bufsize:v:3", "1200k",
		"-map", "0:v:0", "-map", "0:a:0",
		"-s:v:4", "426x240", "-b:v:4", "300k", "-maxrate:v:4", "321k", "-bufsize:v:4", "600k",
		"-f", "dash",
		"-seg_duration", "2",
		"-use_template", "1",
		"-use_timeline", "1",
		"-streaming", "1",
		"-ldash", "1",
		"-window_size", "5",
		"-extra_window_size", "10",
		"-adaptation_sets", "id=0,streams=v id=1,streams=a",
		"-utc_timing_url", "https://time.akamai.com/?iso",
		fmt.Sprintf("%s/manifest.mpd", outputDir),
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		log.Printf("❌ Failed to create stdin pipe: %v", err)
		session, _ := m.GetSession(streamID)
		m.HandleDisconnection(streamID, session)
		return
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		log.Printf("❌ FFmpeg start error: %v", err)
		session, _ := m.GetSession(streamID)
		m.HandleDisconnection(streamID, session)
		return
	}
	log.Printf("✅ FFmpeg started with PID: %d", cmd.Process.Pid)

	go func() {
		defer stdin.Close()

		streams, err := conn.Streams()
		if err != nil {
			log.Printf("❌ Failed to get streams: %v", err)
			return
		}

		flvMuxer := flv.NewMuxer(stdin)

		if err := flvMuxer.WriteHeader(streams); err != nil {
			log.Printf("❌ Failed to write FLV header: %v", err)
			return
		}

		for {
			pkt, err := conn.ReadPacket()
			if err != nil {
				log.Printf("📺 Stream %s ended: %v", streamID, err)
				break
			}

			if err := flvMuxer.WritePacket(pkt); err != nil {
				log.Printf("❌ Failed to write packet: %v", err)
				break
			}
		}

		flvMuxer.WriteTrailer()
		log.Printf("✅ Stream data copy completed for %s", streamID)
	}()

	err = cmd.Wait()
	if err != nil {
		if ctx.Err() == context.Canceled {
			log.Printf("✅ FFmpeg stopped gracefully for stream %s", streamID)
		} else {
			log.Printf("❌ FFmpeg exited with error: %v", err)
			session, _ := m.GetSession(streamID)
			m.HandleDisconnection(streamID, session)
		}
	}
}