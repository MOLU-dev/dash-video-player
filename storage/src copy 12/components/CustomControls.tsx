// components/CustomControls.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { PlayerIcons } from "./PlayerIcons";
import { Settings, SettingsState } from "./Settings";
import type { QualityInfo } from "../../../src/types/player.types";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface CustomControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isTheatreMode: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onFullscreenToggle: () => void;
  onTheatreModeToggle: () => void;
  onPipToggle: () => void;
  settings: SettingsState;
  spriteUrl?: string;
  vttUrl?: string;
  onSettingsChange: (settings: Partial<SettingsState>) => void;
  availableQualities: QualityInfo[];
  onQualityChange: (quality: string | number) => void;
  currentQuality: string | number;
  onShowDownloads: () => void;
}

export function CustomControls({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  isTheatreMode,
  settings,
  spriteUrl = "",
  vttUrl = "",
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onFullscreenToggle,
  onTheatreModeToggle,
  onPipToggle,
  onSettingsChange,
  availableQualities,
  onQualityChange,
  currentQuality,
  onShowDownloads,
}: CustomControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState({ x: 0 });

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartTimeRef = useRef<number>(0);

  // Check if PiP is supported
  useEffect(() => {
    setIsPipSupported(
      document.pictureInPictureEnabled && videoRef.current !== null
    );
  }, [videoRef]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const resetControlsTimeout = () => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings && !showVolumeSlider) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

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

  const getTimeFromPosition = (clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );
    return percent * duration;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const newTime = getTimeFromPosition(e.clientX);
    onSeek(newTime);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const time = getTimeFromPosition(e.clientX);
    setHoverTime(time);
    setHoverPosition({ x: e.clientX - rect.left });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartTimeRef.current = currentTime;
    const newTime = getTimeFromPosition(e.clientX);
    setHoverTime(newTime);

    // Immediately seek on mouse down
    onSeek(newTime);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !progressBarRef.current) return;

    const newTime = getTimeFromPosition(e.clientX);
    setHoverTime(newTime);

    const rect = progressBarRef.current.getBoundingClientRect();
    setHoverPosition({ x: e.clientX - rect.left });

    // Continuous seeking while dragging
    onSeek(newTime);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    setHoverTime(newTime);
    onSeek(newTime);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !progressBarRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    setHoverTime(newTime);

    const rect = progressBarRef.current.getBoundingClientRect();
    setHoverPosition({ x: touch.clientX - rect.left });

    onSeek(newTime);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, duration]);

  const getBufferedRanges = () => {
    if (!videoRef.current) return [];
    const buffered = videoRef.current.buffered;
    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: (buffered.start(i) / duration) * 100,
        width: ((buffered.end(i) - buffered.start(i)) / duration) * 100,
      });
    }
    return ranges;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedRanges = getBufferedRanges();

  return (
    <div
      className={`youtube-controls ${
        showControls || !isPlaying ? "visible" : "hidden"
      }`}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Progress Bar Section */}
      <div
        className={`progress-container ${
          isHoveringProgress || isDragging ? "hovering" : ""
        }`}
        ref={progressBarRef}
        onMouseEnter={() => setIsHoveringProgress(true)}
        onMouseLeave={() => {
          if (!isDragging) setIsHoveringProgress(false);
        }}
        onMouseMove={handleProgressHover}
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Thumbnail Preview */}
        {spriteUrl && vttUrl && (
          <ThumbnailPreview
            time={hoverTime}
            spriteUrl={spriteUrl}
            vttUrl={vttUrl}
            isVisible={isHoveringProgress || isDragging}
            position={hoverPosition}
          />
        )}

        {/* Simple time tooltip (if no thumbnails) */}
        {(!spriteUrl || !vttUrl) && (isHoveringProgress || isDragging) && (
          <div
            className="time-tooltip"
            style={{
              left: `${hoverPosition.x}px`,
              transform: "translateX(-50%)",
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}

        <div className="progress-bar-wrapper">
          {/* Buffered ranges */}
          {bufferedRanges.map((range, index) => (
            <div
              key={index}
              className="buffered-bar"
              style={{
                left: `${range.start}%`,
                width: `${range.width}%`,
              }}
            />
          ))}

          {/* Played progress */}
          <div className="played-bar" style={{ width: `${progressPercent}%` }}>
            <div className={`scrubber ${isDragging ? "dragging" : ""}`} />
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="controls-bar">
        <div className="left-controls">
          {/* Play/Pause */}
          <button
            className="control-button"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PlayerIcons.Pause /> : <PlayerIcons.Play />}
          </button>

          {/* Volume */}
          <div
            className="volume-container"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              className="control-button"
              onClick={onMuteToggle}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <PlayerIcons.VolumeMuted />
              ) : volume < 0.5 ? (
                <PlayerIcons.VolumeLow />
              ) : (
                <PlayerIcons.VolumeHigh />
              )}
            </button>

            <div
              className={`volume-slider-wrapper ${
                showVolumeSlider ? "visible" : ""
              }`}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume * 100}
                onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
                className="volume-slider"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span className="time-separator"> / </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="right-controls">
          {/* Settings */}
          <div className="settings-container">
            <button
              ref={settingsButtonRef}
              className="control-button"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
            >
              <PlayerIcons.Settings />
            </button>

            <Settings
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              currentSettings={settings}
              onSettingsChange={(newSettings) => {
                onSettingsChange(newSettings);
                if (newSettings.playbackRate) {
                  onPlaybackRateChange(newSettings.playbackRate);
                }
              }}
              availableQualities={availableQualities}
              onQualityChange={onQualityChange}
              currentQuality={currentQuality}
              onShowDownloads={onShowDownloads}
            />
          </div>

          {/* Picture-in-Picture */}
          {isPipSupported && (
            <button
              className="control-button"
              onClick={onPipToggle}
              aria-label="Picture-in-Picture"
              title="Picture-in-Picture (i)"
            >
              <PlayerIcons.PictureInPicture />
            </button>
          )}

          {/* Theatre Mode */}
          {!isFullscreen && (
            <button
              className="control-button"
              onClick={onTheatreModeToggle}
              aria-label={isTheatreMode ? "Default view" : "Theatre mode"}
              title={isTheatreMode ? "Default view (t)" : "Theatre mode (t)"}
            >
              {isTheatreMode ? (
                <PlayerIcons.TheatreModeExit />
              ) : (
                <PlayerIcons.TheatreMode />
              )}
            </button>
          )}

          {/* Fullscreen */}
          <button
            className="control-button"
            onClick={onFullscreenToggle}
            aria-label="Fullscreen"
            title="Fullscreen (f)"
          >
            {isFullscreen ? (
              <PlayerIcons.ExitFullscreen />
            ) : (
              <PlayerIcons.Fullscreen />
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .youtube-controls {
          /* Add to your existing CustomControls CSS */
          .downloads-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 2px;
            transition: background 0.1s ease;
          }

          .downloads-button:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .downloads-button svg {
            width: 20px;
            height: 20px;
          }

          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 0, 0, 0.6) 40%,
            transparent 100%
          );
          padding: 0;
          transition: opacity 0.2s ease;
          z-index: 50;
        }

        .youtube-controls.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .youtube-controls.visible {
          opacity: 1;
        }

        .progress-container {
          position: relative;
          height: 20px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          cursor: pointer;
          margin-bottom: 2px;
        }

        .progress-container.hovering {
          height: 24px;
        }

        .time-tooltip {
          position: absolute;
          bottom: 24px;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 2px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }

        .progress-bar-wrapper {
          position: relative;
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: visible;
          transition: height 0.1s ease;
        }

        .progress-container.hovering .progress-bar-wrapper {
          height: 5px;
        }

        .buffered-bar {
          position: absolute;
          height: 100%;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 2px;
        }

        .played-bar {
          position: relative;
          height: 100%;
          background: #f00;
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .scrubber {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%) scale(0);
          width: 12px;
          height: 12px;
          background: #f00;
          border-radius: 50%;
          transition: transform 0.1s ease;
        }

        .progress-container.hovering .scrubber {
          transform: translateY(-50%) scale(1);
        }

        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px 8px;
        }

        .left-controls,
        .right-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .control-button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 2px;
          transition: background 0.1s ease;
          position: relative;
        }

        .control-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .control-button svg {
          width: 24px;
          height: 24px;
        }

        .volume-container {
          display: flex;
          align-items: center;
          position: relative;
        }

        .volume-slider-wrapper {
          width: 0;
          overflow: hidden;
          transition: width 0.2s ease;
          margin-left: -4px;
        }

        .volume-slider-wrapper.visible {
          width: 52px;
        }

        .volume-slider {
          width: 52px;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
        }

        .time-display {
          color: white;
          font-size: 13px;
          font-weight: 500;
          font-family: "YouTube Sans", "Roboto", sans-serif;
          margin-left: 8px;
          user-select: none;
        }

        .time-separator {
          margin: 0 2px;
          opacity: 0.7;
        }

        .settings-container {
          position: relative;
        }

        @media (max-width: 600px) {
          .controls-bar {
            padding: 4px 8px 6px;
          }

          .control-button {
            width: 32px;
            height: 32px;
            padding: 6px;
          }

          .control-button svg {
            width: 20px;
            height: 20px;
          }

          .time-display {
            font-size: 12px;
            margin-left: 4px;
          }

          .volume-slider-wrapper {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
