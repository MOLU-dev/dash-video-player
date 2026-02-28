// components/ReelPlayer.tsx
"use client";

import React, { useEffect, useImperativeHandle, forwardRef } from "react";
import { useReelPlayer } from "@/hooks/reels/useReelPlayer";
import type { Reel } from "../../../../src/types/reel.types";

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload: boolean;
  onEnded?: () => void;
  onReady?: () => void;
}

export const ReelPlayer = forwardRef<any, ReelPlayerProps>(
  ({ reel, isActive, shouldPreload, onEnded, onReady }, ref) => {
    const player = useReelPlayer({
      reel,
      isActive,
      shouldPreload,
      onEnded,
      onReady,
    });

    // Expose player methods to parent
    useImperativeHandle(
      ref,
      () => ({
        play: () => player.handlePlay(),
        pause: () => player.handlePause(),
        cleanup: () => player.cleanup?.(),
      }),
      [player]
    );

    return (
      <div className={`reel-player ${isActive ? "active" : ""}`}>
        <video
          ref={player.videoRef}
          className="reel-video"
          playsInline
          muted={!isActive}
          loop={false}
        />

        {/* Reel Info Overlay */}
        {isActive && (
          <div className="reel-info">
            <div className="reel-author">@{reel.author || "unknown"}</div>
            <div className="reel-title">{reel.title || "Untitled"}</div>
          </div>
        )}

        {/* Buffer indicator */}
        {player.currentStats.buffer < 3 && isActive && (
          <div className="buffer-indicator">
            <div className="spinner" />
          </div>
        )}

        <style jsx>{`
          .reel-player {
            width: 100%;
            height: 100vh;
            position: relative;
            background: #000;
            scroll-snap-align: start;
          }

          .reel-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .reel-info {
            position: absolute;
            bottom: 80px;
            left: 20px;
            color: white;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
            z-index: 10;
          }

          .reel-author {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .reel-title {
            font-size: 14px;
            max-width: 300px;
          }

          .buffer-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 20;
          }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .reel-player:not(.active) .reel-video {
            opacity: 0.5;
          }
        `}</style>
      </div>
    );
  }
);

ReelPlayer.displayName = "ReelPlayer";

// // Usage Example: app/reels/page.tsx
// ("use client");

// import React from "react";
// import ReelCarousel from "@/components/ReelCarousel";
// import type { Reel } from "@/types/reel.types";

// export default function ReelsPage() {
//   // This would come from your API
//   const reels: Reel[] = [
//     {
//       id: "1",
//       videoId: "reel-video-1",
//       title: "Amazing sunset 🌅",
//       author: "naturelover",
//       duration: 15,
//     },
//     {
//       id: "2",
//       videoId: "reel-video-2",
//       title: "Cooking tutorial 👨‍🍳",
//       author: "chefmaster",
//       duration: 30,
//     },
//     {
//       id: "3",
//       videoId: "reel-video-3",
//       title: "Dance moves 💃",
//       author: "dancer123",
//       duration: 20,
//     },
//     {
//       id: "4",
//       videoId: "reel-video-4",
//       title: "Tech review 📱",
//       author: "techguru",
//       duration: 45,
//     },
//     {
//       id: "5",
//       videoId: "reel-video-5",
//       title: "Travel vlog ✈️",
//       author: "wanderlust",
//       duration: 25,
//     },
//     {
//       id: "6",
//       videoId: "reel-video-6",
//       title: "Fitness tips 💪",
//       author: "fitnesspro",
//       duration: 35,
//     },
//     {
//       id: "7",
//       videoId: "reel-video-7",
//       title: "Comedy skit 😂",
//       author: "funnyvideos",
//       duration: 18,
//     },
//   ];

//   return (
//     <main className="reels-page">
//       <ReelCarousel reels={reels} />

//       <style jsx>{`
//         .reels-page {
//           width: 100vw;
//           height: 100vh;
//           overflow: hidden;
//           background: #000;
//         }
//       `}</style>
//     </main>
//   );
// }
