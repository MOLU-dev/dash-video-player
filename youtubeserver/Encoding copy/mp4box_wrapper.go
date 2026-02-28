package encoding

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"os/exec"

	process "github.com/molu/youtube/process"
)

func RunMP4BoxWithDetailedProgress(
	ctx context.Context,
	videoID string,
	cmdArgs []string,
	progressCh chan<- *process.ProgressResponse,
) error {
	cmd := exec.CommandContext(ctx, "MP4Box", cmdArgs...)

	// Get stderr for progress
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start MP4Box: %w", err)
	}

	// Create a custom reader that handles carriage returns properly
	reader := NewCarriageReturnReader(stderr)
	scanner := bufio.NewScanner(reader)

	// MP4Box can emit fairly long lines depending on status — bump buffer if needed.
	// Adjust the second arg (max token size) if you see "token too long" errors.
	scanner.Buffer(make([]byte, 64*1024), 10*1024*1024)

	parser := NewMP4BoxProgressParser()
	lastReported := -1

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			// ensure process terminates when context cancelled
			_ = cmd.Process.Kill()
			return ctx.Err()
		default:
		}

		line := scanner.Text()
		if progress, ok := parser.Parse(line); ok {
			current := int(progress + 0.5)

			// Only send if progress advanced by at least 1%
			if current > lastReported {
				select {
				case progressCh <- &process.ProgressResponse{
					VideoId:         videoID,
					ProgressPercent: progress,
					Message:         fmt.Sprintf("MP4Box packaging: %d%%", current),
				}:
					lastReported = current
				case <-ctx.Done():
					_ = cmd.Process.Kill()
					return ctx.Err()
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		_ = cmd.Process.Kill()
		return fmt.Errorf("reading MP4Box output: %w", err)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("MP4Box failed: %w", err)
	}

	// Send final completion (best-effort)
	select {
	case progressCh <- &process.ProgressResponse{
		VideoId:         videoID,
		ProgressPercent: 100,
		Message:         "MP4Box packaging completed",
	}:
	case <-ctx.Done():
	}

	return nil
}

// CarriageReturnReader handles MP4Box's carriage return-based output
type CarriageReturnReader struct {
	reader io.Reader
	buffer []byte
}

func NewCarriageReturnReader(reader io.Reader) *CarriageReturnReader {
	return &CarriageReturnReader{
		reader: reader,
		buffer: make([]byte, 0, 4096),
	}
}

func (cr *CarriageReturnReader) Read(p []byte) (int, error) {
	// If we have buffered processed data, return it first.
	if len(cr.buffer) > 0 {
		n := copy(p, cr.buffer)
		cr.buffer = cr.buffer[n:]
		return n, nil
	}

	// Read raw bytes from underlying reader
	tmp := make([]byte, 4096)
	n, err := cr.reader.Read(tmp)
	if n > 0 {
		processed := cr.processCarriageReturns(tmp[:n])

		// Copy as much as fits into p, keep the rest in buffer
		ncopy := copy(p, processed)
		if ncopy < len(processed) {
			// store remainder
			cr.buffer = append(cr.buffer, processed[ncopy:]...)
		}
		return ncopy, nil
	}

	// If no bytes were read, propagate error (could be EOF or temporary)
	if err != nil {
		return 0, err
	}
	return 0, nil
}

func (cr *CarriageReturnReader) processCarriageReturns(data []byte) []byte {
	// Normalize CRLF and CR to single LF, then collapse double newlines
	processed := bytes.ReplaceAll(data, []byte("\r\n"), []byte("\n"))
	processed = bytes.ReplaceAll(processed, []byte{'\r'}, []byte{'\n'})

	// Collapse multiple consecutive newlines into a single newline to avoid blank lines
	for bytes.Contains(processed, []byte("\n\n")) {
		processed = bytes.ReplaceAll(processed, []byte("\n\n"), []byte("\n"))
	}
	return processed
}
