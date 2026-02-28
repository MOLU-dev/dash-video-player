// components/RecycledReelPlayer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRecycledPlayer } from "../../../src/hooks/reels/useRecycledPlayer";
import type { VirtualReelSlot } from "../../../src/types/reel.types";

interface RecycledReelPlayerProps {
  slot: VirtualReelSlot;
  onEnded?: () => void;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
}

export const RecycledReelPlayer: React.FC<RecycledReelPlayerProps> = ({
  slot,
  onEnded,
  onLike,
  onComment,
  onShare,
}) => {
  const player = useRecycledPlayer(slot.slotIndex);
  const [isPaused, setIsPaused] = useState(!slot.isActive);
  const [liked, setLiked] = useState(false);
  const hasInitializedRef = useRef(false);
  const currentReelIdRef = useRef<string | null>(null);

  // Switch reel when slot changes
  useEffect(() => {
    const needsSwitch = currentReelIdRef.current !== slot.reel.id;

    console.log(
      `[SLOT ${slot.slotIndex}] Current: ${currentReelIdRef.current}, New: ${slot.reel.id}, NeedsSwitch: ${needsSwitch}`
    );

    if (needsSwitch && slot.reel.videoId) {
      console.log(
        `[SLOT ${slot.slotIndex}] Switching to reel ${slot.reel.id} with videoId ${slot.reel.videoId}`
      );

      player.controller.switchToReel(slot.reel).then(() => {
        currentReelIdRef.current = slot.reel.id;
        hasInitializedRef.current = true;

        // Auto-play if active
        if (slot.isActive) {
          console.log(`[SLOT ${slot.slotIndex}] Auto-playing active reel`);
          player.controller.play().catch(console.error);
          setIsPaused(false);
        }
      });
    }
  }, [slot.reel, slot.slotIndex, slot.isActive, player.controller]);

  // Handle active state changes
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    if (slot.isActive && isPaused) {
      player.controller.play().catch(console.error);
      setIsPaused(false);
    } else if (!slot.isActive && !isPaused) {
      player.controller.pause();
      setIsPaused(true);
    }
  }, [slot.isActive, isPaused, player.controller]);

  // Handle video ended
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (slot.isActive && onEnded) {
        onEnded();
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [slot.isActive, onEnded, player.videoRef]);

  const handleTap = (e: React.MouseEvent) => {
    if (!slot.isActive) return;

    e.stopPropagation();

    if (isPaused) {
      player.controller.play().catch(console.error);
      setIsPaused(false);
    } else {
      player.controller.pause();
      setIsPaused(true);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    if (onLike) {
      onLike(slot.reel.id);
    }
  };

  const formatCount = (count: number = 0) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div
      className={`recycled-reel-player ${slot.isActive ? "active" : ""}`}
      data-slot={slot.slotIndex}
      data-reel-index={slot.reelIndex}
      onClick={handleTap}
    >
      {/* Video */}
      <video
        ref={player.videoRef}
        className="reel-video"
        playsInline
        loop={false}
        muted={false}
        autoPlay={false}
        preload={slot.shouldPreload ? "auto" : "none"}
      />

      {/* Pause Indicator */}
      {isPaused && slot.isActive && (
        <div className="pause-indicator">
          <div className="pause-icon">▶</div>
        </div>
      )}

      {/* Loading */}
      {player.isBuffering && slot.isActive && (
        <div className="reel-loading">
          <div className="spinner"></div>
        </div>
      )}

      {/* Info & Actions - Only for active */}
      {slot.isActive && (
        <>
          <div className="reel-bottom">
            <div className="reel-info">
              {slot.reel.author && (
                <div className="author-section">
                  <div className="avatar">
                    {slot.reel.author[0].toUpperCase()}
                  </div>
                  <span className="author-name">@{slot.reel.author}</span>
                </div>
              )}
              {slot.reel.title && (
                <h3 className="reel-title">{slot.reel.title}</h3>
              )}
            </div>
          </div>

          <div className="reel-actions">
            <button
              className={`action-btn ${liked ? "liked" : ""}`}
              onClick={handleLike}
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
                {formatCount(slot.reel.likes || 0)}
              </span>
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .recycled-reel-player {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #000;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .pause-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
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
        }

        .reel-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
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
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .reel-actions {
          position: absolute;
          right: 16px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          transition: transform 0.2s;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .action-count {
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
