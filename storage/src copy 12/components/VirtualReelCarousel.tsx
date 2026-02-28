// components/VirtualReelCarousel.tsx
"use client";

import React from "react";
import { useVirtualReelManager } from "../../../src/hooks/reels/useVirtualReelManager";
import { useReelScroll } from "../../../src/hooks/reels/useReelScroll";
import { RecycledReelPlayer } from "./RecycledReelPlayer";
import type { Reel } from "../../../src/types/reel.types";

interface VirtualReelCarouselProps {
  reels: Reel[];
  initialIndex?: number;
  autoPlayNext?: boolean;
  onReelChange?: (index: number, reel: Reel) => void;
}

export const VirtualReelCarousel: React.FC<VirtualReelCarouselProps> = ({
  reels,
  initialIndex = 0,
  autoPlayNext = true,
  onReelChange,
}) => {
  const manager = useVirtualReelManager({ reels, initialIndex });

  const { containerRef } = useReelScroll({
    onNext: manager.goToNext,
    onPrevious: manager.goToPrevious,
    isTransitioning: manager.isTransitioning,
    enabled: true,
  });

  // Notify parent
  React.useEffect(() => {
    if (onReelChange) {
      onReelChange(manager.currentReelIndex, manager.currentReel);
    }
  }, [manager.currentReelIndex, manager.currentReel, onReelChange]);

  const handleReelEnded = () => {
    if (autoPlayNext) {
      manager.goToNext();
    }
  };

  return (
    <div ref={containerRef} className="virtual-reel-carousel">
      {/* Virtual Container */}
      <div
        className="virtual-container"
        style={{
          transform: `translateY(-${manager.currentReelIndex * 100}vh)`,
          transition: manager.isTransitioning
            ? "transform 0.3s ease-out"
            : "none",
        }}
      >
        {/* Render ONLY 3 slots */}
        {manager.virtualSlots.map((slot) => (
          <div
            key={slot.slotIndex}
            className="virtual-slot"
            data-slot={slot.slotIndex}
            data-reel-index={slot.reelIndex}
          >
            <RecycledReelPlayer slot={slot} onEnded={handleReelEnded} />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="reel-indicators">
        {manager.hasPrevious && (
          <button
            className="nav-indicator"
            onClick={manager.goToPrevious}
            disabled={manager.isTransitioning}
          >
            ↑
          </button>
        )}
        {manager.hasNext && (
          <button
            className="nav-indicator"
            onClick={manager.goToNext}
            disabled={manager.isTransitioning}
          >
            ↓
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="reel-progress">
        <span>
          {manager.currentReelIndex + 1} / {manager.totalReels}
        </span>
      </div>

      <style jsx>{`
        .virtual-reel-carousel {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }

        .virtual-container {
          width: 100%;
          height: 100%;
          will-change: transform;
        }

        .virtual-slot {
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
          border: none;
          color: white;
          font-size: 24px;
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
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          z-index: 100;
        }
      `}</style>
    </div>
  );
};
