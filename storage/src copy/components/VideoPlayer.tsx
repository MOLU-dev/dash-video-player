// components/VideoPlayer.tsx
"use client";

import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { CustomControls } from "./CustomControls";
import { QualityInfo } from "../../../src/types/player.types";
interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;

  availableQualities: QualityInfo[];
  currentQuality: string | number;
  onQualityChange: (quality: string | number) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      videoRef,
      onPlay,
      onPause,
      onSeek,
      onPlaybackRateChange,
      availableQualities,
      currentQuality,
      onQualityChange,
    },
    ref
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1); // Add playback rate state
    const containerRef = useRef<HTMLDivElement>(null);

    const [showCenterOverlay, setShowCenterOverlay] = useState(false);
    const lastClickTimeRef = useRef(0);

    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const handleTimeUpdate = () => {
        setCurrentTime(videoElement.currentTime);

        if (videoElement.buffered.length > 0) {
          const bufferedEnd = videoElement.buffered.end(
            videoElement.buffered.length - 1
          );
          setBuffered(bufferedEnd);
        }
      };

      const handleLoadedMetadata = () => {
        setDuration(videoElement.duration);
        // Set initial playback rate from video element
        setPlaybackRate(videoElement.playbackRate);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };

      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };

      const handleVolumeChange = () => {
        setVolume(videoElement.volume);
      };

      const handleRateChange = () => {
        setPlaybackRate(videoElement.playbackRate);
      };

      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.addEventListener("play", handlePlay);
      videoElement.addEventListener("pause", handlePause);
      videoElement.addEventListener("volumechange", handleVolumeChange);
      videoElement.addEventListener("ratechange", handleRateChange); // Add ratechange listener
      document.addEventListener("fullscreenchange", handleFullscreenChange);

      return () => {
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
        videoElement.removeEventListener("play", handlePlay);
        videoElement.removeEventListener("pause", handlePause);
        videoElement.removeEventListener("volumechange", handleVolumeChange);
        videoElement.removeEventListener("ratechange", handleRateChange);
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
      };
    }, [videoRef, onPlay, onPause]);

    const handlePlayPause = () => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play().catch(console.error);
      }
    };

    const handleSeek = (time: number) => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      videoElement.currentTime = time;
      onSeek?.(time);
    };

    const handleVolumeChange = (newVolume: number) => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      videoElement.volume = newVolume;
      setVolume(newVolume);
    };

    const handlePlaybackRateChange = (rate: number) => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      videoElement.playbackRate = rate;
      setPlaybackRate(rate);
      onPlaybackRateChange?.(rate);
    };

    const handleFullscreen = () => {
      const container = containerRef.current;
      if (!container) return;

      if (!isFullscreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    };

    const handleVideoClick = (e: React.MouseEvent) => {
      // Don't trigger if clicking on controls
      const target = e.target as HTMLElement;
      if (
        target.closest(".custom-controls") ||
        target.closest(".center-overlay")
      ) {
        return;
      }

      // Check for double click (seek)
      const now = Date.now();
      if (now - lastClickTimeRef.current < 300) {
        // Double click detected - seek forward/backward based on click position
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (clickX < width / 2) {
          handleSeek(Math.max(0, currentTime - 10));
        } else {
          handleSeek(Math.min(duration, currentTime + 10));
        }
      } else {
        // Single click - toggle play/pause and show overlay
        handlePlayPause();
        setShowCenterOverlay(true);
      }

      lastClickTimeRef.current = now;
    };

    const handleHideCenterOverlay = useCallback(() => {
      setShowCenterOverlay(false);
    }, []);

    // Hide overlay when playing state changes (user interacted with other controls)
    useEffect(() => {
      setShowCenterOverlay(false);
    }, [isPlaying]);

    return (
      <div ref={containerRef} className="video-container">
        <video
          ref={(el) => {
            if (typeof ref === "function") {
              ref(el);
            } else if (ref) {
              ref.current = el;
            }
            if (videoRef) {
              videoRef.current = el;
            }
          }}
          className="video-player"
          preload="auto"
          onClick={handleVideoClick}
        />

        <CustomControls
          videoRef={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onFullscreen={handleFullscreen}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onQualityChange={onQualityChange} // Pass the handler
          volume={volume}
          isFullscreen={isFullscreen}
          playbackRate={playbackRate}
          currentQuality={currentQuality} // Pass current quality
          availableQualities={availableQualities} // Pass available qualities
        />

        <style jsx>{`
          .video-container {
            position: relative;
            width: 100%;
            background: #000;
            overflow: hidden;
          }

          .video-player {
            width: 100%;
            display: block;
            max-height: 450px;
            cursor: pointer;
          }

          @media (max-width: 600px) {
            .video-player {
              max-height: 300px;
            }
          }

          .video-container:fullscreen {
            width: 100vw;
            height: 100vh;
          }

          .video-container:fullscreen .video-player {
            max-height: 100vh;
            object-fit: contain;
          }
        `}</style>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
