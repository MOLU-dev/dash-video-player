import { useCallback } from "react";
import {
  removeBufferRange,
  appendBufferSafely,
  calculateEstimatedBufferEnd,
} from "../../../../src/utils/bufferHelpers";
import { fetchInitSegment } from "../../../../src/services/segmentFetcher";
import { getSegmentNumber } from "../../../../src/utils/playerHelpers";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
  BUFFER_RECOVERY_MULTIPLIER,
} from "../../../../src/constants/player.constants";
import type {
  MediaType,
  OperationQueue,
  Representation,
} from "../../../../src/types/player.types";

interface UsePlayerCallbacksProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoRepsRef: React.RefObject<Representation[]>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  durationRef: React.RefObject<number>;
  operationQueuesRef: React.RefObject<OperationQueue>;
  videoQualityIdxRef: React.RefObject<number>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  qualitySwitchInProgressRef: React.RefObject<boolean>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  pendingAppendsRef: React.RefObject<any>;
  lastSeekTimeRef: React.RefObject<number>;
  isSeekingRef: React.RefObject<boolean>;
  lastStallTimeRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  pendingSegmentOperationsRef: React.RefObject<Map<number, any>>;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  audioInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  throughputEMARef: React.RefObject<number>;
  lastQualitySwitchRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  isInitializedRef: React.RefObject<boolean>;
  currentBufferEndRef: React.RefObject<number>;
  isQualitySwitchingRef: React.RefObject<boolean>;
  isInEmergencyModeRef: React.RefObject<boolean>;
  emergencySwitchCountRef: React.RefObject<number>;
  bufferRecoveryTargetRef: React.RefObject<number>;
  lastBufferStateRef: React.RefObject<string>;
  estimatedBufferEndRef: React.RefObject<number>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  mode: string;
  availableQualities: any[];
  setUiVideoQualityIdx: (idx: number) => void;
  setCurrentStats: (fn: (prev: any) => any) => void;
  setShowReplay: (show: boolean) => void;
  shouldAllowQualitySwitch: (context: string) => boolean;
  abortAllRequests: () => void;
  completeOngoingSegmentOperations: (mediaType: MediaType) => Promise<void>;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  cleanupMediaSource: () => void;
  videoId: string;
}

