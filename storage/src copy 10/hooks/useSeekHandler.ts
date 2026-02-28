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
import { BUFFER_KEEP_BEHIND } from "../../../src/constants/player.constants";

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

interface SeekAnalysis {
  shouldClearBuffer: boolean;
  reason: string;
  hasGaps: boolean;
  bufferState: {
    videoBuffered: boolean;
    audioBuffered: boolean;
    videoBufferAhead: number;
    audioBufferAhead: number;
  };
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

  // Check if buffer has ANY gaps (discontinuities)
  function hasAnyBufferGaps(buffered: TimeRanges): boolean {
    if (buffered.length > 1) {
      for (let i = 0; i < buffered.length - 1; i++) {
        const currentEnd = buffered.end(i);
        const nextStart = buffered.start(i + 1);
        const gap = nextStart - currentEnd;

        if (gap > 0.5) {
          console.log(
            `Gap detected: ${gap.toFixed(2)}s between ${currentEnd.toFixed(
              2
            )}s and ${nextStart.toFixed(2)}s`
          );
          return true;
        }
      }
    }
    return false;
  }

  // Check if there are gaps in the buffer between two time points
  function hasGapBetween(
    start: number,
    end: number,
    buffered: TimeRanges
  ): boolean {
    const sortedStart = Math.min(start, end);
    const sortedEnd = Math.max(start, end);

    if (buffered.length === 0) return true;
    if (buffered.length === 1) {
      const bufStart = buffered.start(0);
      const bufEnd = buffered.end(0);
      return !(sortedStart >= bufStart - 0.1 && sortedEnd <= bufEnd + 0.1);
    }

    let currentPos = sortedStart;
    let foundStart = false;

    for (let i = 0; i < buffered.length; i++) {
      const bufStart = buffered.start(i);
      const bufEnd = buffered.end(i);

      if (currentPos < bufStart - 0.1 && foundStart) {
        console.log(
          `Gap in seek range: ${currentPos.toFixed(2)}s to ${bufStart.toFixed(
            2
          )}s`
        );
        return true;
      }

      if (
        !foundStart &&
        sortedStart >= bufStart - 0.1 &&
        sortedStart <= bufEnd + 0.1
      ) {
        foundStart = true;
        currentPos = bufEnd;
      }

      if (sortedEnd >= bufStart - 0.1 && sortedEnd <= bufEnd + 0.1) {
        if (foundStart) {
          return false;
        }
      }

      if (
        foundStart &&
        currentPos >= bufStart - 0.1 &&
        currentPos <= bufEnd + 0.1
      ) {
        currentPos = bufEnd;
      }
    }

    return true;
  }

