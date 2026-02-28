"use client";

import React from "react";
import type { QualityInfo } from "../../src/types/player.types";

interface PlayerControlsProps {
  // mode: PlayerMode;
  // setMode: (mode: PlayerMode) => void;
  uiVideoQualityIdx: number;
  availableQualities: QualityInfo[];
  onQualityChange: (idx: number) => void;
}

export function PlayerControls({
  // mode,
  // setMode,
  uiVideoQualityIdx,
  availableQualities,
  onQualityChange,
}: PlayerControlsProps) {
  return (
    <div className="player-controls">
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === "auto" ? "active" : ""}`}
          onClick={() => setMode("auto")}
        >
          Auto Mode
        </button>
        <button
          className={`mode-btn ${mode === "manual" ? "active" : ""}`}
          onClick={() => setMode("manual")}
        >
          Manual Mode
        </button>
      </div>

      {mode === "manual" && (
        <div className="quality-selector">
          <label>Quality:</label>
          <select
            value={uiVideoQualityIdx}
            onChange={(e) => onQualityChange(parseInt(e.target.value))}
            className="quality-dropdown"
          >
            {availableQualities.map((quality, idx) => (
              <option key={quality.id} value={idx}>
                {quality.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <style jsx>{`
        .player-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 15px;
          padding: 12px 20px;
          background: #2a2a2a;
          border-bottom: 1px solid #444;
        }

        .mode-selector {
          display: flex;
          gap: 8px;
        }

        .mode-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #444;
          color: #ddd;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: #0066cc;
          color: white;
        }

        .mode-btn:hover:not(.active) {
          background: #555;
        }

        .quality-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quality-selector label {
          color: #ddd;
          font-size: 14px;
        }

        .quality-dropdown {
          padding: 6px 12px;
          border-radius: 4px;
          background: #444;
          color: #fff;
          border: 1px solid #555;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
