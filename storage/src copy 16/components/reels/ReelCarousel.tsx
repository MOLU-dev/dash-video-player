// components/ReelCarousel.tsx

"use client";

import React from "react";
import { useReelManager } from "@/hooks/reels/useReelManager";
import { useReelScroll } from "../../../../src copy 13/hooks/reels/useReelScroll";
import { ReelPlayer } from "./ReelPlayer";
import type { Reel } from "../../../../src copy 13/types/reel.types";

interface ReelCarouselProps {
  reels: Reel[];
  initialIndex?: number;
  autoPlayNext?: boolean;
  onReelChange?: (index: number, reel: Reel) => void;
}

export const ReelCarousel: React.FC<ReelCarouselProps> = ({
  reels,
  initialIndex = 0,
  autoPlayNext = true,
  onReelChange,
}) => {
  const reelManager = useReelManager({
    reels,
    initialIndex,
    autoPlayNext,
  });

  const { containerRef } = useReelScroll({
    onNext: reelManager.goToNext,
    onPrevious: reelManager.goToPrevious,
    isTransitioning: reelManager.isTransitioning,
    enabled: true,
  });

  // Notify parent of reel changes
  React.useEffect(() => {
    if (onReelChange && reelManager.currentReel) {
      onReelChange(reelManager.currentIndex, reelManager.currentReel);
    }
  }, [reelManager.currentIndex, reelManager.currentReel, onReelChange]);

  return (
    <div ref={containerRef} className="reel-carousel">
      {/* Reel Container */}
      <div
        className="reel-container"
        style={{
          transform: `translateY(-${reelManager.currentIndex * 100}%)`,
          transition: reelManager.isTransitioning
            ? "transform 0.3s ease-out"
            : "none",
        }}
      >
        {reelManager.reelsInWindow.map((reelData) => {
          const isActive = reelData.id === reelManager.currentReel.id;
          const distanceFromCurrent = Math.abs(
            reelData.globalIndex - reelManager.currentIndex
          );
          const shouldPreload =
            distanceFromCurrent <= 2 && distanceFromCurrent > 0;

          return (
            <div key={reelData.id} className="reel-slot">
              <ReelPlayer
                reel={reelData}
                isActive={isActive}
                shouldPreload={shouldPreload}
                onReady={() => {
                  reelManager.updateReelState(reelData.id, {
                    playerState: "ready",
                  });
                }}
                onEnded={reelManager.handleReelEnded}
                onError={(error) => {
                  console.error(`Error in reel ${reelData.id}:`, error);
                  reelManager.updateReelState(reelData.id, {
                    playerState: "error",
                  });
                }}
                onRegisterPlayer={reelManager.registerReelPlayer}
              />
            </div>
          );
        })}
      </div>

      {/* Navigation Indicators */}
      <div className="reel-indicators">
        {reelManager.hasPrevious && (
          <button
            className="nav-indicator prev"
            onClick={reelManager.goToPrevious}
            disabled={reelManager.isTransitioning}
            aria-label="Previous reel"
          >
            ↑
          </button>
        )}
        {reelManager.hasNext && (
          <button
            className="nav-indicator next"
            onClick={reelManager.goToNext}
            disabled={reelManager.isTransitioning}
            aria-label="Next reel"
          >
            ↓
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="reel-progress">
        <span className="progress-text">
          {reelManager.currentIndex + 1} / {reelManager.totalReels}
        </span>
      </div>

      <style jsx>{`
        .reel-carousel {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000;
          touch-action: pan-y;
        }

        .reel-container {
          width: 100%;
          height: 100%;
          will-change: transform;
        }

        .reel-slot {
          width: 100%;
          height: 100vh;
          position: relative;
        }

        .reel-indicators {
          position: fixed;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 100;
        }

        .nav-indicator {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-indicator:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .nav-indicator:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .reel-progress {
          position: fixed;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          padding: 8px 16px;
          border-radius: 20px;
          z-index: 100;
        }

        .progress-text {
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .reel-indicators {
            right: 12px;
          }

          .nav-indicator {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }

          .reel-progress {
            top: 12px;
            right: 12px;
            padding: 6px 12px;
          }

          .progress-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};
