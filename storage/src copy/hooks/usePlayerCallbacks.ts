import { useCallback } from "react";
import type {
  MediaType,
  OperationQueue,
  Representation,
  PlayerStats,
} from "../../../src/types/player.types";
import { getSegmentNumber } from "../../../src/utils/playerHelpers";
import {
  removeBufferRange,
  appendBufferSafely,
} from "../../../src/utils/bufferHelpers";
import { fetchInitSegment } from "../../../src/services/segmentFetcher";
import { BUFFER_EMERGENCY_THRESHOLD } from "../../../src/constants/player.constants";

interface UsePlayerCallbacksProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoId: string;
  operationQueuesRef: React.RefObject<OperationQueue>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoRepsRef: React.RefObject<Representation[]>;
  videoQualityIdxRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  lastSeekTimeRef: React.RefObject<number>;
  lastStallTimeRef: React.RefObject<number>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  pendingAppendsRef: React.RefObject<any>;
  pendingSegmentOperationsRef: React.RefObject<any>;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  mode: string;
  availableQualities: any[];
  setUiVideoQualityIdx: (idx: number) => void;
  setCurrentStats: React.Dispatch<React.SetStateAction<PlayerStats>>; // Add proper type
  abortAllRequests: () => void;
  completeOngoingSegmentOperations: (mediaType: MediaType) => Promise<void>;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (...args: any[]) => void;
  calculateEstimatedBufferEndWrapper: () => number;
  shouldAllowQualitySwitch: (context?: string) => boolean;
}

export function usePlayerCallbacks(props: UsePlayerCallbacksProps) {
  const {
    videoRef,
    videoId,
    operationQueuesRef,
    videoFinishedRef,
    audioFinishedRef,
    mediaSourceRef,
    videoSbRef,
    audioSbRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoRepsRef,
    videoQualityIdxRef,
    isStalledRef,
    isSeekingRef,
    lastSeekTimeRef,
    lastStallTimeRef,
    isInOnlineRecoveryRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    videoInitSegmentCache,
    lastProcessedSegmentsRef,
    pendingAppendsRef,
    pendingSegmentOperationsRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    mode,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    shouldAllowQualitySwitch,
  } = props;

  const tryEndStream = useCallback(() => {
    const queue = operationQueuesRef.current;
    if (
      videoFinishedRef.current &&
      audioFinishedRef.current &&
      queue.video.length === 0 &&
      queue.audio.length === 0 &&
      !queue.videoProcessing &&
      !queue.audioProcessing &&
      mediaSourceRef.current?.readyState === "open"
    ) {
      mediaSourceRef.current.endOfStream();
    }
  }, [videoFinishedRef, audioFinishedRef, operationQueuesRef, mediaSourceRef]);

  const processQueue = useCallback(
    async (mediaType: MediaType) => {
      const queue = operationQueuesRef.current;
      let targetQueue: (() => Promise<void>)[];
      let processingFlag: keyof OperationQueue;

      if (mediaType === "video") {
        targetQueue = queue.video;
        processingFlag = "videoProcessing";
      } else {
        targetQueue = queue.audio;
        processingFlag = "audioProcessing";
      }

      if (queue[processingFlag] || targetQueue.length === 0) return;

      queue[processingFlag] = true;
      const operation = targetQueue.shift()!;

      try {
        await operation();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`Error processing ${mediaType} operation:`, err);
        }
      } finally {
        queue[processingFlag] = false;
        if (targetQueue.length > 0) {
          processQueue(mediaType);
        }
        tryEndStream();
      }
    },
    [operationQueuesRef, tryEndStream]
  );

  const handleStall = useCallback(async () => {
    if (!videoRef.current || !mediaSourceRef.current) return;
    if (isStalledRef.current) return;

    const videoEl = videoRef.current;
    const now = Date.now();

    if (isInOnlineRecoveryRef.current) {
      console.log("Stall handling blocked: in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      console.log("Stall handling blocked: currently seeking");
      return;
    }

    if (now - lastStallTimeRef.current < 3000) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const currentTime = videoEl.currentTime;
    const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

    if (bufferGap >= BUFFER_EMERGENCY_THRESHOLD * 0.8) {
      return;
    }

    console.log("Handling stall with buffer gap:", bufferGap.toFixed(1));

    lastStallTimeRef.current = now;
    isStalledRef.current = true;

    if (!shouldAllowQualitySwitch("stall-recovery")) {
      isStalledRef.current = false;
      return;
    }

    abortAllRequests();

    try {
      await completeOngoingSegmentOperations("video");
      await completeOngoingSegmentOperations("audio");

      const currentTime = videoEl.currentTime;

      if (
        mode === "auto" &&
        videoRepsRef.current.length > 0 &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD * 0.5
      ) {
        const lowestIdx = 0;
        const lowestRep = videoRepsRef.current[lowestIdx];

        if (videoQualityIdxRef.current !== lowestIdx) {
          console.log("Stall recovery: switching to lowest quality");

          try {
            const initSegment = await fetchInitSegment(
              videoId,
              lowestRep.id,
              "video"
            );
            videoInitSegmentCache.current.set(lowestRep.id, initSegment);
            currentVideoInitSegmentRef.current = initSegment;
            currentVideoRepIdRef.current = lowestRep.id;

            await enqueueOperation("video", () =>
              appendBufferSafely(videoSbRef.current!, initSegment)
            );

            videoRepRef.current = lowestRep;
            videoQualityIdxRef.current = lowestIdx;
            setUiVideoQualityIdx(lowestIdx);
            setCurrentStats((prev) => ({
              ...prev,
              quality: availableQualities[lowestIdx]?.label || "Auto",
            }));
          } catch (err) {
            console.error("Failed to fetch init segment during stall:", err);
          }
        }
      }

      if (videoRepRef.current) {
        videoNextSegRef.current = getSegmentNumber(
          videoRepRef.current,
          currentTime
        );
        videoFinishedRef.current = false;
      }

      if (audioRepRef.current) {
        audioNextSegRef.current = getSegmentNumber(
          audioRepRef.current,
          currentTime
        );
        audioFinishedRef.current = false;
      }

      if (videoRepRef.current && videoSbRef.current) {
        fetchNextSegment(
          videoRepRef.current,
          "video",
          videoSbRef.current,
          videoNextSegRef,
          videoFinishedRef,
          true
        );
      }

      if (audioRepRef.current && audioSbRef.current) {
        fetchNextSegment(
          audioRepRef.current,
          "audio",
          audioSbRef.current,
          audioNextSegRef,
          audioFinishedRef,
          true
        );
      }
    } catch (error) {
      console.error("Error during stall recovery:", error);
    } finally {
      setTimeout(() => {
        isStalledRef.current = false;
      }, 2000);
    }
  }, [
    videoRef,
    videoId,
    mediaSourceRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    lastStallTimeRef,
    videoRepsRef,
    videoQualityIdxRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    videoSbRef,
    audioSbRef,
    videoInitSegmentCache,
    currentVideoInitSegmentRef,
    currentVideoRepIdRef,
    mode,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
  ]);

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

        setTimeout(() => {
          if (videoSbRef.current && videoRepRef.current) {
            for (let i = 0; i < 3; i++) {
              if (
                videoNextSegRef.current <=
                videoRep.startNumber + videoRep.totalSegments - 1
              ) {
                fetchNextSegment(
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

  return {
    tryEndStream,
    processQueue,
    handleStall,
    resetStreamForSeek,
  };
}
