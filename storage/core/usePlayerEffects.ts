import { useEffect } from "react";
import type { Representation } from "../../src/types/player.types";

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
  setAvailableQualities: React.Dispatch<
    React.SetStateAction<Array<{ id: string; label: string }>>
  >;
  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  setHasPlaybackStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReplay: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAllowQualitySwitch: (context: string) => boolean;
  decideQuality: () => number;
  switchQuality: (newIdx: number) => Promise<void>;
  abortAllRequests: () => void;
  cleanupMediaSource: () => void;
  initializePlayer: () => void;
  resetPlayer: () => void;
  currentQuality: string | number;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  isPausedRef: React.RefObject<boolean>;
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
  setAvailableQualities,
  setCurrentStats,
  setHasPlaybackStarted,
  setShowReplay,
  shouldAllowQualitySwitch,
  decideQuality,
  switchQuality,
  abortAllRequests,
  cleanupMediaSource,
  initializePlayer,
  resetPlayer,
  currentQuality,
  isPausedRef,
  audioFinishedRef,
  videoFinishedRef,
}: UsePlayerEffectsProps) {
  // Update available qualities when video reps change
  useEffect(() => {
    if (videoReps.length > 0) {
      const qualities = [...videoReps]
        .sort((a, b) => a.bandwidth - b.bandwidth)
        .map((rep) => ({
          id: rep.id,
          label: rep.height
            ? `${rep.height}p`
            : `${Math.round(rep.bandwidth / 1000)}kbps`,
        }));

      setAvailableQualities(qualities);
      setCurrentStats((prev: any) => ({
        ...prev,
        quality: qualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
    }
  }, [videoReps, videoQualityIdxRef, setAvailableQualities, setCurrentStats]);

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

    const handleError = () => {
      console.error("Video element error:", videoEl.error);
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

    setHasPlaybackStarted(true);
    initializePlayer();

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
}
