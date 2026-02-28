import { useEffect, useCallback } from "react";
import type { Representation } from "../../../../src/types/player.types";

const getVideoOrientation = (
  width: number | undefined,
  height: number | undefined
): "portrait" | "landscape" | "square" => {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    isNaN(width) ||
    isNaN(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return "landscape";
  }

  const ratio = width / height;

  if (ratio < 0.85) return "portrait";
  if (ratio > 1.15) return "landscape";
  return "square";
};

const getQualityLabel = (rep: Representation): string => {
  const { width, height, bandwidth } = rep;

  const hasValidDimensions =
    typeof width === "number" &&
    typeof height === "number" &&
    !isNaN(width) &&
    !isNaN(height) &&
    width > 0 &&
    height > 0;

  if (!hasValidDimensions) {
    return `${Math.round(bandwidth / 1000)}kbps`;
  }

  const orientation = getVideoOrientation(width, height);

  switch (orientation) {
    case "portrait":
      return `${width}p`;
    case "landscape":
      return `${height}p`;
    case "square":
      return `${height}p`;
    default:
      return `${Math.round(bandwidth / 1000)}kbps`;
  }
};

interface UsePlayerEffectsProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReps: Representation[];
  availableQualities: Array<{ id: string; label: string }>;
  uiVideoQualityIdx: number;
  showReplay: boolean;
  videoQualityIdxRef: React.RefObject<number>;
  playheadVelocityRef: React.RefObject<number>;
  durationRef: React.RefObject<number>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  isFirstRenderRef: React.RefObject<boolean>;
  isInitializedRef: React.RefObject<boolean>;
  throughputEMARef: React.RefObject<number>;
  evictionIntervalRef: React.RefObject<number | null>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  recoveryAbortRef: React.RefObject<AbortController | null>;
  currentQuality: string | number;
  isStalledRef: React.RefObject<boolean>;
  savedPosition: number | null;
  hasPlaybackStarted: boolean;
  isPausedRef: React.RefObject<boolean>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  setAvailableQualities: React.Dispatch<
    React.SetStateAction<Array<{ id: string; label: string }>>
  >;

  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  setHasPlaybackStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReplay: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResumePrompt: React.Dispatch<React.SetStateAction<boolean>>;
  setSavedPosition: React.Dispatch<React.SetStateAction<number | null>>;
  setIsBuffering: React.Dispatch<React.SetStateAction<boolean>>;
  setBufferProgress: React.Dispatch<React.SetStateAction<number>>;
  shouldAllowQualitySwitch: (context: string) => boolean;
  decideQuality: () => number;
  switchQuality: (newIdx: number) => Promise<void>;
  abortAllRequests: () => void;
  cleanupMediaSource: () => void;
  initializePlayer: () => void;
  resetPlayer: () => void;
  onPause: () => void;
  onPlayResume: () => void;
  handlePlayButtonClick: () => void;
  getSavedPosition: (id: string) => {
    currentTime: number;
    duration: number;
    timestamp: number;
    quality?: string;
  } | null;
  savePosition: (
    id: string,
    currentTime: number,
    duration: number,
    quality?: string
  ) => void;
  clearPosition: (id: string) => void;
  startAutoSave: (
    videoRef: React.RefObject<HTMLVideoElement | null>,
    id: string,
    getCurrentQuality?: () => string
  ) => void;
  stopAutoSave: () => void;
  setShouldShowResumeAfterPlay: (bool: boolean) => void;
  setShowResumeToast: (bool: boolean) => void;
  autoInitialize?: boolean;
  disableAutoPlay?: boolean;
}

