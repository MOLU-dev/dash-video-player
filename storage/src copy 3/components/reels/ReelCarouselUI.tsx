// components/ReelCarouselUI.tsx
("use client");

import React, { useRef, useEffect } from "react";
import { ReelPlayer } from "./ReelPlayer";
import type { Reel } from "../../../../src/types/reel.types";

interface ReelCarouselUIProps {
  reels: Reel[];
  currentIndex: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onNext: () => void;
  onReady: (reelId: string) => void;
  registerReelPlayer: (reelId: string, player: any) => void;
}

export function ReelCarouselUI({
  reels,
  currentIndex,
  containerRef,
  onNext,
  onReady,
  registerReelPlayer,
}: ReelCarouselUIProps) {
  const reelPlayerRefs = useRef<Map<string, any>>(new Map());

  // Register players with manager
  useEffect(() => {
    reelPlayerRefs.current.forEach((player, reelId) => {
      registerReelPlayer(reelId, player);
    });
  }, [registerReelPlayer]);

  return (
    <div ref={containerRef} className="reel-carousel">
      <div className="reel-container">
        {reels.map((reel, index) => {
          const isActive = index === currentIndex;
          const shouldPreload = Math.abs(index - currentIndex) <= 2;

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
              onEnded={onNext}
              onReady={() => onReady(reel.id)}
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
              className={`indicator ${index === currentIndex ? "active" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Scroll Hint */}
      {currentIndex === 0 && (
        <div className="scroll-hint">
          <div className="arrow-down">↓</div>
          <span>Swipe up for more</span>
        </div>
      )}

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
        }

        .arrow-down {
          font-size: 32px;
        }

        .scroll-hint span {
          font-size: 14px;
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
        }
      `}</style>
    </div>
  );
}
