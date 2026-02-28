import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import type { Representation } from "@/types/player.types";

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
  setCurrentQuality?: React.Dispatch<React.SetStateAction<string | number>>;
  isReelMode: boolean; // ADD THIS
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
  setCurrentQuality,
  isReelMode = false, // ADD THIS
}: UsePlayerEffectsProps) {
  // Performance optimization refs
  const rafIdRef = useRef<number | null>(null);
  const statsUpdateScheduledRef = useRef(false);
  const qualityCheckTimeoutRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  const [isQualitySwitchBlocked, setIsQualitySwitchBlocked] = useState(false);
  const isQualitySwitchBlockedRef = useRef(false);

  // Memoize sorted qualities to avoid recalculation
  const sortedQualities = useMemo(() => {
    if (videoReps.length === 0) return [];
    return [...videoReps]
      .sort((a, b) => a.bandwidth - b.bandwidth)
      .map((rep) => ({
        id: rep.id,
        label: getQualityLabel(rep),
      }));
  }, [videoReps]);

  // Debounced stats update using RAF for better performance
  const scheduleStatsUpdate = useCallback(() => {
    if (statsUpdateScheduledRef.current) return;

    statsUpdateScheduledRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      const throughputKbps = Math.round(throughputEMARef.current / 1000);
      setCurrentStats((prev: any) => ({
        ...prev,
        throughput: throughputKbps,
        quality:
          availableQualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
      statsUpdateScheduledRef.current = false;
    });
  }, [
    throughputEMARef,
    availableQualities,
    videoQualityIdxRef,
    setCurrentStats,
  ]);

  // Update available qualities when video reps change
  useEffect(() => {
    if (sortedQualities.length > 0) {
      setAvailableQualities(sortedQualities);
      scheduleStatsUpdate();
    }
  }, [sortedQualities, setAvailableQualities, scheduleStatsUpdate]);

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
      // Manual quality selection
      if (
        isPausedRef.current ||
        (videoFinishedRef.current && audioFinishedRef.current)
      ) {
        // Don't process quality changes when paused or finished
        return;
      }

      const selectedQuality = availableQualities.find(
        (q) => q.id === currentQuality.toString()
      );

      if (selectedQuality) {
        const selectedIdx = availableQualities.indexOf(selectedQuality);

        if (selectedIdx !== -1 && selectedIdx !== videoQualityIdxRef.current) {
          // Check if switch is allowed
          if (!shouldAllowQualitySwitch("manual-selection")) {
            console.log("Quality switch blocked while paused - reverting UI");

            // Block further changes temporarily
            setIsQualitySwitchBlocked(true);
            isQualitySwitchBlockedRef.current = true;

            // Revert to current quality after delay
            setTimeout(() => {
              const currentQualityId =
                availableQualities[videoQualityIdxRef.current]?.id;
              if (
                currentQualityId &&
                currentQualityId !== currentQuality.toString()
              ) {
                setCurrentQuality?.(currentQualityId);
              }
              setIsQualitySwitchBlocked(false);
              isQualitySwitchBlockedRef.current = false;
            }, 300);

            return;
          }

          // Allow the switch
          switchQuality(selectedIdx);
        }
      }
    }
  }, [
    currentQuality,
    availableQualities,
    videoQualityIdxRef,
    isPausedRef,
    videoFinishedRef,
    audioFinishedRef,
    shouldAllowQualitySwitch,
    switchQuality,
    setCurrentQuality,
  ]);

  // OPTIMIZED: Track playhead velocity with throttling
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let lastTime = 0;
    let lastTimestamp = 0;
    let throttleTimeout: number | null = null;

    const onTimeUpdate = () => {
      // Throttle to max once per 500ms
      if (throttleTimeout) return;

      throttleTimeout = window.setTimeout(() => {
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
        throttleTimeout = null;
      }, 500);
    };

    videoEl.addEventListener("timeupdate", onTimeUpdate, { passive: true });
    return () => {
      videoEl.removeEventListener("timeupdate", onTimeUpdate);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [videoRef, playheadVelocityRef]);

  // Handle video ended event
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnded = () => {
      const isAtEnd = Math.abs(videoEl.currentTime - durationRef.current) < 0.1;

      if (isAtEnd) {
        setShowReplay(true);
        videoEl.currentTime = 0;
        resetPlayer();
      } else {
        resetPlayer();
      }
    };

    const handleError = () => {
      if (videoEl.error) {
        console.error("Video element error:", {
          code: videoEl.error.code,
          message: videoEl.error.message,
        });
      }
      resetPlayer();
    };

    videoEl.addEventListener("ended", handleEnded, { passive: true });
    videoEl.addEventListener("error", handleError, { passive: true });

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

    videoEl.addEventListener("play", handlePlay, { passive: true });
    return () => videoEl.removeEventListener("play", handlePlay);
  }, [videoRef, showReplay, setShowReplay, initializePlayer, isInitializedRef]);

  // Initial render effect
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (!autoInitialize) {
      return;
    }

    // setHasPlaybackStarted(true); // Removed automatic start
    initializePlayer();

    if (disableAutoPlay || isPausedRef.current) {
      return;
    }

    // Auto-play logic moved to usePlayerInitializer to respect isLive vs VOD
    // const videoEl = videoRef.current;
    // if (videoEl) {
    //   const playPromise = videoEl.play();
    //   if (playPromise !== undefined) {
    //     playPromise.catch((error) => {
    //       setHasPlaybackStarted(false);
    //     });
    //   }
    // }
  }, [
    videoId,
    videoRef,
    isFirstRenderRef,
    setHasPlaybackStarted,
    initializePlayer,
    autoInitialize,
    disableAutoPlay,
    isPausedRef,
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

    videoEl.addEventListener("pause", onPause, { passive: true });
    videoEl.addEventListener("play", onPlayResume, { passive: true });

    return () => {
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("play", onPlayResume);
    };
  }, [videoRef, onPause, onPlayResume]);

  // Load saved position
  useEffect(() => {
    const saved = getSavedPosition(videoId);
    if (saved && saved.currentTime > 0) {
      setSavedPosition(saved.currentTime);

      const video = videoRef.current;
      if (video && hasPlaybackStarted) {
        const resumeTime = Math.max(0, saved.currentTime - 5);
        video.currentTime = resumeTime;

        const timer = setTimeout(() => {
          setShowResumeToast(true);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [
    videoId,
    getSavedPosition,
    hasPlaybackStarted,
    videoRef,
    setSavedPosition,
    setShowResumeToast,
  ]);

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

  // OPTIMIZED: Detect buffering state with passive listeners and RAF
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const options = { passive: true };
    let progressRaf: number | null = null;

    const handleWaiting = () => setIsBuffering(true);

    const handlePlaying = () => {
      setIsBuffering(false);
      setBufferProgress(0);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      setBufferProgress(0);
    };

    const handleProgress = () => {
      if (progressRaf) return;

      progressRaf = requestAnimationFrame(() => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const duration = video.duration;
          if (duration > 0) {
            const progress = (bufferedEnd / duration) * 100;
            setBufferProgress(progress);
          }
        }
        progressRaf = null;
      });
    };

    video.addEventListener("waiting", handleWaiting, options);
    video.addEventListener("playing", handlePlaying, options);
    video.addEventListener("canplay", handleCanPlay, options);
    video.addEventListener("progress", handleProgress, options);
    video.addEventListener("ended", handleVideoEnded, options);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleVideoEnded);
      if (progressRaf) cancelAnimationFrame(progressRaf);
    };
  }, [videoRef, setIsBuffering, setBufferProgress, handleVideoEnded]);

  // Monitor stalling for buffering indicator
  useEffect(() => {
    if (isStalledRef.current) {
      setIsBuffering(true);
    }
  }, [isStalledRef.current, setIsBuffering]);

  // OPTIMIZED: Update throughput stats less frequently
  useEffect(() => {
    const updateStatsInterval = setInterval(() => {
      if (isVisibleRef.current) {
        scheduleStatsUpdate();
      }
    }, 2000); // Reduced from 1000ms to 2000ms

    return () => clearInterval(updateStatsInterval);
  }, [scheduleStatsUpdate]);

  // OPTIMIZED: Intersection Observer for visibility
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;

        // Pause expensive operations when not visible
        if (!entry.isIntersecting) {
          if (qualityCheckTimeoutRef.current) {
            clearTimeout(qualityCheckTimeoutRef.current);
            qualityCheckTimeoutRef.current = null;
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(videoEl);

    return () => observer.disconnect();
  }, [videoRef]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (qualityCheckTimeoutRef.current) {
        clearTimeout(qualityCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleStartFromBeginning = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setShowResumePrompt(false);
      clearPosition(videoId);
      setSavedPosition(null);
      videoRef.current.play().catch(console.error);
    }
  }, [videoId, clearPosition, setSavedPosition, setShowResumePrompt, videoRef]);

  const handleResume = useCallback(() => {
    if (savedPosition && videoRef.current) {
      videoRef.current.currentTime = savedPosition - 10;
      setShowResumePrompt(false);
      videoRef.current.play().catch(console.error);
    }
  }, [savedPosition, setShowResumePrompt, videoRef]);

  useEffect(() => {
    if (savedPosition && savedPosition > 0 && hasPlaybackStarted === false) {
      setShouldShowResumeAfterPlay(true);
    }
  }, [savedPosition, hasPlaybackStarted, setShouldShowResumeAfterPlay]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !isReelMode) return;

    const handleEnded = () => {
      // Auto-loop in reel mode
      videoEl.currentTime = 0;
      videoEl.play().catch(console.error);
    };

    videoEl.addEventListener("ended", handleEnded);
    return () => videoEl.removeEventListener("ended", handleEnded);
  }, [videoRef, isReelMode]);

  return {
    handleStartFromBeginning,
    isQualitySwitchBlocked,
    handleResume
  };
}
