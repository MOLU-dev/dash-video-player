// components/PlayOverlay.tsx
"use client";

import React from "react";
import { PlayIcon } from "./PlayerIcons";

interface PlayOverlayProps {
  onPlay: () => void;
}

export function PlayOverlay({ onPlay }: PlayOverlayProps) {
  return (
    <div className="play-overlay" onClick={onPlay}>
      <button className="play-button">
        <PlayIcon className="play-icon" />
      </button>

      <style jsx>{`
        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          z-index: 5;
          cursor: pointer;
        }

        .play-button {
          width: 80px;
          height: 80px;
          background: rgba(255, 0, 0, 0.8);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .play-button:hover {
          background: rgba(255, 0, 0, 1);
          transform: scale(1.1);
        }

        .play-icon {
          width: 36px;
          height: 36px;
          color: white;
          margin-left: 4px;
        }

        @media (max-width: 600px) {
          .play-button {
            width: 60px;
            height: 60px;
          }

          .play-icon {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
}
