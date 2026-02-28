import { useCallback } from "react";
import type {
  MediaType,
  Representation,
} from "../../../src/types/player.types";
import { getSegmentNumber } from "../../../src/utils/playerHelpers";
import {
  removeBufferRange,
  appendBufferSafely,
} from "../../../src/utils/bufferHelpers";

interface UseSeekHandlerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  lastSeekTimeRef: React.RefObject<number>;
  isSeekingRef: React.RefObject<boolean>;
  lastStallTimeRef: React.RefObject<number>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  pendingAppendsRef: React.RefObject<{
    video: { segmentNumber: number; duration: number }[];
    audio: { segmentNumber: number; duration: number }[];
  }>;
  pendingSegmentOperationsRef: React.RefObject<
    Map<number, { repId: string; mediaType: string }>
  >;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  operationQueuesRef: React.RefObject<any>;
  abortAllRequests: () => void;
  completeOngoingSegmentOperations: (mediaType: MediaType) => Promise<void>;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch: boolean
  ) => void;
  videoId: string;
}

export function useSeekHandler({
  videoRef,
  lastSeekTimeRef,
  isSeekingRef,
  lastStallTimeRef,
  videoSbRef,
  audioSbRef,
  videoRepRef,
  audioRepRef,
  videoNextSegRef,
  audioNextSegRef,
  videoFinishedRef,
  audioFinishedRef,
  currentVideoInitSegmentRef,
  currentAudioInitSegmentRef,
  lastProcessedSegmentsRef,
  pendingAppendsRef,
  pendingSegmentOperationsRef,
  isFetchingVideoRef,
  isFetchingAudioRef,
  operationQueuesRef,
  abortAllRequests,
  completeOngoingSegmentOperations,
  enqueueOperation,
  fetchNextSegment,
  videoId,
}: UseSeekHandlerProps) {
  // Helper: Check if time is within buffered range
  function isTimeBuffered(
    buffered: TimeRanges,
    time: number,
    tolerance = 0.1
  ): boolean {
    for (let i = 0; i < buffered.length; i++) {
      if (
        time >= buffered.start(i) - tolerance &&
        time <= buffered.end(i) + tolerance
      ) {
        return true;
      }
    }
    return false;
  }

  // Helper: Get buffer ahead from a specific time
  function getBufferAhead(buffered: TimeRanges, time: number): number {
    for (let i = 0; i < buffered.length; i++) {
      if (time >= buffered.start(i) && time < buffered.end(i)) {
        return buffered.end(i) - time;
      }
    }
    return 0;
  }

  // Helper: Check if there's a continuous buffer between two points
  function isContinuouslyBuffered(
    buffered: TimeRanges,
    startTime: number,
    endTime: number
  ): boolean {
    const [start, end] =
      startTime < endTime ? [startTime, endTime] : [endTime, startTime];

    // Find a buffer range that contains both points
    for (let i = 0; i < buffered.length; i++) {
      const rangeStart = buffered.start(i);
      const rangeEnd = buffered.end(i);

      if (start >= rangeStart - 0.1 && end <= rangeEnd + 0.1) {
        return true; // Both points in same continuous buffer
      }
    }
    return false;
  }

  // Helper: Determine if buffer should be preserved
  function shouldPreserveBuffer(
    videoSb: SourceBuffer,
    audioSb: SourceBuffer,
    currentTime: number,
    seekTime: number
  ): {
    shouldPreserve: boolean;
    reason: string;
  } {
    // Check if seek destination is buffered
    const videoDestBuffered = isTimeBuffered(videoSb.buffered, seekTime);
    const audioDestBuffered = isTimeBuffered(audioSb.buffered, seekTime);

    if (!videoDestBuffered || !audioDestBuffered) {
      return {
        shouldPreserve: false,
        reason: "seek destination not buffered",
      };
    }

    // Check buffer ahead at destination (need at least 5s)
    const videoAhead = getBufferAhead(videoSb.buffered, seekTime);
    const audioAhead = getBufferAhead(audioSb.buffered, seekTime);

    if (videoAhead < 5.0 || audioAhead < 5.0) {
      return {
        shouldPreserve: false,
        reason: `insufficient buffer ahead (video: ${videoAhead.toFixed(
          1
        )}s, audio: ${audioAhead.toFixed(1)}s)`,
      };
    }

    // Check if buffer is continuous between current and seek position
    const videoContinuous = isContinuouslyBuffered(
      videoSb.buffered,
      currentTime,
      seekTime
    );
    const audioContinuous = isContinuouslyBuffered(
      audioSb.buffered,
      currentTime,
      seekTime
    );

    if (!videoContinuous || !audioContinuous) {
      return {
        shouldPreserve: false,
        reason: "gaps detected between current position and seek destination",
      };
    }

    return {
      shouldPreserve: true,
      reason: "all conditions met for safe buffer preservation",
    };
  }

  // Helper: Ensure buffer ahead after seek
  function ensureBufferAhead(
    seekTime: number,
    videoRep: Representation,
    audioRep: Representation
  ) {
    const videoSb = videoSbRef.current;
    const audioSb = audioSbRef.current;

    if (!videoSb || !audioSb) return;

    const videoAhead = getBufferAhead(videoSb.buffered, seekTime);
    const audioAhead = getBufferAhead(audioSb.buffered, seekTime);

    const targetBuffer = 15.0;
    const emergencyBuffer = 5.0;

    if (videoAhead < emergencyBuffer || audioAhead < emergencyBuffer) {
      console.log(
        `📦 Ensuring buffer ahead: video=${videoAhead.toFixed(
          1
        )}s, audio=${audioAhead.toFixed(1)}s`
      );

      // Fetch video segments
      if (videoAhead < emergencyBuffer && videoRepRef.current) {
        const segmentDuration = videoRep.segmentDur / videoRep.timescale;
        const segmentsToFetch = Math.min(
          3,
          Math.ceil((targetBuffer - videoAhead) / segmentDuration)
        );

        for (let i = 0; i < segmentsToFetch; i++) {
          if (
            videoNextSegRef.current <=
            videoRep.startNumber + videoRep.totalSegments - 1
          ) {
            fetchNextSegment(
              videoId,
              videoRep,
              "video",
              videoSb,
              videoNextSegRef,
              videoFinishedRef,
              false
            );
          }
        }
      }

      // Fetch audio segment
      if (audioAhead < emergencyBuffer && audioRepRef.current) {
        fetchNextSegment(
          videoId,
          audioRep,
          "audio",
          audioSb,
          audioNextSegRef,
          audioFinishedRef,
          false
        );
      }
    }
  }

  const resetStreamForSeek = useCallback(
    async (time: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      console.log(`\n🎯 SEEK REQUESTED to ${time.toFixed(2)}s`);

      // Debounce check - prevent rapid seeks
      if (Date.now() - lastSeekTimeRef.current < 300) {
        console.log("⏸️ Seek debounced (too soon)");
        return;
      }
      lastSeekTimeRef.current = Date.now();

      // Already seeking check
      if (isSeekingRef.current) {
        console.log("⏸️ Seek operation already in progress");
        return;
      }

      isSeekingRef.current = true;
      lastStallTimeRef.current = Date.now();

      const seekingTimeout = setTimeout(() => {
        if (isSeekingRef.current) {
          console.warn("⚠️ Seeking timeout - resetting seeking state");
          isSeekingRef.current = false;
        }
      }, 10000);

      try {
        // Store the current playback time BEFORE cleanup
        const currentTime = videoEl.currentTime;
        const wasPaused = videoEl.paused;

        console.log(
          `📍 Current position: ${currentTime.toFixed(
            2
          )}s, Target: ${time.toFixed(2)}s`
        );

        // Cleanup
        abortAllRequests();
        operationQueuesRef.current = {
          video: [],
          audio: [],
          videoProcessing: false,
          audioProcessing: false,
        };

        isFetchingVideoRef.current = false;
        isFetchingAudioRef.current = false;
        pendingAppendsRef.current = { video: [], audio: [] };
        pendingSegmentOperationsRef.current.clear();

        // Get references
        const videoSb = videoSbRef.current;
        const audioSb = audioSbRef.current;
        const videoRep = videoRepRef.current;
        const audioRep = audioRepRef.current;

        if (!videoSb || !audioSb || !videoRep || !audioRep) {
          console.log("❌ Missing required references");
          isSeekingRef.current = false;
          return;
        }

        console.log("✅ All references available, proceeding with seek");

        // Wait for ongoing operations
        await Promise.all([
          completeOngoingSegmentOperations("video"),
          completeOngoingSegmentOperations("audio"),
        ]);

        const seekDirection =
          time > currentTime
            ? "FORWARD"
            : time < currentTime
            ? "BACKWARD"
            : "SAME";

        // Log analysis
        console.log("=== SEEK ANALYSIS START ===");
        console.log(
          `Seeking from ${currentTime.toFixed(2)}s to ${time.toFixed(2)}s`
        );
        console.log(`Direction: ${seekDirection}`);

        console.log("📊 Video buffer ranges:");
        for (let i = 0; i < videoSb.buffered.length; i++) {
          console.log(
            `  [${videoSb.buffered.start(i).toFixed(2)}s - ${videoSb.buffered
              .end(i)
              .toFixed(2)}s]`
          );
        }

        console.log("📊 Audio buffer ranges:");
        for (let i = 0; i < audioSb.buffered.length; i++) {
          console.log(
            `  [${audioSb.buffered.start(i).toFixed(2)}s - ${audioSb.buffered
              .end(i)
              .toFixed(2)}s]`
          );
        }

        // Determine buffer preservation
        const { shouldPreserve, reason } = shouldPreserveBuffer(
          videoSb,
          audioSb,
          currentTime,
          time
        );

        console.log(
          `DECISION: ${
            shouldPreserve ? "🟢 PRESERVE BUFFER" : "🔴 CLEAR BUFFER"
          }`
        );
        console.log(`REASON: ${reason}`);
        console.log("=== SEEK ANALYSIS END ===\n");

        // Clear buffer if needed
        if (!shouldPreserve) {
          console.log("🗑️ Clearing buffers...");

          await Promise.all([
            enqueueOperation("video", async () => {
              await removeBufferRange(videoSb, 0, Infinity);
            }),
            enqueueOperation("audio", async () => {
              await removeBufferRange(audioSb, 0, Infinity);
            }),
          ]);

          await new Promise((resolve) => setTimeout(resolve, 200));

          // Re-append init segments
          if (currentVideoInitSegmentRef.current) {
            await enqueueOperation("video", () =>
              appendBufferSafely(videoSb, currentVideoInitSegmentRef.current!)
            );
          }

          if (currentAudioInitSegmentRef.current) {
            await enqueueOperation("audio", () =>
              appendBufferSafely(audioSb, currentAudioInitSegmentRef.current!)
            );
          }
        }

        // Calculate which segment contains the seek time
        const targetSegment = getSegmentNumber(videoRep, time);
        const segmentDuration = videoRep.segmentDur / videoRep.timescale;

        // Calculate the exact start time of that segment to avoid buffering ahead of playhead
        const segmentStartTime =
          (targetSegment - videoRep.startNumber) * segmentDuration;

        console.log(
          `🎬 Target segment: ${targetSegment}, segment starts at: ${segmentStartTime.toFixed(
            2
          )}s`
        );

        // Update segment counters
        videoNextSegRef.current = targetSegment;
        audioNextSegRef.current = getSegmentNumber(audioRep, time);
        videoFinishedRef.current = false;
        audioFinishedRef.current = false;

        lastProcessedSegmentsRef.current.set(videoRep.id, targetSegment - 1);
        lastProcessedSegmentsRef.current.set(
          audioRep.id,
          audioNextSegRef.current - 1
        );

        console.log(
          `📍 Seek to ${time.toFixed(
            2
          )}s - Starting from video segment ${targetSegment}, audio segment ${
            audioNextSegRef.current
          }`
        );

        // CRITICAL: Set the video currentTime FIRST before fetching segments
        // This ensures the playhead is at the correct position when segments arrive
        videoEl.currentTime = time;
        console.log(`⏰ Set video.currentTime to ${time.toFixed(2)}s`);

        // Wait a frame for the seek to register
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Fetch segments
        if (!shouldPreserve) {
          // Buffer cleared - fetch initial segments
          console.log("🚀 Starting segment fetch after buffer clear");

          // Use setTimeout to ensure segments fetch AFTER currentTime is set
          setTimeout(() => {
            // Fetch 2-3 segments ahead
            const segmentsToFetch = 3;
            for (let i = 0; i < segmentsToFetch; i++) {
              if (
                videoNextSegRef.current <=
                videoRep.startNumber + videoRep.totalSegments - 1
              ) {
                fetchNextSegment(
                  videoId,
                  videoRep,
                  "video",
                  videoSb,
                  videoNextSegRef,
                  videoFinishedRef,
                  false
                );
              }
            }

            // Fetch corresponding audio
            fetchNextSegment(
              videoId,
              audioRep,
              "audio",
              audioSb,
              audioNextSegRef,
              audioFinishedRef,
              false
            );
          }, 50);
        } else {
          console.log("🔄 Buffer preserved, ensuring adequate buffer ahead");
          ensureBufferAhead(time, videoRep, audioRep);
        }

        // Resume playback if it wasn't paused before seek
        if (!wasPaused) {
          setTimeout(() => {
            videoEl
              .play()
              .catch((err) => console.error("Play after seek failed:", err));
          }, 100);
        }
      } catch (error) {
        console.error("❌ Error during seek reset:", error);
      } finally {
        clearTimeout(seekingTimeout);
        // Keep seeking flag for a bit longer to prevent immediate re-seeks
        setTimeout(() => {
          isSeekingRef.current = false;
          console.log("✅ Seek operation completed");
        }, 500);
      }
    },
    [
      videoRef,
      lastSeekTimeRef,
      isSeekingRef,
      lastStallTimeRef,
      videoSbRef,
      audioSbRef,
      videoRepRef,
      audioRepRef,
      videoNextSegRef,
      audioNextSegRef,
      videoFinishedRef,
      audioFinishedRef,
      currentVideoInitSegmentRef,
      currentAudioInitSegmentRef,
      lastProcessedSegmentsRef,
      pendingAppendsRef,
      pendingSegmentOperationsRef,
      isFetchingVideoRef,
      isFetchingAudioRef,
      operationQueuesRef,
      abortAllRequests,
      completeOngoingSegmentOperations,
      enqueueOperation,
      fetchNextSegment,
      videoId,
    ]
  );

  return { resetStreamForSeek };
}
