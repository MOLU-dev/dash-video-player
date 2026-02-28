// components/VideoPlayer.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CustomControls } from "./CustomControls";
import type { QualityInfo } from "../../../src/types/player.types";
import { SettingsState } from "./Settings";
import { CenterPlayButton } from "./CenterPlayButton";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  thumbnailUrl?: string;
  spriteUrl?: string;
  vttUrl?: string;
  isTheatreMode?: boolean;
  onTheatreModeChange?: (isTheatre: boolean) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  availableQualities: QualityInfo[];
  currentQuality: string | number;
  onQualityChange: (quality: string | number) => void;
  isFirstRenderRef: React.RefObject<boolean>;
}

export function VideoPlayer({
  videoRef,
  thumbnailUrl = "",
  spriteUrl,
  vttUrl,
  isTheatreMode = false,
  onTheatreModeChange,
  onPlay,
  onPause,
  onSeek,
  onPlaybackRateChange,
  availableQualities,
  currentQuality,
  onQualityChange,
  isFirstRenderRef,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [internalTheatreMode, setInternalTheatreMode] = useState(isTheatreMode);
  const [showCenterFlash, setShowCenterFlash] = useState(false);
  const [showInitialOverlay, setShowInitialOverlay] = useState(true);

  const centerFlashTimeoutRef = useRef<NodeJS.Timeout>(null);

  const [settings, setSettings] = useState<SettingsState>({
    playbackRate: 1,
    quality: "auto",
    autoplay: false,
    annotations: false,
    subtitles: false,
  });

  // Sync with isFirstRenderRef - only set once on mount
  useEffect(() => {
    setShowInitialOverlay(isFirstRenderRef.current);
  }, [isFirstRenderRef]);

  // Sync external theatre mode state
  useEffect(() => {
    setInternalTheatreMode(isTheatreMode);
  }, [isTheatreMode]);

  // Update current time as video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleRateChange = () => {
      setPlaybackRate(video.playbackRate);
      onPlaybackRateChange?.(video.playbackRate);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Update both ref and state when video starts playing
      if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false;
        setShowInitialOverlay(false);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (settings.autoplay) {
        console.log("Autoplay next video");
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [videoRef, onPlaybackRateChange, settings.autoplay, isFirstRenderRef]);

  const triggerCenterFlash = (type: "play" | "pause") => {
    if (centerFlashTimeoutRef.current) {
      clearTimeout(centerFlashTimeoutRef.current);
    }

    setShowCenterFlash(true);
    const flashElement = document.getElementById("center-flash-type");
    if (flashElement) {
      flashElement.setAttribute("data-type", type);
    }

    centerFlashTimeoutRef.current = setTimeout(() => {
      setShowCenterFlash(false);
    }, 500);
  };

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      onPause?.();
      if (!showInitialOverlay) {
        triggerCenterFlash("pause");
      }
    } else {
      video.play().catch(console.error);
      onPlay?.();
      if (!showInitialOverlay) {
        triggerCenterFlash("play");
      }
    }
  }, [isPlaying, videoRef, onPlay, onPause, showInitialOverlay]);

  const handleInitialPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Update both ref and state
    isFirstRenderRef.current = false;
    setShowInitialOverlay(false);
    video.play().catch(console.error);
    onPlay?.();
  }, [videoRef, onPlay, isFirstRenderRef]);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      const rect = video.getBoundingClientRect();
      const clickY = e.clientY - rect.top;

      if (clickY > rect.height - 80) {
        return;
      }

      handlePlayPause();
    },
    [handlePlayPause]
  );

  const handleSeek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      video.currentTime = time;
      setCurrentTime(time);
      onSeek?.(time);
    },
    [videoRef, onSeek]
  );

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      video.volume = newVolume;
      video.muted = newVolume === 0;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    },
    [videoRef]
  );

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [videoRef]);

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;

      video.playbackRate = rate;
      setPlaybackRate(rate);
      onPlaybackRateChange?.(rate);
    },
    [videoRef, onPlaybackRateChange]
  );

  const handleFullscreenToggle = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
  }, [videoRef]);

  const handleTheatreModeToggle = useCallback(() => {
    const newMode = !internalTheatreMode;
    setInternalTheatreMode(newMode);
    onTheatreModeChange?.(newMode);
  }, [internalTheatreMode, onTheatreModeChange]);

  const handlePipToggle = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  }, [videoRef]);

  const handleSettingsChange = useCallback(
    (newSettings: Partial<SettingsState>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };

        // Handle quality change
        if (newSettings.quality && newSettings.quality !== prev.quality) {
          onQualityChange?.(newSettings.quality);
          console.log("Quality changed to:", newSettings.quality);
        }

        // Handle playback rate change
        if (
          newSettings.playbackRate &&
          newSettings.playbackRate !== prev.playbackRate
        ) {
          handlePlaybackRateChange(newSettings.playbackRate);
        }

        // Handle subtitles toggle
        if (newSettings.subtitles !== undefined && videoRef.current) {
          const video = videoRef.current;
          const tracks = video.textTracks;
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = newSettings.subtitles ? "showing" : "hidden";
          }
        }

        return updated;
      });
    },
    [videoRef, onQualityChange, handlePlaybackRateChange]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          handlePlayPause();
          break;
        case "f":
          e.preventDefault();
          handleFullscreenToggle();
          break;
        case "t":
          e.preventDefault();
          handleTheatreModeToggle();
          break;
        case "i":
          e.preventDefault();
          handlePipToggle();
          break;
        case "m":
          e.preventDefault();
          handleMuteToggle();
          break;
        case "c":
          e.preventDefault();
          handleSettingsChange({ subtitles: !settings.subtitles });
          break;
        case "arrowleft":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 5));
          break;
        case "arrowright":
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 5));
          break;
        case "j":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 10));
          break;
        case "l":
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 10));
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "0":
        case "home":
          e.preventDefault();
          handleSeek(0);
          break;
        case "end":
          e.preventDefault();
          handleSeek(duration);
          break;
        case ">":
          e.preventDefault();
          handlePlaybackRateChange(Math.min(2, playbackRate + 0.25));
          break;
        case "<":
          e.preventDefault();
          handlePlaybackRateChange(Math.max(0.25, playbackRate - 0.25));
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          handleSeek((percent / 100) * duration);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    handlePlayPause,
    handleFullscreenToggle,
    handleTheatreModeToggle,
    handlePipToggle,
    handleMuteToggle,
    handleSeek,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSettingsChange,
    currentTime,
    duration,
    volume,
    playbackRate,
    settings.subtitles,
  ]);

  return (
    <div
      className={`video-container ${internalTheatreMode ? "theatre-mode" : ""}`}
    >
      <video
        ref={videoRef}
        className="video-player"
        onClick={handleVideoClick}
        crossOrigin="anonymous"
      />

      {showCenterFlash && !showInitialOverlay && (
        <div
          className="center-flash"
          id="center-flash-type"
          data-type={isPlaying ? "play" : "pause"}
        >
          <div className="flash-icon">
            {isPlaying ? (
              <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path
                  d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"
                  fill="#fff"
                ></path>
              </svg>
            ) : (
              <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path
                  d="M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z"
                  fill="#fff"
                ></path>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Center Play Button with Thumbnail */}
      <CenterPlayButton
        isPlaying={isPlaying}
        isInitialState={showInitialOverlay}
        thumbnailUrl={thumbnailUrl}
        onPlay={handleInitialPlay}
      />

      <CustomControls
        videoRef={videoRef}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        playbackRate={playbackRate}
        isTheatreMode={internalTheatreMode}
        settings={settings}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onPlaybackRateChange={handlePlaybackRateChange}
        onFullscreenToggle={handleFullscreenToggle}
        onTheatreModeToggle={handleTheatreModeToggle}
        onPipToggle={handlePipToggle}
        onSettingsChange={handleSettingsChange}
        availableQualities={availableQualities}
        onQualityChange={onQualityChange}
        currentQuality={currentQuality}
        spriteUrl={spriteUrl}
        vttUrl={vttUrl}
      />

      <style jsx>{`
        .video-container {
          position: relative;
          width: 100%;
          background: #000;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .video-container.theatre-mode {
          max-width: 100% !important;
          margin: 0 auto;
        }

        .video-player {
          width: 100%;
          display: block;
          max-height: 450px;
          cursor: pointer;
          transition: max-height 0.3s ease;
        }

        .video-container.theatre-mode .video-player {
          max-height: calc(100vh - 150px);
        }

        .center-flash {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 40;
          animation: flash-fade 0.5s ease-out;
        }

        .flash-icon {
          width: 40px;
          height: 40px;
          color: white;
        }

        @keyframes flash-fade {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          70% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @media (max-width: 600px) {
          .video-player {
            max-height: 300px;
          }

          .video-container.theatre-mode .video-player {
            max-height: 400px;
          }

          .center-flash {
            width: 60px;
            height: 60px;
          }

          .flash-icon {
            width: 30px;
            height: 30px;
          }
        }
      `}</style>
    </div>
  );
}
