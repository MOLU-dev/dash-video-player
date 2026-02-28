// components/CenterPlayPauseOverlay.tsx
"use client";

import React, { useState, useEffect } from "react";
import { PlayIcon, PauseIcon } from "./PlayerIcons";

interface CenterPlayPauseOverlayProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  show: boolean;
}

export function CenterPlayPauseOverlay({
  isPlaying,
  onPlayPause,
  show,
}: CenterPlayPauseOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [show, isPlaying]);

  if (!visible) return null;

  return (
    <div className="center-overlay" onClick={onPlayPause}>
      <div className={`center-button ${isPlaying ? "pause" : "play"}`}>
        {isPlaying ? (
          <PauseIcon className="center-icon" />
        ) : (
          <PlayIcon className="center-icon" />
        )}
      </div>

      <style jsx>{`
        .center-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          z-index: 8;
          cursor: pointer;
          transition: opacity 0.3s ease;
        }

        .center-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .center-button:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .center-icon {
          width: 36px;
          height: 36px;
          color: white;
        }

        .play .center-icon {
          margin-left: 4px;
        }

        @media (max-width: 600px) {
          .center-button {
            width: 60px;
            height: 60px;
          }

          .center-icon {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
}
