// hooks/reels/useReelPlayer.ts
import { useEffect, useCallback, useRef } from "react";
import { useGrpcPlayer } from "../../../../src/hooks";
import type { Reel } from "../../../../src/types/reel.types";

interface UseReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload: boolean;
  onReady?: () => void;
  onEnded?: () => void;
}

export function useReelPlayer({
  reel,
  isActive,
  shouldPreload,
  onReady,
  onEnded,
}: UseReelPlayerProps) {
  const player = useGrpcPlayer({ videoId: reel.videoId });
  const hasPreloaded = useRef(false);

  // Preload when needed
  useEffect(() => {
    if (shouldPreload && !hasPreloaded.current && !isActive) {
      // Start initializing but don't play
      player.videoRef.current?.load();
      hasPreloaded.current = true;
    }
  }, [shouldPreload, isActive, player]);

  // Play/pause based on active state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    if (isActive) {
      // Play when active
      video.play().catch(console.error);
    } else {
      // Pause when not active
      video.pause();
      // Reset to beginning if not adjacent
      video.currentTime = 0;
    }
  }, [isActive, player.videoRef]);

  // Handle video ended
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (isActive && onEnded) {
        onEnded();
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [isActive, onEnded, player.videoRef]);

  // Handle ready state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (onReady) {
        onReady();
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [onReady, player.videoRef]);

  const cleanup = useCallback(() => {
    const video = player.videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = "";
    }
  }, [player.videoRef]);

  return {
    ...player,
    cleanup,
  };
}
