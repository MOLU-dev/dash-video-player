import { useCallback } from "react";
import type { Representation } from "../../../../src/types/player.types";
import { fetchInitSegment } from "../../../../src/services/segmentFetcher";
import {
  appendBufferSafely,
  removeBufferRange,
} from "../../../../src/utils/bufferHelpers";
import { getSegmentNumber } from "../../../../src/utils/playerHelpers";
import {
  BUFFER_EMERGENCY_THRESHOLD,
  REBUFFER_THRESHOLD,
  TARGET_BUFFER_LEVEL,
} from "../../../../src/constants/player.constants";

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
  showReplay: boolean;
  pauseDurationRef: React.RefObject<number>;
  shouldStopDownloadingRef: React.RefObject<boolean>;
  lastPauseTimeRef: React.RefObject<number>;
  isPausedRef: React.RefObject<boolean>; // CRITICAL: Added this
  setIsPaused: (paused: boolean) => void;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  isOnlineRef: React.RefObject<boolean>;
  lastTimeUpdateRef: React.RefObject<number>;
  tryEndStream: () => void;
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
  showReplay,
  pauseDurationRef,
  shouldStopDownloadingRef,
  lastPauseTimeRef,
  isPausedRef,
  setIsPaused,
  mediaSourceStateRef,
  isOnlineRef,
  lastTimeUpdateRef,
  tryEndStream,
}: UsePlayerEventHandlersProps) {
  const handleStall = useCallback(async () => {
    if (!videoRef.current || !mediaSourceRef.current) return;
    if (isStalledRef.current) return;

    const videoEl = videoRef.current;
    const now = Date.now();

    if (isInOnlineRecoveryRef.current) {
      //console.log("Stall handling blocked: in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      // console.log("Stall handling blocked: currently seeking");
      return;
    }

    if (now - lastStallTimeRef.current < 3000) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const currentTime = videoEl.currentTime;
    const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

    // console.log(
    //   "Stall check - buffer gap:",
    //   bufferGap.toFixed(1),
    //   "currentTime:",
    //   currentTime.toFixed(1)
    // );

    if (bufferGap >= BUFFER_EMERGENCY_THRESHOLD * 0.8) {
      // console.log(
      //   `Stall handling blocked: buffer gap ${bufferGap.toFixed(
      //     1
      //   )}s above emergency threshold`
      // );
      return;
    }

    //console.log("Handling stall with buffer gap:", bufferGap.toFixed(1));

    lastStallTimeRef.current = now;
    isStalledRef.current = true;

    if (!shouldAllowQualitySwitch("stall-recovery")) {
      //console.log("Quality switch blocked by guard conditions during stall");
      isStalledRef.current = false;
      return;
    }

    abortAllRequests();

    try {
      await completeOngoingSegmentOperations("video");
      await completeOngoingSegmentOperations("audio");

      const currentTime = videoEl.currentTime;

      if (
        videoRepsRef.current.length > 0 &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD * 0.5
      ) {
        const lowestIdx = 0;
        const lowestRep = videoRepsRef.current[lowestIdx];

        if (videoQualityIdxRef.current !== lowestIdx) {
          //console.log("Stall recovery: switching to lowest quality");

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
            setCurrentStats((prev: any) => ({
              ...prev,
              quality: availableQualities[lowestIdx]?.label || "Auto",
            }));
          } catch (err) {
            // console.error(
            //   "Failed to fetch init segment for lowest quality during stall:",
            //   err
            // );
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
      //  console.error("Error during stall recovery:", error);
    } finally {
      rebufferTimeoutRef.current = window.setTimeout(() => {
        isStalledRef.current = false;
      }, 2000);
    }
  }, [
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
    videoQualityIdxRef,
    lastStallTimeRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    mediaSourceRef,
    videoInitSegmentCache,
    currentVideoInitSegmentRef,
    currentVideoRepIdRef,
    rebufferTimeoutRef,
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

  const onWaiting = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    if (mediaSource?.readyState !== "open") return;

    if (isInOnlineRecoveryRef.current) {
      // console.log("onWaiting blocked: in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      // console.log("onWaiting blocked: currently seeking");
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const bufferGap = estimatedBufferEnd - videoEl.currentTime;

    if (bufferGap >= 6) {
      // console.log(
      //   `onWaiting blocked: buffer gap ${bufferGap.toFixed(
      //     1
      //   )}s above minimum threshold`
      // );
      return;
    }

    handleStall();
  }, [
    mediaSourceRef,
    videoRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    calculateEstimatedBufferEndWrapper,
    handleStall,
  ]);

  // const resetStreamForSeek = useCallback(
  //   async (time: number) => {
  //     const videoEl = videoRef.current;
  //     if (!videoEl) return;

  //     if (Date.now() - lastSeekTimeRef.current < 500) return;
  //     lastSeekTimeRef.current = Date.now();

  //     if (isSeekingRef.current) {
  //       // console.log("Seek operation already in progress");
  //       return;
  //     }

  //     setShowReplay(false);

  //     isSeekingRef.current = true;
  //     lastStallTimeRef.current = Date.now();

  //     const seekingTimeout = setTimeout(() => {
  //       if (isSeekingRef.current) {
  //         //console.warn("Seeking timeout - resetting seeking state");
  //         isSeekingRef.current = false;
  //       }
  //     }, 10000);

  //     try {
  //       abortAllRequests();

  //       operationQueuesRef.current = {
  //         video: [],
  //         audio: [],
  //         videoProcessing: false,
  //         audioProcessing: false,
  //       };

  //       isFetchingVideoRef.current = false;
  //       isFetchingAudioRef.current = false;

  //       pendingAppendsRef.current = { video: [], audio: [] };
  //       pendingSegmentOperationsRef.current.clear();

  //       const videoSb = videoSbRef.current;
  //       const audioSb = audioSbRef.current;
  //       const videoRep = videoRepRef.current;
  //       const audioRep = audioRepRef.current;

  //       if (!videoSb || !audioSb || !videoRep || !audioRep) {
  //         isSeekingRef.current = false;
  //         return;
  //       }

  //       await Promise.all([
  //         completeOngoingSegmentOperations("video"),
  //         completeOngoingSegmentOperations("audio"),
  //       ]);

  //       const currentTime = videoEl.currentTime;
  //       const isSeekingBackward = time < currentTime;
  //       const isTargetBuffered =
  //         videoEl.buffered.length > 0 &&
  //         Array.from({ length: videoEl.buffered.length }).some(
  //           (_, i) =>
  //             time >= videoEl.buffered.start(i) &&
  //             time <= videoEl.buffered.end(i)
  //         );

  //       let needsInitSegment = false;

  //       if (isSeekingBackward) {
  //         // console.log(
  //         //   `⏪ Seeking backward: ${currentTime.toFixed(1)}s → ${time.toFixed(
  //         //     1
  //         //   )}s (clearing all buffers)`
  //         // );

  //         await Promise.all([
  //           enqueueOperation("video", () =>
  //             removeBufferRange(videoSb, 0, Infinity)
  //           ),
  //           enqueueOperation("audio", () =>
  //             removeBufferRange(audioSb, 0, Infinity)
  //           ),
  //         ]);

  //         needsInitSegment = true;
  //         await new Promise((resolve) => setTimeout(resolve, 50));
  //       } else if (isTargetBuffered) {
  //         // console.log(
  //         //   `⏩ Seeking forward to buffered area: ${currentTime.toFixed(
  //         //     1
  //         //   )}s → ${time.toFixed(1)}s (preserving buffers)`
  //         // );

  //         needsInitSegment = false;
  //       } else {
  //         // console.log(
  //         //   `⏩ Seeking forward to unbuffered area: ${currentTime.toFixed(
  //         //     1
  //         //   )}s → ${time.toFixed(1)}s (clearing forward only)`
  //         // );

  //         if (videoSb.buffered.length > 0) {
  //           await enqueueOperation("video", () =>
  //             removeBufferRange(videoSb, currentTime, Infinity)
  //           );
  //         }
  //         if (audioSb.buffered.length > 0) {
  //           await enqueueOperation("audio", () =>
  //             removeBufferRange(audioSb, currentTime, Infinity)
  //           );
  //         }

  //         needsInitSegment = false;
  //         await new Promise((resolve) => setTimeout(resolve, 30));
  //       }

  //       if (needsInitSegment) {
  //         // console.log("Re-appending init segments after backward seek");

  //         if (currentVideoInitSegmentRef.current) {
  //           await enqueueOperation("video", () =>
  //             appendBufferSafely(videoSb, currentVideoInitSegmentRef.current!)
  //           );
  //         }

  //         if (currentAudioInitSegmentRef.current) {
  //           await enqueueOperation("audio", () =>
  //             appendBufferSafely(audioSb, currentAudioInitSegmentRef.current!)
  //           );
  //         }
  //       } else {
  //         // console.log("Preserving init segments (forward seek)");
  //       }

  //       videoNextSegRef.current = getSegmentNumber(videoRep, time);
  //       audioNextSegRef.current = getSegmentNumber(audioRep, time);
  //       videoFinishedRef.current = false;
  //       audioFinishedRef.current = false;

  //       lastProcessedSegmentsRef.current.set(
  //         videoRep.id,
  //         videoNextSegRef.current - 1
  //       );
  //       lastProcessedSegmentsRef.current.set(
  //         audioRep.id,
  //         audioNextSegRef.current - 1
  //       );

  //       // console.log(
  //       //   `Starting from segment ${videoNextSegRef.current} at ${time.toFixed(
  //       //     1
  //       //   )}s`
  //       // );

  //       setTimeout(() => {
  //         if (videoSbRef.current && videoRepRef.current) {
  //           for (let i = 0; i < 3; i++) {
  //             if (
  //               videoNextSegRef.current <=
  //               videoRep.startNumber + videoRep.totalSegments - 1
  //             ) {
  //               fetchNextSegment(
  //                 videoId,
  //                 videoRep,
  //                 "video",
  //                 videoSb,
  //                 videoNextSegRef,
  //                 videoFinishedRef,
  //                 false
  //               );
  //             }
  //           }
  //         }

  //         if (audioSbRef.current && audioRepRef.current) {
  //           fetchNextSegment(
  //             videoId,
  //             audioRep,
  //             "audio",
  //             audioSb,
  //             audioNextSegRef,
  //             audioFinishedRef,
  //             false
  //           );
  //         }
  //       }, 30);
  //     } catch (error) {
  //       // console.error("Error during seek reset:", error);
  //     } finally {
  //       clearTimeout(seekingTimeout);
  //       setTimeout(() => {
  //         isSeekingRef.current = false;
  //       }, 250);
  //     }
  //   },
  //   [
  //     videoId,
  //     videoRef,
  //     lastSeekTimeRef,
  //     isSeekingRef,
  //     lastStallTimeRef,
  //     videoSbRef,
  //     audioSbRef,
  //     videoRepRef,
  //     audioRepRef,
  //     videoNextSegRef,
  //     audioNextSegRef,
  //     videoFinishedRef,
  //     audioFinishedRef,
  //     currentVideoInitSegmentRef,
  //     currentAudioInitSegmentRef,
  //     lastProcessedSegmentsRef,
  //     pendingAppendsRef,
  //     pendingSegmentOperationsRef,
  //     isFetchingVideoRef,
  //     isFetchingAudioRef,
  //     operationQueuesRef,
  //     abortAllRequests,
  //     completeOngoingSegmentOperations,
  //     enqueueOperation,
  //     fetchNextSegment,
  //     setShowReplay,
  //   ]
  // );

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

  const handleEnded = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const isAtEnd = Math.abs(videoEl.currentTime - durationRef.current) < 0.1;

    if (isAtEnd) {
      // console.log("Video ended naturally at end position");
      setShowReplay(true);
      videoEl.currentTime = 0;
      resetPlayer();
    } else {
      //  console.log(
      //    "Video ended but not at end position - resetting without replay"
      //  );
      resetPlayer();
    }
  }, [videoRef, durationRef, resetPlayer, setShowReplay]);

  //  const handleError = useCallback(() => {
  //    const videoEl = videoRef.current;
  //    if (videoEl) {
  //      console.error("Video element error:", videoEl.error);
  //    }
  //    resetPlayer();
  //  }, [videoRef, resetPlayer]);

  const handleError = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && videoEl.error) {
      // console.error("Video element error:", {
      //   code: videoEl.error.code,
      //   message: videoEl.error.message,
      // });
    } else {
      // console.error("Video element error: Unknown error occurred");
    }
    resetPlayer();
  }, [videoRef, resetPlayer]);

  const handlePlay = useCallback(() => {
    if (showReplay || !isInitializedRef.current) {
      setShowReplay(false);
      initializePlayer();
    }
  }, [showReplay, isInitializedRef, setShowReplay, initializePlayer]);

  const onPause = useCallback(() => {
    //console.log("Video paused - stopping all downloads");
    isPausedRef.current = true;
    setIsPaused(true);
    lastPauseTimeRef.current = Date.now();
    //  console.log("video is paused");
    // Abort ongoing downloads
    abortAllRequests();

    // Mark that we should stop downloading
    shouldStopDownloadingRef.current = true;
  }, [
    isPausedRef,
    setIsPaused,
    lastPauseTimeRef,
    shouldStopDownloadingRef,
    abortAllRequests,
  ]);

  // CRITICAL: Handle native play event
  const onPlayResume = useCallback(() => {
    //console.log("Video playing - resuming downloads");

    const wasShowingReplay = showReplay;

    if (wasShowingReplay) {
      // This is a replay scenario - reinitialize
      setShowReplay(false);
      initializePlayer();
    } else {
      // Just resuming from pause
      const pauseDuration =
        lastPauseTimeRef.current > 0
          ? Date.now() - lastPauseTimeRef.current
          : 0;
      pauseDurationRef.current = pauseDuration;

      isPausedRef.current = false;
      setIsPaused(false);
      shouldStopDownloadingRef.current = false;

      // Resume downloads if needed
      const videoEl = videoRef.current;
      if (
        videoEl &&
        isOnlineRef.current &&
        mediaSourceStateRef.current === "open" &&
        !isSeekingRef.current
      ) {
        const bufferGap =
          videoEl.buffered.length > 0
            ? videoEl.buffered.end(videoEl.buffered.length - 1) -
              videoEl.currentTime
            : 0;

        // Only resume if buffer is low
        if (bufferGap < TARGET_BUFFER_LEVEL * 0.8) {
          //console.log("Resuming downloads after play");

          if (
            !videoFinishedRef.current &&
            videoRepRef.current &&
            videoSbRef.current
          ) {
            fetchNextSegment(
              videoId,
              videoRepRef.current,
              "video",
              videoSbRef.current,
              videoNextSegRef,
              videoFinishedRef,
              false
            );
          }

          if (
            !audioFinishedRef.current &&
            audioRepRef.current &&
            audioSbRef.current
          ) {
            fetchNextSegment(
              videoId,
              audioRepRef.current,
              "audio",
              audioSbRef.current,
              audioNextSegRef,
              audioFinishedRef,
              false
            );
          }
        }
      }

      // Reset pause duration after a delay
      setTimeout(() => {
        pauseDurationRef.current = 0;
      }, 1000);
    }
  }, [
    videoId,
    videoRef,
    isPausedRef,
    setIsPaused,
    lastPauseTimeRef,
    pauseDurationRef,
    shouldStopDownloadingRef,
    showReplay,
    setShowReplay,
    initializePlayer,
    isOnlineRef,
    mediaSourceStateRef,
    isSeekingRef,
    videoFinishedRef,
    audioFinishedRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    fetchNextSegment,
  ]);

  // const onTimeUpdate = useCallback(() => {
  //     const mediaSource = mediaSourceRef.current;
  //     const videoEl = videoRef.current;

  //     if (mediaSource?.readyState !== "open") return;
  //     if (!videoEl?.buffered || videoEl.buffered.length === 0) return;
  //     if (!isOnlineRef.current) return;

  //     // CRITICAL: Don't refill buffer when paused!
  //     if (isPausedRef.current) return;

  //     const now = Date.now();
  //     if (now - lastTimeUpdateRef.current < 500) return;
  //     lastTimeUpdateRef.current = now;

  //     const currentTime = videoEl.currentTime;
  //     const timeToEnd = durationRef.current - currentTime;
  //     const bufferGap = getBufferGap(videoEl.buffered, currentTime);

  //     if (timeToEnd < 2 && videoFinishedRef.current && audioFinishedRef.current) {
  //       tryEndStream();
  //     }

  //     if (
  //       bufferGap < REBUFFER_THRESHOLD &&
  //       !isStalledRef.current &&
  //       !isSeekingRef.current &&
  //       !isInOnlineRecoveryRef.current
  //     ) {
  //       handleStall();
  //     }

  //     if (bufferGap > 5 && isStalledRef.current) {
  //       isStalledRef.current = false;
  //     }

  //     const bufferLoss = lastBufferGapRef.current - bufferGap;
  //     if (
  //       bufferLoss > 1.5 &&
  //       bufferGap < 5 &&
  //       !isSeekingRef.current &&
  //       !isInOnlineRecoveryRef.current
  //     ) {
  //       return;
  //     }
  //     lastBufferGapRef.current = bufferGap;

  //     const isNearEnd = timeToEnd < 5;
  //     const isBufferLow = bufferGap < 15;

  //     if (
  //       isBufferLow &&
  //       !videoFinishedRef.current &&
  //       videoRepRef.current &&
  //       videoSbRef.current
  //     ) {
  //       fetchNextSegment(
  //         videoId,
  //         videoRepRef.current,
  //         "video",
  //         videoSbRef.current,
  //         videoNextSegRef,
  //         videoFinishedRef,
  //         false
  //       );
  //     }

  //     if (
  //       isBufferLow &&
  //       !audioFinishedRef.current &&
  //       audioRepRef.current &&
  //       audioSbRef.current
  //     ) {
  //       fetchNextSegment(
  //         videoId,
  //         audioRepRef.current,
  //         "audio",
  //         audioSbRef.current,
  //         audioNextSegRef,
  //         audioFinishedRef,
  //         false
  //       );
  //     }

  //     if (isNearEnd) {
  //       if (
  //         !videoFinishedRef.current &&
  //         videoRepRef.current &&
  //         videoSbRef.current
  //       ) {
  //         fetchNextSegment(
  //           videoId,
  //           videoRepRef.current,
  //           "video",
  //           videoSbRef.current,
  //           videoNextSegRef,
  //           videoFinishedRef,
  //           false
  //         );
  //       }
  //       if (
  //         !audioFinishedRef.current &&
  //         audioRepRef.current &&
  //         audioSbRef.current
  //       ) {
  //         fetchNextSegment(
  //           videoId,
  //           audioRepRef.current,
  //           "audio",
  //           audioSbRef.current,
  //           audioNextSegRef,
  //           audioFinishedRef,
  //           false
  //         );
  //       }
  //     }
  //   }, [
  //     videoId,
  //     mediaSourceRef,
  //     videoRef,
  //     isOnlineRef,
  //     isPausedRef, // CRITICAL
  //     lastTimeUpdateRef,
  //     durationRef,
  //     videoFinishedRef,
  //     audioFinishedRef,
  //     isStalledRef,
  //     isSeekingRef,
  //     isInOnlineRecoveryRef,
  //     videoQualityIdxRef,
  //     videoRepRef,
  //     audioRepRef,
  //     videoSbRef,
  //     audioSbRef,
  //     videoNextSegRef,
  //     audioNextSegRef,
  //     lastBufferGapRef,
  //     tryEndStream,
  //     handleStall,
  //     fetchNextSegment,
  //   ]);

  //   const onSeeking = useCallback(() => {
  //     const videoEl = videoRef.current;
  //     if (!videoEl) return;

  //     const targetTime = videoEl.currentTime;

  //     if (showReplay) {
  //       setShowReplay(false);
  //     }

  //     resetStreamForSeek(targetTime);
  //   }, [videoRef, showReplay, setShowReplay, resetStreamForSeek]);

  return {
    handleStall,
    //  resetStreamForSeek,
    resetPlayer,
    handlePlayButtonClick,
    handleReplayClick,
    handleEnded,
    handleError,
    handlePlay,
    onPause,
    onPlayResume,
    // onTimeUpdate,
    // onSeeking,
    //onWaiting,
  };
}