export function usePlayerEffects({
  videoId,
  videoRef,
  videoReps,
  availableQualities,
  uiVideoQualityIdx,
  showReplay,
  videoQualityIdxRef,
  playheadVelocityRef,
  durationRef,
  mediaSourceStateRef,
  isFirstRenderRef,
  isInitializedRef,
  throughputEMARef,
  evictionIntervalRef,
  rebufferTimeoutRef,
  recoveryAbortRef,
  savedPosition,
  currentQuality,
  isStalledRef,
  hasPlaybackStarted,
  isPausedRef,
  audioFinishedRef,
  videoFinishedRef,
  setAvailableQualities,
  setCurrentStats,
  setHasPlaybackStarted,
  setShowReplay,
  setShowResumePrompt,
  setSavedPosition,
  setIsBuffering,
  setBufferProgress,
  shouldAllowQualitySwitch,
  decideQuality,
  switchQuality,
  abortAllRequests,
  cleanupMediaSource,
  initializePlayer,
  resetPlayer,
  onPause,
  onPlayResume,
  handlePlayButtonClick,
  getSavedPosition,
  savePosition,
  clearPosition,
  startAutoSave,
  stopAutoSave,
  setShouldShowResumeAfterPlay,
  setShowResumeToast,
  autoInitialize = true,
  disableAutoPlay = false,
}: UsePlayerEffectsProps) {
  // Update available qualities when video reps change
  useEffect(() => {
    if (videoReps.length > 0) {
      const qualities = [...videoReps]
        .sort((a, b) => a.bandwidth - b.bandwidth)
        .map((rep) => ({
          id: rep.id,
          label: getQualityLabel(rep),
        }));

      setAvailableQualities(qualities);
      setCurrentStats((prev: any) => ({
        ...prev,
        quality: qualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
    }
  }, [videoReps, videoQualityIdxRef, setAvailableQualities, setCurrentStats]);

  // Auto mode quality selection
  useEffect(() => {
    if (currentQuality === "auto") {
      // Auto mode logic
      const checkInterval = setInterval(() => {
        // NEW: Don't switch quality when paused
        if (isPausedRef.current) {
          return;
        }

        if (videoFinishedRef.current && audioFinishedRef.current) {
          return;
        }

        if (mediaSourceStateRef.current !== "open") return;
        if (!shouldAllowQualitySwitch("auto-mode")) return;

        const desiredQuality = decideQuality();
        if (desiredQuality !== videoQualityIdxRef.current) {
          switchQuality(desiredQuality);
        }
      }, 1500);

      return () => clearInterval(checkInterval);
    } else {
      if (isPausedRef.current) {
        return;
      }

      // Don't switch when video is finished
      if (videoFinishedRef.current && audioFinishedRef.current) {
        return;
      }

      // Manual quality selection - find the index by matching ID
      const selectedQuality = availableQualities.find(
        (q) => q.id === currentQuality.toString()
      );
      if (selectedQuality) {
        const selectedIdx = availableQualities.indexOf(selectedQuality);
        if (selectedIdx !== -1 && selectedIdx !== videoQualityIdxRef.current) {
          console.log("Manual quality change requested:", selectedIdx);
          switchQuality(selectedIdx);
        }
      }
    }
  }, [
    currentQuality,
    mediaSourceStateRef,
    videoQualityIdxRef,
    shouldAllowQualitySwitch,
    decideQuality,
    switchQuality,
    availableQualities,
  ]);

  // Track playhead velocity
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let lastTime = 0;
    let lastTimestamp = 0;

    const onTimeUpdate = () => {
      const now = Date.now();
      if (lastTimestamp > 0) {
        const deltaTime = (videoEl.currentTime - lastTime) * 1000;
        const deltaReal = now - lastTimestamp;
        playheadVelocityRef.current = Math.min(
          2,
          Math.max(0.5, deltaTime / deltaReal)
        );
      }
      lastTime = videoEl.currentTime;
      lastTimestamp = now;
    };

    videoEl.addEventListener("timeupdate", onTimeUpdate);
    return () => videoEl.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, playheadVelocityRef]);

  // Handle video ended event
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnded = () => {
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
    };

    // In the useEffect that handles video ended event, replace the handleError function:
    const handleError = () => {
      if (videoEl.error) {
        console.error("Video element error:", {
          code: videoEl.error.code,
          message: videoEl.error.message,
        });
      } else {
        console.error("Video element error: Unknown error occurred");
      }
      resetPlayer();
    };

    videoEl.addEventListener("ended", handleEnded);
    videoEl.addEventListener("error", handleError);

    return () => {
      videoEl.removeEventListener("ended", handleEnded);
      videoEl.removeEventListener("error", handleError);
    };
  }, [videoRef, durationRef, resetPlayer, setShowReplay]);

  // Handle play event
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handlePlay = () => {
      if (showReplay || !isInitializedRef.current) {
        setShowReplay(false);
        initializePlayer();
      }
    };

    videoEl.addEventListener("play", handlePlay);
    return () => videoEl.removeEventListener("play", handlePlay);
  }, [videoRef, showReplay, setShowReplay, initializePlayer, isInitializedRef]);

  // Initial render effect
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // SKIP auto-initialization if disabled (for reels)
    if (!autoInitialize) {
      console.log(`Auto-initialization disabled for video ${videoId}`);
      return;
    }

    setHasPlaybackStarted(true);
    initializePlayer();

    // SKIP auto-play if disabled
    if (disableAutoPlay) {
      console.log(`Auto-play disabled for video ${videoId}`);
      return;
    }

    const videoEl = videoRef.current;
    if (videoEl) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          setHasPlaybackStarted(false);
        });
      }
    }
  }, [
    videoId,
    videoRef,
    isFirstRenderRef,
    setHasPlaybackStarted,
    initializePlayer,
    autoInitialize,
    disableAutoPlay,
  ]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      abortAllRequests();
      cleanupMediaSource();

      if (recoveryAbortRef.current) {
        try {
          recoveryAbortRef.current.abort();
        } catch (e) {}
        recoveryAbortRef.current = null;
      }

      if (evictionIntervalRef.current) {
        clearInterval(evictionIntervalRef.current);
      }

      if (rebufferTimeoutRef.current) {
        clearTimeout(rebufferTimeoutRef.current);
      }

      if (videoRef.current) {
        videoRef.current.src = "";
      }
    };
  }, [
    abortAllRequests,
    cleanupMediaSource,
    recoveryAbortRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
    videoRef,
  ]);

  // Event listeners for pause/play
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    console.log("Setting up video event listeners for pause/play");

    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("play", onPlayResume);

    return () => {
      console.log("Cleaning up video event listeners");
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("play", onPlayResume);
    };
  }, [videoRef, onPause, onPlayResume]);

  // Load saved position
  useEffect(() => {
    const saved = getSavedPosition(videoId);
    if (saved && saved.currentTime > 0) {
      setSavedPosition(saved.currentTime);

      // Auto-resume from saved position
      const video = videoRef.current;
      if (video && hasPlaybackStarted) {
        // Seek to saved position (with a small buffer for better UX)
        const resumeTime = Math.max(0, saved.currentTime - 5);
        video.currentTime = resumeTime;

        // Show toast after a short delay
        const timer = setTimeout(() => {
          setShowResumeToast(true);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [videoId, getSavedPosition, hasPlaybackStarted, videoRef]);

  // Start auto-saving when playback starts
  useEffect(() => {
    if (hasPlaybackStarted && videoRef.current) {
      const getCurrentQuality = () =>
        typeof currentQuality === "object"
          ? (currentQuality as any)?.label || "auto"
          : "auto";

      startAutoSave(videoRef, videoId, getCurrentQuality);
    }

    return () => {
      stopAutoSave();
    };
  }, [
    hasPlaybackStarted,
    videoId,
    startAutoSave,
    stopAutoSave,
    currentQuality,
    videoRef,
  ]);

  // Save position when video ends
  const handleVideoEnded = useCallback(() => {
    clearPosition(videoId);
    setSavedPosition(null);
    setShowReplay(true);
  }, [videoId, clearPosition, setSavedPosition, setShowReplay]);

  // Save position before unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && !video.ended) {
        const qualityLabel =
          typeof currentQuality === "object"
            ? (currentQuality as any)?.label || "auto"
            : "auto";

        savePosition(videoId, video.currentTime, video.duration, qualityLabel);
      }
    };
  }, [videoId, savePosition, currentQuality, videoRef]);

  // Detect buffering state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setBufferProgress(0);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      setBufferProgress(0);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;
          setBufferProgress(progress);
        }
      }
    };

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("ended", handleVideoEnded);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleVideoEnded);
    };
  }, [videoRef, setIsBuffering, setBufferProgress, handleVideoEnded]);

  // Monitor stalling for buffering indicator
  useEffect(() => {
    if (isStalledRef.current) {
      setIsBuffering(true);
    }
  }, [isStalledRef.current, setIsBuffering]);

  // Update throughput stats
  useEffect(() => {
    const updateStatsInterval = setInterval(() => {
      const throughputKbps = Math.round(throughputEMARef.current / 1000);

      setCurrentStats((prev: any) => ({
        ...prev,
        throughput: throughputKbps,
        quality: availableQualities[uiVideoQualityIdx]?.label || "Auto",
      }));
    }, 1000);

    return () => clearInterval(updateStatsInterval);
  }, [
    availableQualities,
    uiVideoQualityIdx,
    throughputEMARef,
    setCurrentStats,
  ]);

  // const handleStartFromBeginning = useCallback(() => {
  //   if (videoRef.current) {
  //     videoRef.current.currentTime = 0;
  //     setShowResumePrompt(false);
  //     clearPosition(videoId);
  //   }
  // }, [videoId, clearPosition]);

  const handleStartFromBeginning = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setShowResumePrompt(false);
      clearPosition(videoId);
      setSavedPosition(null);
      // Actually play the video after starting from beginning
      videoRef.current.play().catch(console.error);
    }
  }, [videoId, clearPosition, setSavedPosition]);

  // const handleResume = useCallback(() => {
  //   if (savedPosition && videoRef.current) {
  //     videoRef.current.currentTime = savedPosition;
  //     setShowResumePrompt(false);
  //     handlePlayButtonClick();
  //   }
  // }, [savedPosition, handlePlayButtonClick]);

  const handleResume = useCallback(() => {
    if (savedPosition && videoRef.current) {
      videoRef.current.currentTime = savedPosition - 10;
      setShowResumePrompt(false);
      // Actually play the video after resuming
      videoRef.current.play().catch(console.error);
    }
  }, [savedPosition]);

  useEffect(() => {
    if (savedPosition && savedPosition > 0 && hasPlaybackStarted === false) {
      setShouldShowResumeAfterPlay(true);
    }
  }, [savedPosition, hasPlaybackStarted]);

  // Return the resume handlers for use in components
  return {
    // handleResume,
    handleStartFromBeginning,
  };
}
