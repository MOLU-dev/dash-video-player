import { useCallback } from "react";
import type { Representation } from "../../src/types/player.types";
import { fetchInitSegment } from "../../src/services/segmentFetcher";
import {
  appendBufferSafely,
  removeBufferRange,
} from "../../src/utils/bufferHelpers";
import { getSegmentNumber } from "../../src/utils/playerHelpers";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
} from "../../src/constants/player.constants";

interface UsePlayerEventHandlersProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoRepsRef: React.RefObject<Representation[]>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  durationRef: React.RefObject<number>;
  videoQualityIdxRef: React.RefObject<number>;
  lastSeekTimeRef: React.RefObject<number>;
  lastStallTimeRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  throughputEMARef: React.RefObject<number>;
  lastQualitySwitchRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  audioInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
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
  isInitializedRef: React.RefObject<boolean>;
  availableQualities: Array<{ id: string; label: string }>;
  setUiVideoQualityIdx: React.Dispatch<React.SetStateAction<number>>;
  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  setShowReplay: React.Dispatch<React.SetStateAction<boolean>>;
  setHasPlaybackStarted: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAllowQualitySwitch: (context: string) => boolean;
  abortAllRequests: () => void;
  completeOngoingSegmentOperations: (
    mediaType: "video" | "audio"
  ) => Promise<void>;
  enqueueOperation: (
    mediaType: "video" | "audio",
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: "video" | "audio",
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  calculateEstimatedBufferEndWrapper: () => number;
  cleanupMediaSource: () => void;
  initializePlayer: () => void;
}

export function usePlayerEventHandlers({
  videoId,
  videoRef,
  videoRepsRef,
  videoRepRef,
  audioRepRef,
  videoSbRef,
  audioSbRef,
  videoNextSegRef,
  audioNextSegRef,
  videoFinishedRef,
  audioFinishedRef,
  durationRef,
  videoQualityIdxRef,
  lastSeekTimeRef,
  lastStallTimeRef,
  isStalledRef,
  isSeekingRef,
  isInOnlineRecoveryRef,
  mediaSourceRef,
  throughputEMARef,
  lastQualitySwitchRef,
  lastBufferGapRef,
  rebufferTimeoutRef,
  videoInitSegmentCache,
  audioInitSegmentCache,
  currentVideoInitSegmentRef,
  currentAudioInitSegmentRef,
  currentVideoRepIdRef,
  currentAudioRepIdRef,
  lastProcessedSegmentsRef,
  pendingAppendsRef,
  pendingSegmentOperationsRef,
  isFetchingVideoRef,
  isFetchingAudioRef,
  operationQueuesRef,
  isInitializedRef,
  availableQualities,
  setUiVideoQualityIdx,
  setCurrentStats,
  setShowReplay,
  setHasPlaybackStarted,
  shouldAllowQualitySwitch,
  abortAllRequests,
  completeOngoingSegmentOperations,
  enqueueOperation,
  fetchNextSegment,
  calculateEstimatedBufferEndWrapper,
  cleanupMediaSource,
  initializePlayer,
}: UsePlayerEventHandlersProps) {
  const handleStall = useCallback(async () => {
    console.log("stall detected");
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

    // REMOVED: All quality switching logic and conditions

    abortAllRequests();

    try {
      await completeOngoingSegmentOperations("video");
      await completeOngoingSegmentOperations("audio");

      const currentTime = videoEl.currentTime;

      console.log("Stall recovery: maintaining current quality");

      // Reset segment fetching for both video and audio
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

      // Continue fetching segments at current quality
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
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    videoSbRef,
    audioSbRef,
    rebufferTimeoutRef,
    abortAllRequests,
    completeOngoingSegmentOperations,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    videoId,
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

          needsInitSegment = false;
        } else {
          console.log(
            `⏩ Seeking forward to unbuffered area: ${currentTime.toFixed(
              1
            )}s → ${time.toFixed(1)}s (clearing forward only)`
          );

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
        }, 30);
      } catch (error) {
        console.error("Error during seek reset:", error);
      } finally {
        clearTimeout(seekingTimeout);
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 250);
      }
    },
    [
      videoId,
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

    pendingAppendsRef.current = { video: [], audio: [] };

    operationQueuesRef.current = {
      video: [],
      audio: [],
      videoProcessing: false,
      audioProcessing: false,
    };

    videoEl.pause();
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
    pendingAppendsRef,
    operationQueuesRef,
    isInitializedRef,
  ]);

  const handlePlayButtonClick = useCallback(() => {
    setHasPlaybackStarted(true);
    initializePlayer();
    videoRef.current?.play();
  }, [setHasPlaybackStarted, initializePlayer, videoRef]);

  const handleReplayClick = useCallback(() => {
    setShowReplay(false);
    initializePlayer();
    videoRef.current?.play();
  }, [setShowReplay, initializePlayer, videoRef]);

  return {
    handleStall,
    resetStreamForSeek,
    resetPlayer,
    handlePlayButtonClick,
    handleReplayClick,
  };
}
