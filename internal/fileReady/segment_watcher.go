package fileReady



import (
    "context"
    "fmt"
    "log"
    "os"
    "path/filepath"
    "strconv"
    "strings"
    "time"

    "github.com/molu/youtube/internal/redis"
)

type SegmentWatcher struct {
    redis      *redis.Client
    streamID   string
    outputDir  string
    ctx        context.Context
    cancel     context.CancelFunc
    lastSegment int
}

func NewSegmentWatcher(redisClient *redis.Client, streamID, outputDir string) *SegmentWatcher {
    ctx, cancel := context.WithCancel(context.Background())
    return &SegmentWatcher{
        redis:      redisClient,
        streamID:   streamID,
        outputDir:  outputDir,
        ctx:        ctx,
        cancel:     cancel,
        lastSegment: -1,
    }
}

func (sw *SegmentWatcher) Start() {
    log.Printf("Starting segment watcher for stream: %s", sw.streamID)
    
    // Mark stream as live in Redis
    if err := sw.redis.MarkStreamLive(sw.streamID); err != nil {
        log.Printf("⚠️ Failed to mark stream as live: %v", err)
    }
    
    go sw.watchForSegments()
}

func (sw *SegmentWatcher) Stop() {
    if sw.cancel != nil {
        sw.cancel()
    }
    
    // Mark stream as complete
    if err := sw.redis.MarkStreamComplete(sw.streamID); err != nil {
        log.Printf("⚠️ Failed to mark stream as complete: %v", err)
    }
    
    log.Printf("Segment watcher stopped for stream: %s", sw.streamID)
}

func (sw *SegmentWatcher) watchForSegments() {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()
    
    for {
        select {
        case <-sw.ctx.Done():
            return
        case <-ticker.C:
            sw.checkForNewSegments()
        }
    }
}

func (sw *SegmentWatcher) checkForNewSegments() {
    // Look for segment files in the output directory
    // FFmpeg creates files like: chunk-stream0-00001.m4s, chunk-stream1-00001.m4s, etc.
    pattern := filepath.Join(sw.outputDir, "chunk-*-*.m4s")
    files, err := filepath.Glob(pattern)
    if err != nil {
        return
    }
    
    for _, file := range files {
        // Parse segment number from filename
        base := filepath.Base(file)
        // Format: chunk-{representation}-{number}.m4s
        parts := strings.Split(base, "-")
        if len(parts) < 3 {
            continue
        }
        
        // Get segment number
        segmentNumStr := strings.TrimSuffix(parts[2], ".m4s")
        segmentNum, err := strconv.Atoi(segmentNumStr)
        if err != nil {
            continue
        }
        
        // Check if this segment is newer than what we've seen
        if segmentNum > sw.lastSegment {
            // Check if file is complete (not being written)
            if sw.isSegmentFileReady(file) {
                // Notify Redis about this segment
                if err := sw.redis.PublishSegmentReady(sw.streamID, segmentNum); err != nil {
                    log.Printf("⚠️ Failed to notify segment ready: %v", err)
                } else {
                    log.Printf("✅ Published segment %d ready notification for stream %s", 
                        segmentNum, sw.streamID)
                    sw.lastSegment = segmentNum
                }
            }
        }
    }
}

func (sw *SegmentWatcher) isSegmentFileReady(path string) bool {
    info, err := os.Stat(path)
    if err != nil {
        return false
    }
    
    if info.Size() == 0 {
        return false
    }
    
    // Check if file size is stable
    initialSize := info.Size()
    time.Sleep(50 * time.Millisecond)
    
    info2, err := os.Stat(path)
    if err != nil {
        return false
    }
    
    return info2.Size() == initialSize
}

// GetSegmentPath returns the path to a specific segment
func (sw *SegmentWatcher) GetSegmentPath(representationID string, segmentNum int) string {
    // Format: chunk-stream{representationID}-{segmentNum:05d}.m4s
    filename := fmt.Sprintf("chunk-stream%s-%05d.m4s", representationID, segmentNum)
    return filepath.Join(sw.outputDir, filename)
}