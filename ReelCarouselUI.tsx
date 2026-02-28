// components/ReelCarouselUI.tsx
"use client";

import React from "react";
import { ReelPlayer } from "./ReelPlayer";
import type { UseReelManagerReturn } from "@/hooks/reels/useReelManager";

interface ReelCarouselUIProps {
  containerRef: React.RefObject<HTMLDivElement>;
  reelManager: ReturnType<typeof useReelManager>;
}

export function ReelCarouselUI({
  containerRef,
  reelManager,
}: ReelCarouselUIProps) {
  const {
    currentIndex,
    currentReel,
    reelCache,
    registerPlayer,
    unregisterPlayer,
    updateReelState,
    goToNext,
    totalReels,
    hasNext,
    hasPrevious,
  } = reelManager;

  return (
    <div ref={containerRef} className="reel-carousel">
      {/* Reel viewport */}
      <div className="reel-viewport">
        {Array.from(reelCache.entries()).map(([reelId, state], index) => {
          const globalIndex = reelManager.reelsInWindow.findIndex(
            (r) => r.id === reelId
          );
          const actualIndex = currentIndex - 2 + globalIndex; // Adjust for window offset

          const isActive = state.reel.id === currentReel.id;
          const shouldPreload =
            actualIndex > currentIndex && actualIndex <= currentIndex + 3;

          return (
            <div
              key={reelId}
              className={`reel-container ${isActive ? "active" : ""}`}
              style={{
                transform: `translateY(${(actualIndex - currentIndex) * 100}%)`,
                opacity: Math.abs(actualIndex - currentIndex) <= 1 ? 1 : 0,
              }}
            >
              <ReelPlayer
                reel={state.reel}
                isActive={isActive}
                shouldPreload={shouldPreload}
                hasPlayed={state.hasPlayed}
                onRegister={(player) => registerPlayer(reelId, player)}
                onUnregister={() => unregisterPlayer(reelId)}
                onEnded={goToNext}
                onReady={() =>
                  updateReelState(reelId, { playerState: "ready" })
                }
                onError={(error) => {
                  console.error(`Error in reel ${reelId}:`, error);
                  updateReelState(reelId, { playerState: "error" });
                }}
              />

              {/* Reel info overlay */}
              {isActive && (
                <div className="reel-info">
                  <div className="reel-metadata">
                    {state.reel.title && (
                      <h3 className="reel-title">{state.reel.title}</h3>
                    )}
                    {state.reel.author && (
                      <p className="reel-author">@{state.reel.author}</p>
                    )}
                  </div>

                  <div className="reel-counter">
                    {currentIndex + 1} / {totalReels}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation hints */}
      {hasPrevious && (
        <div className="nav-hint nav-hint-up">
          <span>↑ Swipe up for previous</span>
        </div>
      )}

      {hasNext && (
        <div className="nav-hint nav-hint-down">
          <span>↓ Swipe down for next</span>
        </div>
      )}

      <style jsx>{`
        .reel-carousel {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000;
          touch-action: pan-y;
        }

        .reel-viewport {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .reel-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.3s ease;
          will-change: transform, opacity;
        }

        .reel-container.active {
          z-index: 10;
        }

        .reel-info {
          position: absolute;
          bottom: 80px;
          left: 20px;
          right: 20px;
          z-index: 20;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .reel-metadata {
          margin-bottom: 10px;
        }

        .reel-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 5px 0;
        }

        .reel-author {
          font-size: 14px;
          margin: 0;
          opacity: 0.9;
        }

        .reel-counter {
          position: absolute;
          top: 20px;
          right: 0;
          background: rgba(0, 0, 0, 0.5);
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
        }

        .nav-hint {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          opacity: 0;
          animation: fadeInOut 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 15;
        }

        .nav-hint-up {
          top: 20px;
        }

        .nav-hint-down {
          bottom: 20px;
        }

        @keyframes fadeInOut {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 0.7;
          }
        }

        @media (max-width: 768px) {
          .reel-info {
            bottom: 100px;
          }

          .nav-hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
