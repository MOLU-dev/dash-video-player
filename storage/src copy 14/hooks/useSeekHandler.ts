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

export function useSeekHandler(props: UseSeekHandlerProps) {
  const {
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
  } = props;

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

    for (let i = 0; i < buffered.length; i++) {
      const rangeStart = buffered.start(i);
      const rangeEnd = buffered.end(i);

      if (start >= rangeStart - 0.1 && end <= rangeEnd + 0.1) {
        return true;
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
    const videoDestBuffered = isTimeBuffered(videoSb.buffered, seekTime);
    const audioDestBuffered = isTimeBuffered(audioSb.buffered, seekTime);

    if (!videoDestBuffered || !audioDestBuffered) {
      return {
        shouldPreserve: false,
        reason: "seek destination not buffered",
      };
    }

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

  // Helper: Wait for SourceBuffer to be ready
  async function waitForSourceBufferReady(
    sb: SourceBuffer,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (sb.updating) {
      if (Date.now() - startTime > timeout) {
        throw new Error("SourceBuffer timeout waiting for ready state");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Helper: Completely clear all pending operations
  function clearAllPendingOperations() {
    console.log("🧹 Clearing all pending operations...");

    // Clear pending appends
    pendingAppendsRef.current.video = [];
    pendingAppendsRef.current.audio = [];

    // Clear operation queues
    operationQueuesRef.current.video = [];
    operationQueuesRef.current.audio = [];
    operationQueuesRef.current.videoProcessing = false;
    operationQueuesRef.current.audioProcessing = false;

    // Clear segment operations
    pendingSegmentOperationsRef.current.clear();

    // Reset fetching flags
    isFetchingVideoRef.current = false;
    isFetchingAudioRef.current = false;

    console.log("✅ All pending operations cleared");
  }

  const resetStreamForSeek = useCallback(
    async (time: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      console.log(`\n🎯 SEEK REQUESTED to ${time.toFixed(2)}s`);

      // Debounce check
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
        const currentTime = videoEl.currentTime;
        const wasPaused = videoEl.paused;

        console.log(
          `📍 Current position: ${currentTime.toFixed(
            2
          )}s, Target: ${time.toFixed(2)}s`
        );

        // STEP 1: Abort all ongoing requests FIRST
        console.log("🛑 Step 1: Aborting all requests");
        abortAllRequests();

        // STEP 2: Clear all pending operations immediately
        console.log("🧹 Step 2: Clearing pending operations");
        clearAllPendingOperations();

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

        // STEP 3: Wait for any in-progress SourceBuffer operations to complete
        console.log(
          "⏳ Step 3: Waiting for SourceBuffer operations to complete"
        );
        try {
          await Promise.all([
            waitForSourceBufferReady(videoSb),
            waitForSourceBufferReady(audioSb),
          ]);
        } catch (error) {
          console.warn(
            "⚠️ Timeout waiting for SourceBuffers, proceeding anyway"
          );
        }

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

        // STEP 4: Clear buffer if needed
        if (!shouldPreserve) {
          console.log("🗑️ Step 4: Clearing buffers completely...");

          // Wait for SourceBuffers to be ready before clearing
          await Promise.all([
            waitForSourceBufferReady(videoSb),
            waitForSourceBufferReady(audioSb),
          ]);

          // Clear video buffer using direct SourceBuffer API
          if (!videoSb.updating && videoSb.buffered.length > 0) {
            try {
              console.log("Removing video buffer range [0, ∞]");
              videoSb.remove(0, Infinity);
              await new Promise<void>((resolve) => {
                const handler = () => {
                  videoSb.removeEventListener("updateend", handler);
                  resolve();
                };
                videoSb.addEventListener("updateend", handler);
              });
            } catch (error) {
              console.error("Error clearing video buffer:", error);
            }
          }

          // Clear audio buffer using direct SourceBuffer API
          if (!audioSb.updating && audioSb.buffered.length > 0) {
            try {
              console.log("Removing audio buffer range [0, ∞]");
              audioSb.remove(0, Infinity);
              await new Promise<void>((resolve) => {
                const handler = () => {
                  audioSb.removeEventListener("updateend", handler);
                  resolve();
                };
                audioSb.addEventListener("updateend", handler);
              });
            } catch (error) {
              console.error("Error clearing audio buffer:", error);
            }
          }

          // Wait a bit for cleanup
          await new Promise((resolve) => setTimeout(resolve, 200));

          // STEP 5: Re-append init segments
          console.log("📦 Step 5: Re-appending init segments");

          if (currentVideoInitSegmentRef.current) {
            await waitForSourceBufferReady(videoSb);
            await enqueueOperation("video", () =>
              appendBufferSafely(videoSb, currentVideoInitSegmentRef.current!)
            );
          }

          if (currentAudioInitSegmentRef.current) {
            await waitForSourceBufferReady(audioSb);
            await enqueueOperation("audio", () =>
              appendBufferSafely(audioSb, currentAudioInitSegmentRef.current!)
            );
          }

          // Wait for init segments to be appended
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // STEP 6: Calculate target segment
        console.log("🎬 Step 6: Calculating target segments");
        const targetSegment = getSegmentNumber(videoRep, time);
        const segmentDuration = videoRep.segmentDur / videoRep.timescale;
        const segmentStartTime =
          (targetSegment - videoRep.startNumber) * segmentDuration;

        console.log(
          `Target segment: ${targetSegment}, segment starts at: ${segmentStartTime.toFixed(
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

        // STEP 7: Set video currentTime
        console.log("⏰ Step 7: Setting video.currentTime");
        videoEl.currentTime = time;

        // Wait for seek to register
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // STEP 8: Fetch segments
        console.log("🚀 Step 8: Starting segment fetch");

        if (!shouldPreserve) {
          setTimeout(() => {
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
        }

        // Resume playback if needed
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
