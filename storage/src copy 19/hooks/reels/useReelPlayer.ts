
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGrpcPlayer } from '../index';

interface UseReelPlayerProps {
  videoId: string;
  isActive: boolean;
  initialTime?: number;
  onStateChange?: (state: ReelVideoState) => void;
}

interface ReelVideoState {
  currentTime: number;
  duration: number;
  bufferedRanges: Array<{ start: number; end: number }>;
  wasPlaying: boolean;
}

export function useReelPlayer({
  videoId,
  isActive,
  initialTime = 0,
  onStateChange,
}: UseReelPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const isFirstPlayRef = useRef(true);
  const stateUpdateIntervalRef = useRef<number | null>(null);

  const playerState = useGrpcPlayer({
    videoId,
    autoInitialize: isActive,
    disableAutoPlay: !isActive,
  });

  const { videoRef, handlePlay, handlePause } = playerState;

  // Restore initial playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialTime <= 0) return;

    const restorePosition = () => {
      if (video.readyState >= 2) {
        video.currentTime = initialTime;
        setIsReady(true);
      }
    };

    if (video.readyState >= 2) {
      restorePosition();
    } else {
      video.addEventListener('loadedmetadata', restorePosition, { once: true });
    }
  }, [videoRef, initialTime]);

  // Handle active state changes (play/pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      if (isFirstPlayRef.current) {
        video.muted = isMuted;
        isFirstPlayRef.current = false;
      }

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Autoplay failed, trying muted:', error);
          video.muted = true;
          setIsMuted(true);
          video.play().catch(console.error);
        });
      }
    } else {
      video.pause();
    }
  }, [isActive, videoRef, isMuted]);

  // Track readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setIsReady(true);
    const handleWaiting = () => setIsReady(false);

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [videoRef]);

  // Periodically save state
  useEffect(() => {
    if (!isActive || !onStateChange) return;

    stateUpdateIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const bufferedRanges = Array.from(
        { length: video.buffered.length },
        (_, i) => ({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        })
      );

      onStateChange({
        currentTime: video.currentTime,
        duration: video.duration,
        bufferedRanges,
        wasPlaying: !video.paused,
      });
    }, 2000);

    return () => {
      if (stateUpdateIntervalRef.current) {
        clearInterval(stateUpdateIntervalRef.current);
      }
    };
  }, [isActive, onStateChange, videoRef]);

  // Save final state when becoming inactive
  useEffect(() => {
    return () => {
      if (!isActive && onStateChange) {
        const video = videoRef.current;
        if (!video) return;

        const bufferedRanges = Array.from(
          { length: video.buffered.length },
          (_, i) => ({
            start: video.buffered.start(i),
            end: video.buffered.end(i),
          })
        );

        onStateChange({
          currentTime: video.currentTime,
          duration: video.duration,
          bufferedRanges,
          wasPlaying: !video.paused,
        });
      }
    };
  }, [isActive, onStateChange, videoRef]);

  // Toggle mute function
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const newMutedState = !video.muted;
      video.muted = newMutedState;
      setIsMuted(newMutedState);
      return newMutedState;
    }
    return isMuted;
  }, [videoRef, isMuted]);

  return {
    ...playerState,
    isMuted,
    isReady,
    toggleMute,
  };
}