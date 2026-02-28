import { useCallback } from "react";
import type { Representation } from "@/types/player.types";
import { fetchInitSegment } from "@/services/segmentFetcher";
import {
  appendBufferSafely,
  removeBufferRange,
} from "@/utils/bufferHelpers";
import { getSegmentNumber } from "@/utils/playerHelpers";
import {
  BUFFER_EMERGENCY_THRESHOLD,
  REBUFFER_THRESHOLD,
  TARGET_BUFFER_LEVEL,
} from "@/constants/player.constants";

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

  shouldFetchSegment: (
    mediaType: "video" | "audio",
    sb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean
  ) => { shouldFetch: boolean; delay: number; reason: string };

  scheduleNextFetch: (
    mediaType: "video" | "audio",
    delay: number,
    callback: () => void
  ) => void;
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
  shouldFetchSegment,
  scheduleNextFetch,
}: UsePlayerEventHandlersProps) {
  const handleStall = useCallback(async () => {
    if (!videoRef.current || !mediaSourceRef.current) return;
    if (isStalledRef.current) return;

    const videoEl = videoRef.current;
    const now = Date.now();

    if (isInOnlineRecoveryRef.current) {
      return;
    }

    if (isSeekingRef.current) {
      return;
    }

    if (now - lastStallTimeRef.current < 3000) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const currentTime = videoEl.currentTime;
    const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

    // Check if we really need to handle this as a stall
    if (bufferGap >= BUFFER_EMERGENCY_THRESHOLD * 0.8) {
      return;
    }

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

      // ✅ Use buffer control to decide if we should switch quality
      const videoSb = videoSbRef.current;
      const shouldFetchVideo = videoSb
        ? shouldFetchSegment(
            "video",
            videoSb,
            currentTime,
            true // emergency mode
          )
        : { shouldFetch: false, delay: 0, reason: "No video buffer" };

      // Only switch to lowest quality if buffer is critically low AND buffer control says we should fetch
      if (
        videoRepsRef.current.length > 0 &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD * 0.5 &&
        shouldFetchVideo.shouldFetch
      ) {
        const lowestIdx = 0;
        const rep = videoRepsRef.current[lowestIdx];

        if (videoQualityIdxRef.current !== lowestIdx) {
          try {
            const initSegment = await fetchInitSegment(videoId, rep, "video");
            videoInitSegmentCache.current.set(rep.id, initSegment);
            currentVideoInitSegmentRef.current = initSegment;
            currentVideoRepIdRef.current = rep.id;

            await enqueueOperation("video", () =>
              appendBufferSafely(videoSbRef.current!, initSegment)
            );

            videoRepRef.current = rep;
            videoQualityIdxRef.current = lowestIdx;
            setUiVideoQualityIdx(lowestIdx);
            setCurrentStats((prev: any) => ({
              ...prev,
              quality: availableQualities[lowestIdx]?.label || "Auto",
            }));
          } catch (err) {
            // Error handling
          }
        }
      }

      // ✅ Use buffer control for resuming video fetching
      if (videoRepRef.current) {
        videoNextSegRef.current = getSegmentNumber(
          videoRepRef.current,
          currentTime
        );
        videoFinishedRef.current = false;

        // Only fetch if buffer control allows it
        if (videoSbRef.current && shouldFetchVideo.shouldFetch) {
          if (shouldFetchVideo.delay === 0) {
            fetchNextSegment(
              videoId,
              videoRepRef.current,
              "video",
              videoSbRef.current,
              videoNextSegRef,
              videoFinishedRef,
              true
            );
          } else if (shouldFetchVideo.delay > 0) {
            // Schedule the fetch according to buffer control delay
            scheduleNextFetch("video", shouldFetchVideo.delay, () => {
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
            });
          }
        }
      }

      // ✅ Use buffer control for audio fetching too
      if (audioRepRef.current) {
        audioNextSegRef.current = getSegmentNumber(
          audioRepRef.current,
          currentTime
        );
        audioFinishedRef.current = false;

        const audioSb = audioSbRef.current;
        const shouldFetchAudio = audioSb
          ? shouldFetchSegment(
              "audio",
              audioSb,
              currentTime,
              true // emergency mode
            )
          : { shouldFetch: false, delay: 0, reason: "No audio buffer" };

        if (audioSbRef.current && shouldFetchAudio.shouldFetch) {
          if (shouldFetchAudio.delay === 0) {
            fetchNextSegment(
              videoId,
              audioRepRef.current,
              "audio",
              audioSbRef.current,
              audioNextSegRef,
              audioFinishedRef,
              true
            );
          } else if (shouldFetchAudio.delay > 0) {
            scheduleNextFetch("audio", shouldFetchAudio.delay, () => {
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
            });
          }
        }
      }
    } catch (error) {
      // Error handling
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
    shouldFetchSegment,
    scheduleNextFetch,

    setUiVideoQualityIdx,
    setCurrentStats,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
  ]);

  
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
