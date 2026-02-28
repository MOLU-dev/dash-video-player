// components/CustomControls.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import type { QualityInfo } from "../../../src/types/player.types";
import { SettingsButton } from "./SettingsButton";

interface CustomControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onFullscreen: () => void;
  onVolumeChange: (volume: number) => void;
  onQualityChange: (quality: string | number) => void;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  isFullscreen: boolean;
  playbackRate: number;
  currentQuality: string | number;
  availableQualities: QualityInfo[];
}

export function CustomControls({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  buffered,
  onPlayPause,
  onSeek,
  onFullscreen,
  onVolumeChange,
  onPlaybackRateChange,
  onQualityChange,
  volume,
  isFullscreen,
  playbackRate,
  currentQuality,
  availableQualities,
}: CustomControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPlaybackRates, setShowPlaybackRates] = useState(false);

  const playbackRates = [
    { value: 0.25, label: "0.25x" },
    { value: 0.5, label: "0.5x" },
    { value: 0.75, label: "0.75x" },
    { value: 1, label: "Normal" },
    { value: 1.25, label: "1.25x" },
    { value: 1.5, label: "1.5x" },
    { value: 1.75, label: "1.75x" },
    { value: 2, label: "2x" },
  ];

  const handlePlaybackRateClick = (rate: number) => {
    onPlaybackRateChange(rate);
    setShowPlaybackRates(false);
  };

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimeout();
    };

    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetControlsTimeout();

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (videoElement) {
        videoElement.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, [videoRef]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
    const progressBarWidth = progressBar.clientWidth;
    const percentage = clickPosition / progressBarWidth;
    const newTime = percentage * duration;
    onSeek(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const volumeBar = e.currentTarget;
    const clickPosition = e.clientX - volumeBar.getBoundingClientRect().left;
    const volumeBarWidth = volumeBar.clientWidth;
    const newVolume = Math.max(0, Math.min(1, clickPosition / volumeBarWidth));
    onVolumeChange(newVolume);
  };

  if (!showControls) {
    return (
      <div className="custom-controls-hidden">
        <style jsx>{`
          .custom-controls-hidden {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
            opacity: 0;
            transition: opacity 0.3s;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="custom-controls">
      {/* Progress Bar */}
      <div className="progress-container" onClick={handleProgressClick}>
        <div
          className="buffered-bar"
          style={{ width: `${(buffered / duration) * 100}%` }}
        />
        <div
          className="progress-bar"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        <div
          className="progress-handle"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="left-controls">
          <button className="control-btn" onClick={onPlayPause}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="right-controls">
          {/* Volume Control */}
          <div className="volume-control">
            <button className="control-btn">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                />
              </svg>
            </button>
            <div className="volume-bar" onClick={handleVolumeClick}>
              <div
                className="volume-level"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>

          {/* Settings Button */}
          <SettingsButton
            currentQuality={currentQuality}
            availableQualities={availableQualities}
            onQualityChange={onQualityChange}
          />

          {/* Fullscreen Button */}
          <button className="control-btn" onClick={onFullscreen}>
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          color: white;
          transition: opacity 0.3s;
          z-index: 10;
        }

        .progress-container {
          position: relative;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          margin: 0 10px;
        }

        .buffered-bar {
          position: absolute;
          height: 100%;
          background: rgba(255, 255, 255, 0.3);
          transition: width 0.2s;
        }

        .progress-bar {
          position: absolute;
          height: 100%;
          background: #0066cc;
          transition: width 0.2s;
        }

        .progress-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #0066cc;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .progress-container:hover .progress-handle {
          opacity: 1;
        }

        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          height: 50px;
        }

        .left-controls,
        .right-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .control-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .time-display {
          font-size: 14px;
          font-family: monospace;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .volume-bar {
          width: 60px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
        }

        .volume-level {
          position: absolute;
          height: 100%;
          background: #0066cc;
          border-radius: 2px;
          transition: width 0.2s;
        }
      `}</style>
    </div>
  );
}
