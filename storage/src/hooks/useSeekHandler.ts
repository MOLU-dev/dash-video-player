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
    ]
  );

  return { resetStreamForSeek };
}