export function usePlayerCallbacks(props: UsePlayerCallbacksProps) {
  const {
    videoRef,
    mediaSourceRef,
    videoSbRef,
    audioSbRef,
    videoRepRef,
    audioRepRef,
    videoRepsRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    operationQueuesRef,
    videoQualityIdxRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    qualitySwitchInProgressRef,
    lastProcessedSegmentsRef,
    pendingAppendsRef,
    lastSeekTimeRef,
    isSeekingRef,
    lastStallTimeRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    pendingSegmentOperationsRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    videoInitSegmentCache,
    audioInitSegmentCache,
    throughputEMARef,
    lastQualitySwitchRef,
    lastBufferGapRef,
    isInitializedRef,
    currentBufferEndRef,
    isQualitySwitchingRef,
    isInEmergencyModeRef,
    emergencySwitchCountRef,
    bufferRecoveryTargetRef,
    lastBufferStateRef,
    estimatedBufferEndRef,
    rebufferTimeoutRef,
    mode,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    setShowReplay,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    fetchNextSegment,
    cleanupMediaSource,
    videoId,
  } = props;

  const tryEndStream = useCallback(() => {
    const queue = operationQueuesRef.current;
    const videoEl = videoRef.current;

    // Check if all segments are fetched
    if (
      !videoFinishedRef.current ||
      !audioFinishedRef.current ||
      queue.video.length !== 0 ||
      queue.audio.length !== 0 ||
      queue.videoProcessing ||
      queue.audioProcessing ||
      !mediaSourceRef.current ||
      mediaSourceRef.current.readyState !== "open"
    ) {
      return;
    }

    // CRITICAL: Only end stream if video is near the end position
    if (videoEl && durationRef.current > 0) {
      const timeUntilEnd = durationRef.current - videoEl.currentTime;

      // Only end stream when playhead is within 2 seconds of the end
      // This allows buffering to complete without ending the stream prematurely
      if (timeUntilEnd > 2) {
        console.log(
          `Not ending stream yet - ${timeUntilEnd.toFixed(1)}s remaining`
        );
        return;
      }
    }

    console.log("Ending MediaSource stream");
    mediaSourceRef.current.endOfStream();
  }, [
    videoFinishedRef,
    audioFinishedRef,
    operationQueuesRef,
    mediaSourceRef,
    videoRef,
    durationRef,
  ]);

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

  const enqueueOperation = useCallback(
    (mediaType: MediaType, operation: () => Promise<void>) => {
      const queue = operationQueuesRef.current;
      if (mediaType === "video") {
        queue.video.push(operation);
      } else {
        queue.audio.push(operation);
      }
      processQueue(mediaType);
    },
    [operationQueuesRef, processQueue]
  );

  const validateSegmentCompatibility = useCallback(
    (repId: string, mediaType: string, segmentNumber?: number): boolean => {
      if (mediaType === "video") {
        const currentRepId = currentVideoRepIdRef.current;

        if (qualitySwitchInProgressRef.current) {
          const isOldRep = repId === currentRepId;
          const isNewRep = videoRepRef.current
            ? repId === videoRepRef.current.id
            : false;

          if (!isOldRep && !isNewRep) {
            console.log(
              `Blocking segment from unrelated rep ${repId} during switch`
            );
            return false;
          }

          return true;
        }

        const isValid = repId === currentRepId;

        if (!isValid) {
          console.log(
            `Segment validation failed: expected ${currentRepId}, got ${repId}`
          );
          return false;
        }

        return true;
      } else {
        return repId === currentAudioRepIdRef.current;
      }
    },
    [
      currentVideoRepIdRef,
      currentAudioRepIdRef,
      qualitySwitchInProgressRef,
      videoRepRef,
    ]
  );

  const calculateEstimatedBufferEndWrapper = useCallback(() => {
    return calculateEstimatedBufferEnd(
      videoRef.current,
      videoRepRef.current,
      audioRepRef.current,
      pendingAppendsRef.current
    );
  }, [videoRef, videoRepRef, audioRepRef, pendingAppendsRef]);

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

    console.log(
      "Stall check - buffer gap:",
      bufferGap.toFixed(1),
      "currentTime:",
      currentTime.toFixed(1)
    );

    if (bufferGap >= BUFFER_EMERGENCY_THRESHOLD * 0.8) {
      console.log(
        `Stall handling blocked: buffer gap ${bufferGap.toFixed(
          1
        )}s above emergency threshold`
      );
      return;
    }

    console.log("Handling stall with buffer gap:", bufferGap.toFixed(1));

    lastStallTimeRef.current = now;
    isStalledRef.current = true;

    if (!shouldAllowQualitySwitch("stall-recovery")) {
      console.log("Quality switch blocked by guard conditions during stall");
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
            console.error(
              "Failed to fetch init segment for lowest quality during stall:",
              err
            );
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
          videoId,
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
          videoId,
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
      rebufferTimeoutRef.current = window.setTimeout(() => {
        isStalledRef.current = false;
      }, 2000);
    }
  }, [
    videoRef,
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
    rebufferTimeoutRef,
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
    videoId,
  ]);

  const resetStreamForSeek = useCallback(
    async (time: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      // Prevent seek loops
      if (Date.now() - lastSeekTimeRef.current < 500) return;
      lastSeekTimeRef.current = Date.now();

      if (isSeekingRef.current) {
        console.log("Seek operation already in progress");
        return;
      }

      // IMPORTANT: Don't show replay during seeking
      setShowReplay(false);

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

        // Smart buffer clearing logic
        const currentTime = videoEl.currentTime;
        const isSeekingBackward = time < currentTime;
        const isTargetBuffered =
          videoEl.buffered.length > 0 &&
          Array.from({ length: videoEl.buffered.length }).some(
            (_, i) =>
              time >= videoEl.buffered.start(i) &&
              time <= videoEl.buffered.end(i)
          );

        let needsInitSegment = false;

        if (isSeekingBackward) {
          console.log(
            `⏪ Seeking backward: ${currentTime.toFixed(1)}s → ${time.toFixed(
              1
            )}s (clearing all buffers)`
          );

          // Clear all buffers when seeking backward
          await Promise.all([
            enqueueOperation("video", () =>
              removeBufferRange(videoSb, 0, Infinity)
            ),
            enqueueOperation("audio", () =>
              removeBufferRange(audioSb, 0, Infinity)
            ),
          ]);

          needsInitSegment = true;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else if (isTargetBuffered) {
          console.log(
            `⏩ Seeking forward to buffered area: ${currentTime.toFixed(
              1
            )}s → ${time.toFixed(1)}s (preserving buffers)`
          );

          // Target is already buffered - preserve everything
          needsInitSegment = false;
        } else {
          console.log(
            `⏩ Seeking forward to unbuffered area: ${currentTime.toFixed(
              1
            )}s → ${time.toFixed(1)}s (clearing forward only)`
          );

          // Clear only from current position forward
          if (videoSb.buffered.length > 0) {
            await enqueueOperation("video", () =>
              removeBufferRange(videoSb, currentTime, Infinity)
            );
          }
          if (audioSb.buffered.length > 0) {
            await enqueueOperation("audio", () =>
              removeBufferRange(audioSb, currentTime, Infinity)
            );
          }

          needsInitSegment = false;
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Conditionally re-append init segments (only when seeking backward)
        if (needsInitSegment) {
          console.log("Re-appending init segments after backward seek");

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
          console.log("Preserving init segments (forward seek)");
        }

        // Reset segment numbers
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
          `Starting from segment ${videoNextSegRef.current} at ${time.toFixed(
            1
          )}s`
        );

        // Start fetching immediately after seek (faster response)
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
        }, 30); // Faster start time
      } catch (error) {
        console.error("Error during seek reset:", error);
      } finally {
        clearTimeout(seekingTimeout);
        // Shorter delay before allowing new seeks
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 250); // Even faster recovery
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
      setShowReplay,
      videoId,
    ]
  );

  const resetPlayer = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    abortAllRequests();
    cleanupMediaSource();

    videoInitSegmentCache.current.clear();
    audioInitSegmentCache.current.clear();

    videoRepRef.current = null;
    audioRepRef.current = null;
    videoNextSegRef.current = 0;
    audioNextSegRef.current = 0;
    videoFinishedRef.current = false;
    audioFinishedRef.current = false;
    durationRef.current = 0;
    throughputEMARef.current = 0;
    lastQualitySwitchRef.current = 0;
    lastBufferGapRef.current = 0;
    isStalledRef.current = false;

    currentVideoInitSegmentRef.current = null;
    currentAudioInitSegmentRef.current = null;
    currentVideoRepIdRef.current = null;
    currentAudioRepIdRef.current = null;
    pendingSegmentOperationsRef.current.clear();

    lastProcessedSegmentsRef.current = new Map();
    currentBufferEndRef.current = 0;
    isQualitySwitchingRef.current = false;

    isInEmergencyModeRef.current = false;
    emergencySwitchCountRef.current = 0;
    bufferRecoveryTargetRef.current = 0;
    lastBufferStateRef.current = "healthy";

    pendingAppendsRef.current = { video: [], audio: [] };
    estimatedBufferEndRef.current = 0;

    operationQueuesRef.current = {
      video: [],
      audio: [],
      videoProcessing: false,
      audioProcessing: false,
    };

    videoEl.pause();
    //setShowReplay(true);
    isInitializedRef.current = false;
  }, [
    videoRef,
    abortAllRequests,
    cleanupMediaSource,
    videoInitSegmentCache,
    audioInitSegmentCache,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    throughputEMARef,
    lastQualitySwitchRef,
    lastBufferGapRef,
    isStalledRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    pendingSegmentOperationsRef,
    lastProcessedSegmentsRef,
    currentBufferEndRef,
    isQualitySwitchingRef,
    isInEmergencyModeRef,
    emergencySwitchCountRef,
    bufferRecoveryTargetRef,
    lastBufferStateRef,
    pendingAppendsRef,
    estimatedBufferEndRef,
    operationQueuesRef,
    setShowReplay,
    isInitializedRef,
  ]);

  return {
    tryEndStream,
    processQueue,
    enqueueOperation,
    validateSegmentCompatibility,
    calculateEstimatedBufferEndWrapper,
    handleStall,
    resetStreamForSeek,
    resetPlayer,
  };
}
