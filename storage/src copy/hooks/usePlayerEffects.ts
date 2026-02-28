import { useEffect } from "react";
import type { PlayerMode, PlayerStats } from "../../../src/types/player.types";

interface UsePlayerEffectsProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoReps: any[];
  mode: PlayerMode;
  showReplay: boolean;
  isFirstRenderRef: React.RefObject<boolean>;
  videoQualityIdxRef: React.RefObject<number>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  playheadVelocityRef: React.RefObject<number>;
  evictionIntervalRef: React.RefObject<number | null>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  recoveryAbortRef: React.RefObject<AbortController | null>;
  setAvailableQualities: (qualities: any[]) => void;
  setCurrentStats: React.Dispatch<React.SetStateAction<PlayerStats>>; // Add proper type
  setHasPlaybackStarted: (started: boolean) => void;
  setShowReplay: (show: boolean) => void;
  shouldAllowQualitySwitch: (context?: string) => boolean;
  decideQuality: () => number;
  switchQuality: (idx: number) => Promise<void>;
  resetPlayer: () => void;
  initializePlayer: () => void;
  abortAllRequests: () => void;
  cleanupMediaSource: () => void;
}

export function usePlayerEffects(props: UsePlayerEffectsProps) {
  const {
    videoId,
    videoRef,
    videoReps,
    mode,
    showReplay,
    isFirstRenderRef,
    videoQualityIdxRef,
    mediaSourceStateRef,
    playheadVelocityRef,
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
    resetPlayer,
    initializePlayer,
    abortAllRequests,
    cleanupMediaSource,
  } = props;

  // Update available qualities when video representations change
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
      setCurrentStats((prev) => ({
        ...prev,
        quality: qualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
    }
  }, [videoReps, videoQualityIdxRef, setAvailableQualities, setCurrentStats]);

  // Auto quality switching interval
  useEffect(() => {
    if (mode !== "auto" || !videoRef.current) return;

    const checkInterval = setInterval(() => {
      if (mediaSourceStateRef.current !== "open") return;

      if (!shouldAllowQualitySwitch("auto-mode")) {
        return;
      }

      const desiredQuality = decideQuality();
      if (desiredQuality !== videoQualityIdxRef.current) {
        console.log("Auto mode requesting quality switch:", {
          from: videoQualityIdxRef.current,
          to: desiredQuality,
        });
        switchQuality(desiredQuality);
      }
    }, 1500);

    return () => clearInterval(checkInterval);
  }, [
    mode,
    videoRef,
    mediaSourceStateRef,
    videoQualityIdxRef,
    shouldAllowQualitySwitch,
    decideQuality,
    switchQuality,
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

  // Handle video ended and error events
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnded = () => {
      console.log("Video playback ended");
      resetPlayer();
      videoEl.currentTime = 0;
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
  }, [videoRef, resetPlayer]);

  // Handle play event for replay
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handlePlay = () => {
      if (showReplay) {
        console.log("Replay triggered");
        setShowReplay(false);
        initializePlayer();
      }
    };

    videoEl.addEventListener("play", handlePlay);
    return () => videoEl.removeEventListener("play", handlePlay);
  }, [videoRef, showReplay, setShowReplay, initializePlayer]);

  // Auto-initialize on videoId change (skip first render)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    console.log("VideoId changed, auto-initializing:", videoId);
    setHasPlaybackStarted(true);
    initializePlayer();

    const videoEl = videoRef.current;
    if (videoEl) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Auto-play prevented:", error);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Player unmounting, cleaning up");
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
}
