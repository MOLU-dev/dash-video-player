// hooks/reels/useReelPlayer.ts
import {
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useGrpcPlayer } from "../../../../src/hooks/index";
import type { Reel, ReelPlayerHandle } from "../../../../src/types/reel.types";

interface UseReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload: boolean;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export function useReelPlayer({
  reel,
  isActive,
  shouldPreload,
  onReady,
  onEnded,
  onError,
}: UseReelPlayerProps) {
  const player = useGrpcPlayer({ videoId: reel.videoId });
  const hasPreloaded = useRef(false);
  const hasNotifiedReady = useRef(false);
  const isPlayingRef = useRef(false);

  // Preload when needed (but not active)
  useEffect(() => {
    if (shouldPreload && !hasPreloaded.current && !isActive) {
      const video = player.videoRef.current;
      if (video && video.readyState < 2) {
        // Preload metadata and some buffer
        video.preload = "auto";
        video.load();
        hasPreloaded.current = true;

        console.log(`Preloading reel ${reel.id}`);
      }
    }
  }, [shouldPreload, isActive, player.videoRef, reel.id]);

  // Play/pause based on active state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handlePlayPause = async () => {
      if (isActive) {
        // Play when active
        try {
          await video.play();
          isPlayingRef.current = true;
          console.log(`Playing reel ${reel.id}`);
        } catch (error) {
          console.error(`Error playing reel ${reel.id}:`, error);
          if (onError) {
            onError(error as Error);
          }
        }
      } else {
        // Pause when not active
        if (isPlayingRef.current) {
          video.pause();
          isPlayingRef.current = false;
          console.log(`Paused reel ${reel.id}`);
        }

        // Reset to beginning if we're far from the window
        // (keeps played reels at start for quick replay)
        if (!shouldPreload) {
          video.currentTime = 0;
        }
      }
    };

    handlePlayPause();
  }, [isActive, shouldPreload, player.videoRef, reel.id, onError]);

  // Handle video ended
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      isPlayingRef.current = false;
      if (isActive && onEnded) {
        console.log(`Reel ${reel.id} ended`);
        onEnded();
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [isActive, onEnded, player.videoRef, reel.id]);

  // Handle ready state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (!hasNotifiedReady.current && onReady) {
        console.log(`Reel ${reel.id} ready to play`);
        onReady();
        hasNotifiedReady.current = true;
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [onReady, player.videoRef, reel.id]);

  // Handle errors
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleError = () => {
      const error = video.error;
      console.error(`Reel ${reel.id} error:`, error);
      if (onError && error) {
        onError(new Error(error.message || "Video playback error"));
      }
    };

    video.addEventListener("error", handleError);
    return () => video.removeEventListener("error", handleError);
  }, [onError, player.videoRef, reel.id]);

  // Create player handle for external control
  const playerHandle: ReelPlayerHandle = {
    play: async () => {
      const video = player.videoRef.current;
      if (video) {
        await video.play();
        isPlayingRef.current = true;
      }
    },
    pause: () => {
      const video = player.videoRef.current;
      if (video) {
        video.pause();
        isPlayingRef.current = false;
      }
    },
    reset: () => {
      const video = player.videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
        isPlayingRef.current = false;
      }
    },
    cleanup: () => {
      const video = player.videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.src = "";
        isPlayingRef.current = false;
      }
      hasPreloaded.current = false;
      hasNotifiedReady.current = false;
    },
    isReady: () => {
      const video = player.videoRef.current;
      return video ? video.readyState >= 2 : false;
    },
  };

  return {
    ...player,
    playerHandle,
    isPlaying: isPlayingRef.current,
  };
}
