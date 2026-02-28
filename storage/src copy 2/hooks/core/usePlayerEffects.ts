//hooks/core/usePlayerEffect
import { useEffect } from "react";
import type {
  Representation,
  QualityInfo,
} from "../../../../src/types/player.types";

interface UsePlayerEffectsProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReps: Representation[];
  availableQualities: QualityInfo[];
  uiVideoQualityIdx: number;
  showReplay: boolean;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  videoQualityIdxRef: React.RefObject<number>;
  playheadVelocityRef: React.RefObject<number>;
  throughputEMARef: React.RefObject<number>;
  durationRef: React.RefObject<number>;
  isFirstRenderRef: React.RefObject<boolean>;
  evictionIntervalRef: React.RefObject<number | null>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  recoveryAbortRef: React.RefObject<AbortController | null>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  isPausedRef: React.RefObject<boolean>; // CRITICAL
  setAvailableQualities: (qualities: QualityInfo[]) => void;
  setCurrentStats: (fn: (prev: any) => any) => void;
  setHasPlaybackStarted: (started: boolean) => void;
  shouldAllowQualitySwitch: (context: string) => boolean;
  decideQuality: () => number;
  switchQuality: (newIdx: number) => Promise<void>;
  handleEnded: () => void;
  handleError: () => void;
  handlePlay: () => void;
  initializePlayer: () => void;
  abortAllRequests: () => void;
  cleanupMediaSource: () => void;
  currentQuality: string | number; // Add this
}

export function usePlayerEffects(props: UsePlayerEffectsProps) {
  const {
    videoId,
    videoRef,
    videoReps,
    availableQualities,
    uiVideoQualityIdx,
    showReplay,
    mediaSourceStateRef,
    videoQualityIdxRef,
    playheadVelocityRef,
    throughputEMARef,
    durationRef,
    isFirstRenderRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
    recoveryAbortRef,
    videoFinishedRef,
    audioFinishedRef,
    isPausedRef, // CRITICAL
    setAvailableQualities,
    setCurrentStats,
    setHasPlaybackStarted,
    shouldAllowQualitySwitch,
    decideQuality,
    switchQuality,
    handleEnded,
    handleError,
    handlePlay,
    initializePlayer,
    abortAllRequests,
    cleanupMediaSource,
    currentQuality,
  } = props;

  // Effect for updating available qualities
  useEffect(() => {
    if (videoReps.length > 0) {
      const qualities = [...videoReps]
        .sort((a, b) => a.bandwidth - b.bandwidth)
        .map((rep, index) => ({
          id: index.toString(),
          label: rep.height
            ? `${rep.height}p`
            : `${Math.round(rep.bandwidth / 1000)}kbps`,
        }));

      setAvailableQualities(qualities);
      setCurrentStats((prev) => ({
        ...prev,
        quality: qualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
    }
  }, [videoReps, videoQualityIdxRef, setAvailableQualities, setCurrentStats]);

  // Effect for auto mode quality checking
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

  // Effect for playhead velocity tracking
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

  // Effect for video ended/error events
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.addEventListener("ended", handleEnded);
    videoEl.addEventListener("error", handleError);

    return () => {
      videoEl.removeEventListener("ended", handleEnded);
      videoEl.removeEventListener("error", handleError);
    };
  }, [videoRef, handleEnded, handleError]);

  // Effect for play event
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.addEventListener("play", handlePlay);
    return () => videoEl.removeEventListener("play", handlePlay);
  }, [videoRef, handlePlay]);

  // Effect for initial playback
  // Only initialize but don't auto-play
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    setHasPlaybackStarted(true);
    initializePlayer();
  }, [
    videoId,
    videoRef,
    isFirstRenderRef,
    setHasPlaybackStarted,
    initializePlayer,
  ]);

  // Effect for cleanup
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

  // Effect for updating throughput in stats
  useEffect(() => {
    const updateStatsInterval = setInterval(() => {
      const throughputKbps = Math.round(throughputEMARef.current / 1000);

      setCurrentStats((prev) => ({
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
