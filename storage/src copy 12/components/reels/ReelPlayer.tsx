// components/ReelPlayer.tsx - FIXED VERSION
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReelPlayer } from "@/hooks/reels/useReelPlayer";
import type { Reel } from "../../../../src/types/reel.types";

interface ReelPlayerProps {
  reel: Reel & {
    likes?: number;
    comments?: number;
    isLiked?: boolean;
    description?: string;
  };
  isActive: boolean;
  shouldPreload: boolean;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onRegisterPlayer?: (reelId: string, player: any) => void;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
  reel,
  isActive,
  shouldPreload,
  onReady,
  onEnded,
  onError,
  onRegisterPlayer,
  onLike,
  onComment,
  onShare,
}) => {
  const player = useReelPlayer({
    reel,
    isActive,
    shouldPreload,
    onReady,
    onEnded,
    onError,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [liked, setLiked] = useState(reel.isLiked || false);
  const videoMonitorRef = useRef<NodeJS.Timeout | null>(null);

  // Register player
  useEffect(() => {
    if (onRegisterPlayer && player.playerHandle) {
      onRegisterPlayer(reel.id, player.playerHandle);
    }
  }, [reel.id, player.playerHandle, onRegisterPlayer]);

  // CRITICAL: Monitor and enforce playback state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    // Clear any existing monitor
    if (videoMonitorRef.current) {
      clearInterval(videoMonitorRef.current);
    }

    // Monitor video state every 100ms
    videoMonitorRef.current = setInterval(() => {
      if (!isActive && !video.paused) {
        // Force pause if video is playing but shouldn't be
        video.pause();
        setIsPaused(true);
        console.warn(`Force paused non-active reel ${reel.id}`);
      } else if (isActive && video.paused && !isPaused) {
        // Sync isPaused state
        setIsPaused(true);
      } else if (isActive && !video.paused) {
        setIsPaused(false);
      }
    }, 100);

    return () => {
      if (videoMonitorRef.current) {
        clearInterval(videoMonitorRef.current);
        videoMonitorRef.current = null;
      }
    };
  }, [isActive, player.videoRef, reel.id, isPaused]);

  // Handle tap to pause/play
  const handleTap = (e: React.MouseEvent) => {
    if (!isActive) return; // Only allow interaction on active reel

    const video = player.videoRef.current;
    if (!video) return;

    e.stopPropagation();

    if (video.paused) {
      video.play().catch(console.error);
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  // Handle like with animation
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    if (onLike) {
      onLike(reel.id);
    }
  };

  // Format numbers (1.2k, 1.5M, etc.)
  const formatCount = (count: number = 0) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div
      className={`advanced-reel-player ${isActive ? "active" : ""}`}
      data-reel-id={reel.id}
      onMouseEnter={() => isActive && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={player.videoRef}
        className="reel-video"
        playsInline
        loop={false}
        muted={false}
        preload={shouldPreload ? "auto" : "none"}
        onClick={handleTap}
        // CRITICAL: Prevent autoplay
        autoPlay={false}
      />

      {/* Pause Indicator */}
      {isPaused && isActive && (
        <div className="pause-indicator">
          <div className="pause-icon">▶</div>
        </div>
      )}

      {/* Loading Indicator */}
      {player.isBuffering && isActive && (
        <div className="reel-loading">
          <div className="spinner"></div>
        </div>
      )}

      {/* Reel Info & Actions - Only show on active reel */}
      {isActive && (
        <>
          {/* Bottom Info */}
          <div className="reel-bottom">
            <div className="reel-info">
              {reel.author && (
                <div className="author-section">
                  <div className="avatar">{reel.author[0].toUpperCase()}</div>
                  <span className="author-name">@{reel.author}</span>
                </div>
              )}
              {reel.title && <h3 className="reel-title">{reel.title}</h3>}
              {reel.description && (
                <p className="reel-description">{reel.description}</p>
              )}
            </div>
          </div>

          {/* Side Actions */}
          <div className="reel-actions">
            <button
              className={`action-btn like-btn ${liked ? "liked" : ""}`}
              onClick={handleLike}
              aria-label="Like"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill={liked ? "#ff2e63" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="action-count">
                {formatCount(
                  (reel.likes || 0) + (liked && !reel.isLiked ? 1 : 0)
                )}
              </span>
            </button>

            {onComment && (
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onComment(reel.id);
                }}
                aria-label="Comment"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="action-count">
                  {formatCount(reel.comments)}
                </span>
              </button>
            )}

            {onShare && (
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(reel.id);
                }}
                aria-label="Share"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span className="action-count">Share</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Progress Bar */}
      {isActive && player.videoRef.current && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${
                (player.videoRef.current.currentTime /
                  (player.videoRef.current.duration || 1)) *
                100
              }%`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        .advanced-reel-player {
          position: relative;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: pointer;
        }

        .pause-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 15;
          animation: fadeIn 0.2s;
          pointer-events: none;
        }

        .pause-icon {
          width: 80px;
          height: 80px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          backdrop-filter: blur(10px);
        }

        .reel-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20;
          pointer-events: none;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .reel-bottom {
          position: absolute;
          bottom: 100px;
          left: 16px;
          right: 80px;
          z-index: 10;
          pointer-events: none;
        }

        .author-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
        }

        .author-name {
          color: white;
          font-size: 16px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .reel-title {
          color: white;
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .reel-description {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin: 0;
          line-height: 1.4;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .reel-actions {
          position: absolute;
          right: 16px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }

        .action-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 0;
          transition: transform 0.2s;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .like-btn.liked svg {
          animation: heartBeat 0.3s;
        }

        .action-count {
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          z-index: 10;
          pointer-events: none;
        }

        .progress-fill {
          height: 100%;
          background: white;
          transition: width 0.1s linear;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

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

        @keyframes heartBeat {
          0%,
          100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @media (max-width: 768px) {
          .reel-bottom {
            bottom: 80px;
            left: 12px;
            right: 70px;
          }

          .avatar {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .author-name {
            font-size: 14px;
          }

          .reel-title {
            font-size: 14px;
          }

          .reel-description {
            font-size: 13px;
          }

          .reel-actions {
            right: 12px;
            bottom: 80px;
            gap: 16px;
          }

          .action-btn svg {
            width: 28px;
            height: 28px;
          }

          .pause-icon {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};
