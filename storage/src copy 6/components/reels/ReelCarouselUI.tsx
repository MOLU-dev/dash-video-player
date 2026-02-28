// components/ReelCarouselUI.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { useReelManager } from "@/hooks/reels/useReelManager";
import { useReelScroll } from "../../../../src/hooks/reels/useReelScroll";
import { ReelPlayer } from "./ReelPlayer";
import type { Reel } from "../../../../src/types/reel.types";

interface ReelCarouselUIProps {
  reels: Reel[];
  initialIndex?: number;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onFollow?: (authorId: string) => void;
}

export function ReelCarouselUI({
  reels,
  initialIndex = 0,
  onLike,
  onComment,
  onShare,
  onFollow,
}: ReelCarouselUIProps) {
  const manager = useReelManager({ reels, initialIndex });

  const { containerRef } = useReelScroll({
    onNext: manager.goToNext,
    onPrevious: manager.goToPrevious,
    isTransitioning: manager.isTransitioning,
  });

  const reelPlayerRefs = useRef<Map<string, any>>(new Map());

  // Register players with manager
  useEffect(() => {
    reelPlayerRefs.current.forEach((player, reelId) => {
      manager.registerReelPlayer(reelId, player);
    });
  }, [manager]);

  return (
    <div ref={containerRef} className="reel-carousel">
      <div className="reel-container">
        {reels.map((reel, index) => {
          const isActive = index === manager.currentIndex;
          const shouldPreload = Math.abs(index - manager.currentIndex) <= 2;

          return (
            <ReelPlayer
              key={reel.id}
              ref={(ref) => {
                if (ref) {
                  reelPlayerRefs.current.set(reel.id, ref);
                }
              }}
              reel={reel}
              isActive={isActive}
              shouldPreload={shouldPreload}
              onEnded={manager.goToNext}
              onReady={() => {
                console.log(`[ReelCarousel] Reel ready: ${reel.id}`);
              }}
              onLike={onLike}
              onComment={onComment}
              onShare={onShare}
              onFollow={onFollow}
              initialLikeCount={0}
              initialCommentCount={0}
              initialIsLiked={false}
              initialIsFollowing={false}
            />
          );
        })}
      </div>

      {/* Navigation Indicators */}
      <div className="reel-indicators">
        <div className="indicator-list">
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              className={`indicator ${
                index === manager.currentIndex ? "active" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll Hint */}
      {manager.currentIndex === 0 && (
        <div className="scroll-hint">
          <div className="arrow-down">↓</div>
          <span>Swipe up for more</span>
        </div>
      )}

      {/* Reel Counter */}
      <div className="reel-counter">
        {manager.currentIndex + 1} / {manager.totalReels}
      </div>

      <style jsx>{`
        .reel-carousel {
          width: 100%;
          height: 100vh;
          overflow-y: scroll;
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          position: relative;
          background: #000;
        }

        .reel-carousel::-webkit-scrollbar {
          display: none;
        }

        .reel-container {
          width: 100%;
        }

        .reel-indicators {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 30;
          pointer-events: none;
        }

        .indicator-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .indicator {
          width: 4px;
          height: 20px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 2px;
          transition: all 0.3s;
        }

        .indicator.active {
          height: 30px;
          background: white;
        }

        .scroll-hint {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
          animation: bounce 2s infinite;
          z-index: 25;
          pointer-events: none;
        }

        .arrow-down {
          font-size: 32px;
        }

        .scroll-hint span {
          font-size: 14px;
        }

        .reel-counter {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 14px;
          font-weight: 600;
          background: rgba(0, 0, 0, 0.5);
          padding: 8px 16px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          z-index: 30;
          pointer-events: none;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translate(-50%, 0);
          }
          50% {
            transform: translate(-50%, 10px);
          }
        }

        @media (max-width: 768px) {
          .reel-indicators {
            right: 10px;
          }

          .reel-counter {
            top: 15px;
            font-size: 12px;
            padding: 6px 12px;
          }
        }
      `}</style>
    </div>
  );
}
