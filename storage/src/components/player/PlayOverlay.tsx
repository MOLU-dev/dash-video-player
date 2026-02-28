"use client";

import React from "react";

interface PlayOverlayProps {
  onPlay: () => void;
}

export function PlayOverlay({ onPlay }: PlayOverlayProps) {
  return (
    <div className="play-overlay">
      <button className="play-button" onClick={onPlay}>
        Play
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
        }

        .play-button {
          padding: 16px 32px;
          font-size: 20px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .play-button:hover {
          background: #0055aa;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
