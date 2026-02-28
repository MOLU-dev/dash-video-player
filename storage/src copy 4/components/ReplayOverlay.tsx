// components/ReplayOverlay.tsx
"use client";

import React from "react";
import { ReplayIcon } from "./PlayerIcons";

interface ReplayOverlayProps {
  onReplay: () => void;
}

export function ReplayOverlay({ onReplay }: ReplayOverlayProps) {
  return (
    <div className="replay-overlay">
      <button className="replay-button" onClick={onReplay}>
        <ReplayIcon className="replay-icon" />
        <span>Replay</span>
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
          padding: 16px 24px;
          font-size: 18px;
          background: rgba(255, 0, 0, 0.8);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .replay-button:hover {
          background: rgba(255, 0, 0, 1);
          transform: scale(1.05);
        }

        .replay-icon {
          width: 24px;
          height: 24px;
        }
      `}</style>
    </div>
  );
}
