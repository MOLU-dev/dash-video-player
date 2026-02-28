// components/VideoPlayer/OfflinePlayer.tsx
"use client";
import React, { useRef, useEffect, useState } from "react";

interface OfflinePlayerProps {
  videoUrl: string;
  metadata: {
    title: string;
    duration: number;
    quality: string;
    downloadDate: Date;
    thumbnail: string;
  };
  onClose: () => void;
}

const OfflinePlayer: React.FC<OfflinePlayerProps> = ({
  videoUrl,
  metadata,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const updateTime = () => {
      setCurrentTime(videoEl.currentTime);
    };

    videoEl.addEventListener("timeupdate", updateTime);
    return () => videoEl.removeEventListener("timeupdate", updateTime);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="offline-player-overlay">
      <div className="offline-player-container">
        <div className="offline-player-header">
          <h3>{metadata.title}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="offline-player-content">
          <video
            ref={videoRef}
            src={videoUrl}
            className="offline-video-player"
            onClick={togglePlay}
          />

          <div className="offline-player-controls">
            <button className="control-btn" onClick={togglePlay}>
              {isPlaying ? "Pause" : "Play"}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(metadata.duration)}
            </div>

            <div className="download-info">
              Downloaded on {metadata.downloadDate.toLocaleDateString()} •{" "}
              {metadata.quality}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflinePlayer;
