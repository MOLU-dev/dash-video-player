"use client";

import React from "react";
import type { QualityInfo } from "../src/types/player.types";

interface QualitySelectorProps {
  selectedIdx: number;
  qualities: QualityInfo[];
  onChange: (idx: number) => void;
}

export function QualitySelector({
  selectedIdx,
  qualities,
  onChange,
}: QualitySelectorProps) {
  return (
    <div className="quality-selector">
      <label>Quality:</label>
      <select
        value={selectedIdx}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="quality-dropdown"
      >
        {qualities.map((quality, idx) => (
          <option key={quality.id} value={idx}>
            {quality.label}
          </option>
        ))}
      </select>

      <style jsx>{`
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
