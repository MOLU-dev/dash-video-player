// components/VideoPlayer.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CustomControls } from "./CustomControls";
import type { QualityInfo } from "@/types/player.types";
import { SettingsState } from "./Settings";
import { CenterPlayButton } from "./CenterPlayButton";
import { ResumePrompt } from "./ResumePrompt";
import { BufferingIndicator } from "./BufferingIndicator";
import { useVideoGestures } from "@/hooks/useVideoGestures";
import { GestureIndicator } from "./GestureIndicator"; // ADD THIS IMPORT

import { Toast } from "./Toast";
import DownloadButton from "./player/DownloadButton";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  thumbnailUrl?: string;
  spriteUrl?: string;
  vttUrl?: string;
  isBuffering?: boolean;
  bufferProgress?: number;
  showResumePrompt?: boolean;
  savedPosition?: number | null;
  onResume?: () => void;
  onStartFromBeginning?: () => void;
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
  onDismissResumeToast?: () => void;
  showResumeToast?: boolean;

  //
  videoId: string;
  representationId: string;
  totalSegments: number;
  title: string;
  duration: number;
  quality: string;
  thumbnail: string;
  isVideoDownloaded: boolean;
  downloadProgress: number;
  downloadStatus: string;

  //

  canSwitchQuality?: boolean; // NEW
  qualitySwitchBlockReason?: string; // NEW
  onDownload: () => void;
  onPauseDownload: () => void;
  onResumeDownload: () => void;
  onCancelDownload: () => void;
  onDeleteDownload: () => void;
  onShowDownloads: () => void;
  clearAllDownloads: () => void;
  getDownloadStatus: (videoId: string) => Promise<{
    totalSegments: number;
    downloadedSegments: number;
    progress: number;
  } | null>;
  isQualitySwitchBlocked?: boolean; // Add this
}

const SEEK_AMOUNT = 10; // seconds

