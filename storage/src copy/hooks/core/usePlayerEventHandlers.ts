import { useCallback } from "react";
import { getBufferGap } from "../../../../src/utils/playerHelpers";
import {
  REBUFFER_THRESHOLD,
  TARGET_BUFFER_LEVEL,
} from "../../../../src/constants/player.constants";
import type {
  Representation,
  MediaType,
} from "../../../../src/types/player.types";

interface UsePlayerEventHandlersProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  durationRef: React.RefObject<number>;
  lastTimeUpdateRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  isOnlineRef: React.RefObject<boolean>;
  videoQualityIdxRef: React.RefObject<number>;
  isInitializedRef: React.RefObject<boolean>;
  isPausedRef: React.RefObject<boolean>; // CRITICAL: Added this
  lastPauseTimeRef: React.RefObject<number>;
  pauseDurationRef: React.RefObject<number>;
  shouldStopDownloadingRef: React.RefObject<boolean>;
  showReplay: boolean;
  setShowReplay: (show: boolean) => void;
  setHasPlaybackStarted: (started: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  tryEndStream: () => void;
  handleStall: () => void;
  resetStreamForSeek: (time: number) => void;
  switchQuality: (newIdx: number) => Promise<void>;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  calculateEstimatedBufferEndWrapper: () => number;
  resetPlayer: () => void;
  initializePlayer: () => void;
  abortAllRequests: () => void;
}

export function usePlayerEventHandlers(props: UsePlayerEventHandlersProps) {
  const {
    videoId,
    videoRef,
    mediaSourceRef,
    mediaSourceStateRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    lastTimeUpdateRef,
    lastBufferGapRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    isOnlineRef,
    videoQualityIdxRef,
    isInitializedRef,
    isPausedRef, // CRITICAL
    lastPauseTimeRef,
    pauseDurationRef,
    shouldStopDownloadingRef,
    showReplay,
    setShowReplay,
    setHasPlaybackStarted,
    setIsPaused,
    tryEndStream,
    handleStall,
    resetStreamForSeek,
    switchQuality,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    resetPlayer,
    initializePlayer,
    abortAllRequests,
  } = props;

  // CRITICAL: This is the onTimeUpdate that gets attached to the video element
  const onTimeUpdate = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    const videoEl = videoRef.current;

    if (mediaSource?.readyState !== "open") return;
    if (!videoEl?.buffered || videoEl.buffered.length === 0) return;
    if (!isOnlineRef.current) return;

    // CRITICAL: Don't refill buffer when paused!
    if (isPausedRef.current) return;

    const now = Date.now();
    if (now - lastTimeUpdateRef.current < 500) return;
    lastTimeUpdateRef.current = now;

    const currentTime = videoEl.currentTime;
    const timeToEnd = durationRef.current - currentTime;
    const bufferGap = getBufferGap(videoEl.buffered, currentTime);

    if (timeToEnd < 2 && videoFinishedRef.current && audioFinishedRef.current) {
      tryEndStream();
    }

    if (
      bufferGap < REBUFFER_THRESHOLD &&
      !isStalledRef.current &&
      !isSeekingRef.current &&
      !isInOnlineRecoveryRef.current
    ) {
      handleStall();
    }

    if (bufferGap > 5 && isStalledRef.current) {
      isStalledRef.current = false;
    }

    const bufferLoss = lastBufferGapRef.current - bufferGap;
    if (
      bufferLoss > 1.5 &&
      bufferGap < 5 &&
      !isSeekingRef.current &&
      !isInOnlineRecoveryRef.current
    ) {
      const newQuality = Math.max(0, videoQualityIdxRef.current - 1);
      switchQuality(newQuality);
    }
    lastBufferGapRef.current = bufferGap;

    const isNearEnd = timeToEnd < 5;
    const isBufferLow = bufferGap < 15;

    if (
      isBufferLow &&
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
      isBufferLow &&
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

    if (isNearEnd) {
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
  }, [
    videoId,
    mediaSourceRef,
    videoRef,
    isOnlineRef,
    isPausedRef, // CRITICAL
    lastTimeUpdateRef,
    durationRef,
    videoFinishedRef,
    audioFinishedRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    videoQualityIdxRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    lastBufferGapRef,
    tryEndStream,
    handleStall,
    switchQuality,
    fetchNextSegment,
  ]);

  const onSeeking = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const targetTime = videoEl.currentTime;

    if (showReplay) {
      setShowReplay(false);
    }

    resetStreamForSeek(targetTime);
  }, [videoRef, showReplay, setShowReplay, resetStreamForSeek]);

  const onWaiting = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    if (mediaSource?.readyState !== "open") return;

    if (isInOnlineRecoveryRef.current) {
      console.log("onWaiting blocked: in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      console.log("onWaiting blocked: currently seeking");
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const bufferGap = estimatedBufferEnd - videoEl.currentTime;

    if (bufferGap >= 6) {
      console.log(
        `onWaiting blocked: buffer gap ${bufferGap.toFixed(
          1
        )}s above minimum threshold`
      );
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

  // CRITICAL: Handle native pause event
  const onPause = useCallback(() => {
    console.log("Video paused - stopping all downloads");
    isPausedRef.current = true;
    setIsPaused(true);
    lastPauseTimeRef.current = Date.now();

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
    console.log("Video playing - resuming downloads");

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
          console.log("Resuming downloads after play");

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

  const handleEnded = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const isAtEnd = Math.abs(videoEl.currentTime - durationRef.current) < 0.1;

    if (isAtEnd) {
      console.log("Video ended naturally at end position");
      setShowReplay(true);
      videoEl.currentTime = 0;
      resetPlayer();
    } else {
      console.log(
        "Video ended but not at end position - resetting without replay"
      );
      resetPlayer();
    }
  }, [videoRef, durationRef, resetPlayer, setShowReplay]);

  const handleError = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      console.error("Video element error:", videoEl.error);
    }
    resetPlayer();
  }, [videoRef, resetPlayer]);

  const handlePlay = useCallback(() => {
    if (showReplay || !isInitializedRef.current) {
      setShowReplay(false);
      initializePlayer();
    }
  }, [showReplay, isInitializedRef, setShowReplay, initializePlayer]);

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
    onTimeUpdate,
    onSeeking,
    onWaiting,
    onPause, // CRITICAL: Export this
    onPlayResume, // CRITICAL: Export this
    handleEnded,
    handleError,
    handlePlay,
    handlePlayButtonClick,
    handleReplayClick,
  };
}
