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

  // Check if seek position is within the keep-behind window
  function isWithinKeepBehindWindow(
    currentTime: number,
    seekTime: number
  ): boolean {
    const timeDifference = currentTime - seekTime;
    return timeDifference >= 0 && timeDifference <= BUFFER_KEEP_BEHIND;
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

        // Check if within keep-behind window
        const isWithinKeepBehind = isWithinKeepBehindWindow(
          currentPlayheadTime,
          time
        );

        // Check if seek position is already buffered with sufficient content ahead
        const shouldPreserveBuffer = await isSeekPositionBuffered(
          videoEl,
          videoSb,
          audioSb,
          time
        );

        // Determine if we should skip buffer clearing
        const shouldSkipClear =
          (isBackwardsInVideoBuffer &&
            isBackwardsInAudioBuffer &&
            isWithinKeepBehind) ||
          shouldPreserveBuffer;

        if (!shouldSkipClear) {
          // Only clear buffer if seek position is not already available
          console.log(
            `Seek position ${time}s not in buffer or outside keep-behind window, clearing and resetting`
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
            `Seek position ${time}s within buffered content (backwards: ${
              isBackwardsInVideoBuffer && isBackwardsInAudioBuffer
            }, keep-behind: ${isWithinKeepBehind}), preserving buffer`
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

        // Only fetch if we cleared buffer or need more segments
        if (!shouldSkipClear) {
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
          // If buffer was preserved, just ensure we have some segments ahead
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
