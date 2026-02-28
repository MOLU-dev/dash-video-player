"use client";

import React from "react";
import type { PlayerStats } from "../../../../src/types/player.types";

interface StatsDisplayProps {
  stats: PlayerStats;
  isOnline: boolean;
}

export function StatsDisplay({ stats, isOnline }: StatsDisplayProps) {
  return (
    <div className="stats-display">
      <div className="stat-item">
        <span className="stat-label">Quality:</span>
        <span className="stat-value">{stats.quality}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Throughput:</span>
        <span className="stat-value">{stats.throughput} kbps</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Buffer:</span>
        <span className="stat-value">{stats.buffer}s</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Status:</span>
        <span className="stat-value">{isOnline ? "Online" : "Offline"}</span>
      </div>

      <style jsx>{`
        .stats-display {
          display: flex;
          gap: 20px;
          margin-left: auto;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
