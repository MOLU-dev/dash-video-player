import { useCallback } from "react";
import type { MediaType, Representation } from "./src/types/player.types";
import { getSegmentNumber } from "./src/utils/playerHelpers";
import {
  removeBufferRange,
  appendBufferSafely,
} from "./src/utils/bufferHelpers";
import { BUFFER_KEEP_BEHIND } from "./src/constants/player.constants";

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
  lastPlayheadPositionRef: React.RefObject<number>;
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
  lastPlayheadPositionRef,
}: UseSeekHandlerProps) {
  // Check if seeking backwards within buffered range
  function isSeekingBackwardsInBuffer(
    currentTime: number,
    seekTime: number,
    sb: SourceBuffer
  ): boolean {
    if (seekTime >= currentTime) return false; // Not backwards

    const buffered = sb.buffered;
    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);

      // Check if seek position is within this buffered range
      if (seekTime >= start - 0.1 && seekTime <= end + 0.1) {
        // Also check if current position is in same range (backwards seek within same buffer)
        if (currentTime >= start - 0.1 && currentTime <= end + 0.1) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if the seek position is already properly buffered
  async function isSeekPositionBuffered(
    videoEl: HTMLVideoElement,
    videoSb: SourceBuffer,
    audioSb: SourceBuffer,
    seekTime: number
  ): Promise<boolean> {
    try {
      const videoBuffered = videoSb.buffered;
      const audioBuffered = audioSb.buffered;

      const isVideoBuffered = isTimeInBufferedRange(videoBuffered, seekTime);
      const isAudioBuffered = isTimeInBufferedRange(audioBuffered, seekTime);

      if (!isVideoBuffered || !isAudioBuffered) {
        return false;
      }

      // Check if we have sufficient buffer ahead (at least 5 seconds)
      const videoBufferAhead = getBufferAhead(videoBuffered, seekTime);
      const audioBufferAhead = getBufferAhead(audioBuffered, seekTime);

      const minBufferAhead = 5.0; // seconds
      return (
        videoBufferAhead >= minBufferAhead && audioBufferAhead >= minBufferAhead
      );
    } catch (error) {
      console.warn("Error checking buffer state, defaulting to clear:", error);
      return false;
    }
  }

  function isTimeInBufferedRange(buffered: TimeRanges, time: number): boolean {
    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);
      if (time >= start - 0.1 && time <= end + 0.1) {
        return true;
      }
    }
    return false;
  }

  function getBufferAhead(buffered: TimeRanges, currentTime: number): number {
    let maxAhead = 0;
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime < buffered.end(i)) {
        maxAhead = Math.max(maxAhead, buffered.end(i) - currentTime);
      }
    }
    return maxAhead;
  }

  // Check if there are gaps in the buffer between two time points
  function hasGapBetween(
    start: number,
    end: number,
    buffered: TimeRanges
  ): boolean {
    const sortedStart = Math.min(start, end);
    const sortedEnd = Math.max(start, end);

    // If the range spans multiple buffered regions, there must be gaps
    let coveredStart = false;
    let coveredEnd = false;
    let foundGap = false;

    for (let i = 0; i < buffered.length; i++) {
      const bufStart = buffered.start(i);
      const bufEnd = buffered.end(i);

      // Check if this buffer range overlaps with our seek range
      if (bufStart <= sortedEnd && bufEnd >= sortedStart) {
        // Check if start or end point is in this range
        if (sortedStart >= bufStart - 0.1 && sortedStart <= bufEnd + 0.1) {
          coveredStart = true;
        }
        if (sortedEnd >= bufStart - 0.1 && sortedEnd <= bufEnd + 0.1) {
          coveredEnd = true;
        }

        // If we've seen coverage before and now there's a new range, there was a gap
        if (i > 0 && (coveredStart || coveredEnd)) {
          const prevEnd = buffered.end(i - 1);
          if (prevEnd < bufStart - 0.1) {
            foundGap = true;
          }
        }
      }
    }

    // If both points are covered but not in continuous buffer, there's a gap
    if (coveredStart && coveredEnd && buffered.length > 1) {
      // Check if both points are in the same buffer range
      let inSameRange = false;
      for (let i = 0; i < buffered.length; i++) {
        const bufStart = buffered.start(i);
        const bufEnd = buffered.end(i);
        if (sortedStart >= bufStart - 0.1 && sortedEnd <= bufEnd + 0.1) {
          inSameRange = true;
          break;
        }
      }
      if (!inSameRange) {
        foundGap = true;
      }
    }

    return foundGap;
  }

  function ensureBufferAhead(
    currentTime: number,
    videoRep: Representation,
    audioRep: Representation
  ) {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const videoBuffered = videoSbRef.current?.buffered;
    const audioBuffered = audioSbRef.current?.buffered;

    if (!videoBuffered || !audioBuffered) return;

    const videoAhead = getBufferAhead(videoBuffered, currentTime);
    const audioAhead = getBufferAhead(audioBuffered, currentTime);

    const targetBuffer = 15.0; // seconds
    const emergencyBuffer = 5.0; // seconds

    if (videoAhead < emergencyBuffer || audioAhead < emergencyBuffer) {
      console.log(
        `Low buffer detected (video: ${videoAhead.toFixed(
          1
        )}s, audio: ${audioAhead.toFixed(1)}s), fetching more segments`
      );

      if (videoSbRef.current && videoRepRef.current) {
        const segmentsToFetch = Math.min(
          3,
          Math.ceil(
            (targetBuffer - videoAhead) /
              (videoRep.segmentDur / videoRep.timescale)
          )
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
              videoSbRef.current,
              videoNextSegRef,
              videoFinishedRef,
              false
            );
          }
        }
      }

      if (
        audioSbRef.current &&
        audioRepRef.current &&
        audioAhead < emergencyBuffer
      ) {
        fetchNextSegment(
          videoId,
          audioRep,
          "audio",
          audioSbRef.current,
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

      if (Date.now() - lastSeekTimeRef.current < 500) return;
      lastSeekTimeRef.current = Date.now();

      if (isSeekingRef.current) {
        console.log("Seek operation already in progress");
        return;
      }

      isSeekingRef.current = true;
      lastStallTimeRef.current = Date.now();

      const seekingTimeout = setTimeout(() => {
        if (isSeekingRef.current) {
          console.warn("Seeking timeout - resetting seeking state");
          isSeekingRef.current = false;
        }
      }, 10000);

      try {
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

        const videoSb = videoSbRef.current;
        const audioSb = audioSbRef.current;
        const videoRep = videoRepRef.current;
        const audioRep = audioRepRef.current;

        if (!videoSb || !audioSb || !videoRep || !audioRep) {
          isSeekingRef.current = false;
          return;
        }

        await Promise.all([
          completeOngoingSegmentOperations("video"),
          completeOngoingSegmentOperations("audio"),
        ]);

        const currentPlayheadTime =
          lastPlayheadPositionRef.current || videoEl.currentTime;

        // Determine seek direction
        const isSeekingBackward = time < currentPlayheadTime;
        const isSeekingForward = time > currentPlayheadTime;

        // Check if seeking backwards within buffered content
        const isBackwardsInVideoBuffer = isSeekingBackwardsInBuffer(
          currentPlayheadTime,
          time,
          videoSb
        );
        const isBackwardsInAudioBuffer = isSeekingBackwardsInBuffer(
          currentPlayheadTime,
          time,
          audioSb
        );

        // Check if seek position is already buffered with sufficient content ahead
        const shouldPreserveBuffer = await isSeekPositionBuffered(
          videoEl,
          videoSb,
          audioSb,
          time
        );

        // CRITICAL: Check if seek destination is unbuffered - ALWAYS clear if unbuffered
        const isSeekPositionUnbuffered =
          !isTimeInBufferedRange(videoSb.buffered, time) ||
          !isTimeInBufferedRange(audioSb.buffered, time);

        // Check for gaps when seeking backward
        const hasGapInSeekRange =
          isSeekingBackward &&
          (hasGapBetween(time, currentPlayheadTime, videoSb.buffered) ||
            hasGapBetween(time, currentPlayheadTime, audioSb.buffered));

        // NEW LOGIC: Always clear buffer if seeking to unbuffered region
        // Remove keep-behind constraints when destination is unbuffered
        const shouldSkipClear =
          !isSeekPositionUnbuffered && // MUST have buffered content at destination
          isBackwardsInVideoBuffer &&
          isBackwardsInAudioBuffer &&
          shouldPreserveBuffer &&
          !hasGapInSeekRange; // MUST NOT have gaps in the seek range

        // Determine clear reason for logging
        let clearReason = "";
        if (isSeekPositionUnbuffered) {
          clearReason = "seeking to unbuffered region";
        } else if (hasGapInSeekRange) {
          clearReason = "gaps detected in seek range";
        } else if (!shouldPreserveBuffer) {
          clearReason = "insufficient buffer ahead";
        } else if (isSeekingForward) {
          clearReason = "forward seek";
        } else if (!isBackwardsInVideoBuffer || !isBackwardsInAudioBuffer) {
          clearReason = "not within current buffered range";
        }

        if (!shouldSkipClear) {
          // Clear buffer - seek position is not safely available
          console.log(
            `Clearing buffer for seek to ${time}s - Reason: ${clearReason}`
          );

          await Promise.all([
            enqueueOperation("video", () =>
              removeBufferRange(videoSb, 0, Infinity)
            ),
            enqueueOperation("audio", () =>
              removeBufferRange(audioSb, 0, Infinity)
            ),
          ]);

          await new Promise((resolve) => setTimeout(resolve, 200));

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
        } else {
          console.log(
            `Preserving buffer for seek to ${time}s - Position is safely buffered`
          );
        }

        // Update segment counters regardless
        videoNextSegRef.current = getSegmentNumber(videoRep, time);
        audioNextSegRef.current = getSegmentNumber(audioRep, time);
        videoFinishedRef.current = false;
        audioFinishedRef.current = false;

        lastProcessedSegmentsRef.current.set(
          videoRep.id,
          videoNextSegRef.current - 1
        );
        lastProcessedSegmentsRef.current.set(
          audioRep.id,
          audioNextSegRef.current - 1
        );

        console.log(
          `Seek to ${time}s - Starting from segment ${videoNextSegRef.current}`
        );

        // Fetch segments based on whether buffer was cleared
        if (!shouldSkipClear) {
          // Buffer was cleared, fetch initial segments
          setTimeout(() => {
            if (videoSbRef.current && videoRepRef.current) {
              for (let i = 0; i < 3; i++) {
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

            if (audioSbRef.current && audioRepRef.current) {
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
          }, 100);
        } else {
          // Buffer was preserved, ensure adequate buffer ahead
          ensureBufferAhead(time, videoRep, audioRep);
        }
      } catch (error) {
        console.error("Error during seek reset:", error);
      } finally {
        clearTimeout(seekingTimeout);
        setTimeout(() => {
          isSeekingRef.current = false;
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
      lastPlayheadPositionRef,
    ]
  );

  return { resetStreamForSeek };
}
