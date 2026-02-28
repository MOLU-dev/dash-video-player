"use client";

import React from "react";

interface ReplayOverlayProps {
  onReplay: () => void;
}

export function ReplayOverlay({ onReplay }: ReplayOverlayProps) {
  return (
    <div className="replay-overlay">
      <button className="replay-button" onClick={onReplay}>
        Replay
      </button>

      <style jsx>{`
        .replay-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10;
        }

        .replay-button {
          padding: 12px 24px;
          font-size: 18px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .replay-button:hover {
          background: #0055aa;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