  // NEW: Comprehensive seek and buffer analysis
  function analyzeSeekAndBuffer(
    currentTime: number,
    seekTime: number,
    videoSb: SourceBuffer,
    audioSb: SourceBuffer,
    videoRep: Representation,
    audioRep: Representation
  ): SeekAnalysis {
    const isSeekingForward = seekTime > currentTime;
    const isSeekingBackward = seekTime < currentTime;
    const seekDistance = Math.abs(seekTime - currentTime);

    const videoBuffered = videoSb.buffered;
    const audioBuffered = audioSb.buffered;

    const videoHasGaps = hasAnyBufferGaps(videoBuffered);
    const audioHasGaps = hasAnyBufferGaps(audioBuffered);

    const isVideoDestBuffered = isTimeInBufferedRange(videoBuffered, seekTime);
    const isAudioDestBuffered = isTimeInBufferedRange(audioBuffered, seekTime);

    const videoBufferAhead = getBufferAhead(videoBuffered, seekTime);
    const audioBufferAhead = getBufferAhead(audioBuffered, seekTime);

    // CASE 1: Buffer already has gaps - always clear
    if (videoHasGaps || audioHasGaps) {
      return {
        shouldClearBuffer: true,
        reason: "Existing buffer discontinuities detected",
        hasGaps: true,
        bufferState: {
          videoBuffered: isVideoDestBuffered,
          audioBuffered: isAudioDestBuffered,
          videoBufferAhead,
          audioBufferAhead,
        },
      };
    }

    // CASE 2: Seeking to unbuffered region - must clear
    if (!isVideoDestBuffered || !isAudioDestBuffered) {
      return {
        shouldClearBuffer: true,
        reason: "Seek destination not buffered",
        hasGaps: false,
        bufferState: {
          videoBuffered: isVideoDestBuffered,
          audioBuffered: isAudioDestBuffered,
          videoBufferAhead,
          audioBufferAhead,
        },
      };
    }

    // CASE 3: Check for gaps between current position and seek destination
    const hasVideoGapBetween = hasGapBetween(
      currentTime,
      seekTime,
      videoBuffered
    );
    const hasAudioGapBetween = hasGapBetween(
      currentTime,
      seekTime,
      audioBuffered
    );

    if (hasVideoGapBetween || hasAudioGapBetween) {
      return {
        shouldClearBuffer: true,
        reason: "Gap exists between current position and seek destination",
        hasGaps: true,
        bufferState: {
          videoBuffered: isVideoDestBuffered,
          audioBuffered: isAudioDestBuffered,
          videoBufferAhead,
          audioBufferAhead,
        },
      };
    }

    // CASE 4: Forward seeking - check if it would create gaps when seeking back
    if (isSeekingForward) {
      // Find the end of the buffered range containing current time
      let currentBufferEnd = 0;
      for (let i = 0; i < videoBuffered.length; i++) {
        if (
          currentTime >= videoBuffered.start(i) - 0.1 &&
          currentTime <= videoBuffered.end(i) + 0.1
        ) {
          currentBufferEnd = videoBuffered.end(i);
          break;
        }
      }

      // If seeking beyond current buffer end, it would create a gap
      // when we later seek back to the current position
      if (seekTime > currentBufferEnd + 0.5) {
        return {
          shouldClearBuffer: true,
          reason: "Forward seek beyond current buffer would create future gaps",
          hasGaps: false,
          bufferState: {
            videoBuffered: isVideoDestBuffered,
            audioBuffered: isAudioDestBuffered,
            videoBufferAhead,
            audioBufferAhead,
          },
        };
      }
    }

    // CASE 5: Backward seeking within keep-behind window with sufficient buffer
    if (isSeekingBackward) {
      const isWithinKeepBehind = seekDistance <= BUFFER_KEEP_BEHIND;
      const hasSufficientBuffer =
        videoBufferAhead >= 5.0 && audioBufferAhead >= 5.0;

      if (isWithinKeepBehind && hasSufficientBuffer) {
        return {
          shouldClearBuffer: false,
          reason:
            "Backward seek within keep-behind window with sufficient buffer",
          hasGaps: false,
          bufferState: {
            videoBuffered: isVideoDestBuffered,
            audioBuffered: isAudioDestBuffered,
            videoBufferAhead,
            audioBufferAhead,
          },
        };
      }
    }

    // CASE 6: Check buffer continuity and health
    const minBufferAhead = 5.0;
    if (
      videoBufferAhead < minBufferAhead ||
      audioBufferAhead < minBufferAhead
    ) {
      return {
        shouldClearBuffer: true,
        reason: "Insufficient buffer ahead at seek destination",
        hasGaps: false,
        bufferState: {
          videoBuffered: isVideoDestBuffered,
          audioBuffered: isAudioDestBuffered,
          videoBufferAhead,
          audioBufferAhead,
        },
      };
    }

    // Default: preserve buffer if all checks pass
    return {
      shouldClearBuffer: false,
      reason: "Buffer is healthy and continuous",
      hasGaps: false,
      bufferState: {
        videoBuffered: isVideoDestBuffered,
        audioBuffered: isAudioDestBuffered,
        videoBufferAhead,
        audioBufferAhead,
      },
    };
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

    const targetBuffer = 15.0;
    const emergencyBuffer = 5.0;

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

        // Use comprehensive seek analysis
        const seekAnalysis = analyzeSeekAndBuffer(
          currentPlayheadTime,
          time,
          videoSb,
          audioSb,
          videoRep,
          audioRep
        );

        console.log(
          `Seek analysis for ${currentPlayheadTime.toFixed(
            2
          )}s -> ${time.toFixed(2)}s:`,
          `\n  Decision: ${
            seekAnalysis.shouldClearBuffer ? "CLEAR BUFFER" : "PRESERVE BUFFER"
          }`,
          `\n  Reason: ${seekAnalysis.reason}`,
          `\n  Has gaps: ${seekAnalysis.hasGaps}`,
          `\n  Video buffered: ${
            seekAnalysis.bufferState.videoBuffered
          }, ahead: ${seekAnalysis.bufferState.videoBufferAhead.toFixed(1)}s`,
          `\n  Audio buffered: ${
            seekAnalysis.bufferState.audioBuffered
          }, ahead: ${seekAnalysis.bufferState.audioBufferAhead.toFixed(1)}s`
        );

        const shouldClearBuffer = seekAnalysis.shouldClearBuffer;

        if (shouldClearBuffer) {
          console.log(
            `Clearing buffer for seek to ${time}s - Reason: ${seekAnalysis.reason}`
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
            `Preserving buffer for seek to ${time}s - ${seekAnalysis.reason}`
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
        if (shouldClearBuffer) {
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
