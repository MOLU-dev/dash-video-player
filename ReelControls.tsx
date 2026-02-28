"use client";

import React, { useState, useEffect } from "react";
import type { Reel } from "./src/types/reel.types";

interface ReelControlsProps {
  reel: Reel;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isFollowing?: boolean;
}

export function ReelControls({
  reel,
  isPlaying,
  isMuted,
  currentTime,
  duration,
  onPlayPause,
  onMuteToggle,
  onLike,
  onComment,
  onShare,
  onFollow,
  likeCount = 0,
  commentCount = 0,
  isLiked = false,
  isFollowing = false,
}: ReelControlsProps) {
  const [showControls, setShowControls] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Show controls on interaction
  const handleInteraction = () => {
    setShowControls(true);

    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }

    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    setControlsTimeout(timeout);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  return (
    <div
      className="reel-controls"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={onPlayPause}
    >
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Center Play/Pause Indicator */}
      {showControls && (
        <div className="center-controls">
          <button
            className="play-pause-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
        </div>
      )}

      {/* Side Actions */}
      <div className="side-actions">
        {/* Like Button */}
        {onLike && (
          <button
            className={`action-btn ${isLiked ? "liked" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <div className="icon">{isLiked ? "❤️" : "🤍"}</div>
            <div className="count">{likeCount}</div>
          </button>
        )}

        {/* Comment Button */}
        {onComment && (
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onComment();
            }}
          >
            <div className="icon">💬</div>
            <div className="count">{commentCount}</div>
          </button>
        )}

        {/* Share Button */}
        {onShare && (
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <div className="icon">🔗</div>
            <div className="count">Share</div>
          </button>
        )}

        {/* Mute Toggle */}
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle();
          }}
        >
          <div className="icon">{isMuted ? "🔇" : "🔊"}</div>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="bottom-info">
        <div className="author-section">
          <div className="author-avatar">
            <img
              src={`/avatars/${reel.author}.jpg`}
              alt={reel.author}
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.png";
              }}
            />
          </div>
          <div className="author-details">
            <div className="author-name">@{reel.author}</div>
            {onFollow && (
              <button
                className={`follow-btn ${isFollowing ? "following" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFollow();
                }}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        <div className="reel-title">{reel.title}</div>
      </div>

      <style jsx>{`
        .reel-controls {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10;
          pointer-events: none;
        }

        .reel-controls > * {
          pointer-events: auto;
        }

        /* Progress Bar */
        .progress-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 10px;
        }

        .progress-bar {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: white;
          transition: width 0.1s linear;
        }

        .time-display {
          position: absolute;
          top: 20px;
          right: 10px;
          font-size: 12px;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        /* Center Controls */
        .center-controls {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: fadeIn 0.2s;
        }

        .play-pause-btn {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          font-size: 32px;
          color: white;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: transform 0.2s;
        }

        .play-pause-btn:hover {
          transform: scale(1.1);
        }

        .play-pause-btn:active {
          transform: scale(0.95);
        }

        /* Side Actions */
        .side-actions {
          position: absolute;
          right: 15px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .action-btn:active {
          transform: scale(0.9);
        }

        .action-btn .icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          font-size: 24px;
          backdrop-filter: blur(10px);
        }

        .action-btn.liked .icon {
          background: rgba(255, 0, 0, 0.2);
          animation: pulse 0.3s;
        }

        .action-btn .count {
          font-size: 12px;
          color: white;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        /* Bottom Info */
        .bottom-info {
          position: absolute;
          bottom: 20px;
          left: 15px;
          right: 80px;
          color: white;
        }

        .author-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid white;
          overflow: hidden;
        }

        .author-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .author-details {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .author-name {
          font-weight: 600;
          font-size: 16px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .follow-btn {
          padding: 6px 16px;
          border-radius: 4px;
          border: 1px solid white;
          background: transparent;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .follow-btn:hover {
          background: white;
          color: black;
        }

        .follow-btn.following {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .reel-title {
          font-size: 14px;
          line-height: 1.4;
          max-width: 90%;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .side-actions {
            right: 10px;
            bottom: 80px;
            gap: 15px;
          }

          .action-btn .icon {
            width: 44px;
            height: 44px;
            font-size: 22px;
          }

          .play-pause-btn {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }

          .author-avatar {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}

export default ReelControls;