export function VideoPlayer({
  videoRef,
  thumbnailUrl = "",
  spriteUrl,
  vttUrl,
  isBuffering = false,
  bufferProgress = 0,
  showResumePrompt = false,
  savedPosition = null,

  isTheatreMode = false,

  availableQualities,
  currentQuality,
  isFirstRenderRef,
  showResumeToast = false,
  //
  videoId,
  representationId,
  totalSegments,
  title,
  // duration,
  quality,
  thumbnail,
  isVideoDownloaded,
  downloadProgress,
  downloadStatus,
  canSwitchQuality,
  qualitySwitchBlockReason,

  onDownload,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onDeleteDownload,
  onShowDownloads,
  getDownloadStatus,
  onResume,
  onStartFromBeginning,
  onTheatreModeChange,
  onPlay,
  onPause,
  onSeek,
  onPlaybackRateChange,
  onQualityChange,

  onDismissResumeToast,
  isQualitySwitchBlocked = false, // Add default
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
  const [brightness, setBrightness] = useState(100); // 0-100 scale
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [shouldShowResumeAfterPlay, setShouldShowResumeAfterPlay] =
    useState(false);

  const playbutton = useRef<NodeJS.Timeout>(null);

  const [settings, setSettings] = useState<SettingsState>({
    playbackRate: 1,
    quality: "auto",
    autoplay: false,
    annotations: false,
    subtitles: false,
  });

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

  const seek = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return 0;

      const newTime = Math.max(
        0,
        Math.min(video.duration, video.currentTime + delta)
      );
      const actualDelta = newTime - video.currentTime;

      handleSeek(newTime);
      return actualDelta; // Return actual seek amount for visual feedback
    },
    [videoRef, handleSeek]
  );

  // Then create convenience wrappers
  const seekForward = useCallback(
    (amount: number = SEEK_AMOUNT) => {
      return seek(amount);
    },
    [seek]
  );

  const seekBackward = useCallback(
    (amount: number = SEEK_AMOUNT) => {
      return seek(-amount);
    },
    [seek]
  );

  // Brightness adjustment
  const adjustBrightness = useCallback((delta: number) => {
    setBrightness((prev) => {
      const newBrightness = Math.max(0, Math.min(100, prev + delta));
      return newBrightness;
    });
  }, []);

  // Volume adjustment
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      video.volume = clampedVolume;
      video.muted = clampedVolume === 0;
      setVolume(clampedVolume);
      setIsMuted(clampedVolume === 0);
    },
    [videoRef]
  );

  const {
    gestureIndicator,
    showIndicator,
    accumulateSeek, // add this
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
  } = useVideoGestures({
    onDoubleTapLeft: () => {
      const amount = seek(-SEEK_AMOUNT);
      accumulateSeek?.("left", amount);
    },
    onDoubleTapRight: () => {
      const amount = seek(SEEK_AMOUNT);
      accumulateSeek?.("right", amount);
    },

    onSwipeVertical: (direction, side, delta) => {
      const video = videoRef.current;
      if (!video) return;

      // Calculate adjustment based on swipe distance
      const adjustment = (direction === "up" ? 1 : -1) * (delta / 100);

      if (side === "left") {
        // Brightness control on left side
        const brightnessAdjust = adjustment * 5; // Scale for brightness (0-100 range)
        adjustBrightness(brightnessAdjust);
        showIndicator("brightness", brightness + brightnessAdjust, "left");
      } else {
        // Volume control on right side
        const volumeAdjust = adjustment * 0.1; // Scale for volume (0-1 range)
        const newVolume = Math.max(0, Math.min(1, video.volume + volumeAdjust));
        handleVolumeChange(newVolume);
        showIndicator("volume", newVolume * 100, "right");
      }
    },
    onVolumeChange: (delta) => {
      const video = videoRef.current;
      if (!video) return;

      const newVolume = Math.max(0, Math.min(1, video.volume + delta));
      handleVolumeChange(newVolume);
      showIndicator("volume", newVolume * 100, "right");
    },
    onBrightnessChange: (delta) => {
      adjustBrightness(delta * 50); // Scale delta to brightness range
      showIndicator("brightness", brightness + delta * 50, "left");
    },
  });

  // Attach gesture handlers to video container
  useEffect(() => {
    const container = videoContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // Touch events for mobile
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    // Mouse events for desktop
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    // Keyboard events
    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    videoRef,
  ]);

  // Apply brightness filter to video
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.style.filter = `brightness(${brightness}%)`;
    }
  }, [brightness, videoRef]);

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
    if (playbutton.current) {
      clearTimeout(playbutton.current);
    }

    setShowCenterFlash(true);
    const flashElement = document.getElementById("center-flash-type");
    if (flashElement) {
      flashElement.setAttribute("data-type", type);
    }

    playbutton.current = setTimeout(() => {
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
    // isFirstRenderRef.current = false;
    setShowInitialOverlay(false);
    //  video.play().catch(console.error);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Let the gesture hook handle volume and brightness keys first
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        ((e.ctrlKey || e.metaKey) &&
          (e.key === "ArrowUp" || e.key === "ArrowDown"))
      ) {
        return; // Let gesture hook handle these
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
          seek(-5);
          break;
        case "arrowright":
          e.preventDefault();
          seek(5);
          break;
        case "j":
          e.preventDefault();
          seekBackward(10);
          break;
        case "l":
          e.preventDefault();
          seekForward(10);
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
    handlePlaybackRateChange,
    handleSettingsChange,
    currentTime,
    duration,
    playbackRate,
    settings.subtitles,
    seekForward,
    seekBackward,
  ]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={videoContainerRef}
      className={`video-container ${internalTheatreMode ? "theatre-mode" : ""}`}
      tabIndex={0} // Required for keyboard events
    >
      <video
        ref={videoRef}
        className="video-player"
        onClick={handleVideoClick}
        // crossOrigin="anonymous"
      />
      {/* REPLACE the inline GestureIndicator with the imported component */}
      {gestureIndicator && (
        <GestureIndicator
          type={gestureIndicator.type}
          value={gestureIndicator.value}
          side={gestureIndicator.side}
        />
      )}

      {/* {showResumePrompt &&
        savedPosition &&
        onResume &&
        onStartFromBeginning && (
          <ResumePrompt
            savedTime={savedPosition}
            onResume={onResume}
            onStartFromBeginning={onStartFromBeginning}
          />
        )} */}

      {!showInitialOverlay &&
        showResumePrompt &&
        savedPosition &&
        onResume &&
        onStartFromBeginning && (
          <ResumePrompt
            savedTime={savedPosition}
            onResume={onResume}
            onStartFromBeginning={onStartFromBeginning}
          />
        )}

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

      <BufferingIndicator
        isBuffering={isBuffering}
        bufferProgress={bufferProgress}
      />
      {showResumeToast && savedPosition && (
        <Toast
          message={`Resumed from ${formatTime(savedPosition)}`}
          actionLabel="Start Over"
          onAction={onStartFromBeginning}
          onClose={onDismissResumeToast || (() => {})}
          duration={6000}
        />
      )}

      <div className="download-button-container">
        <DownloadButton
          videoId={videoId}
          representationId={representationId}
          totalSegments={totalSegments}
          title={title}
          duration={duration}
          quality={quality}
          thumbnail={thumbnail}
          isDownloaded={isVideoDownloaded}
          downloadProgress={downloadProgress}
          downloadStatus={downloadStatus}
          onDownload={onDownload}
          onPause={onPauseDownload}
          onResume={onResumeDownload}
          onCancel={onCancelDownload}
          onDelete={onDeleteDownload}
          onCheckStatus={() => getDownloadStatus(videoId)}
        />
      </div>

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
        onShowDownloads={onShowDownloads}
        isQualitySwitchBlocked={isQualitySwitchBlocked} // Pass to controls
      />

      <style jsx>{`
        .video-container {
          position: relative;
          width: 100%;
          background: #000;
          overflow: hidden;
          transition: all 0.3s ease;
          outline: none;
          /* ADD: Minimum aspect ratio to prevent shrinking */
          aspect-ratio: 16 / 9;
          min-height: 300px;
        }

        .video-container.theatre-mode {
          max-width: 100% !important;
          margin: 0 auto;
        }

        .video-player {
          width: 100%;
          height: 100%; /* CHANGE: From display: block */
          max-height: 450px;
          cursor: pointer;
          transition: max-height 0.3s ease;
          object-fit: contain; /* ADD: Ensures video scales properly */
        }

        .video-container.theatre-mode .video-player {
          max-height: calc(100vh - 150px);
        }
        /* Download Button Container - Add this */
        .download-button-container {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 60; /* Higher than controls and other overlays */
          display: flex;
          align-items: center;
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

        /* Gesture Indicator Styles */
        .gesture-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          z-index: 45;
          animation: gesture-fade 0.8s ease-out;
        }

        .gesture-indicator.left {
          left: 20px;
        }

        .gesture-indicator.right {
          right: 20px;
        }

        .gesture-indicator.center {
          left: 50%;
          transform: translateX(-50%) translateY(-50%);
        }

        .gesture-icon {
          font-size: 24px;
        }

        .gesture-text {
          font-size: 14px;
          font-weight: 500;
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

        @keyframes gesture-fade {
          0% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
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

          .gesture-indicator {
            padding: 8px 12px;
          }

          .gesture-indicator.left {
            left: 10px;
          }

          .gesture-indicator.right {
            right: 10px;
          }

          .gesture-icon {
            font-size: 20px;
          }

          .gesture-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
