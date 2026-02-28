// components/BufferingIndicator.tsx
"use client";

import React from "react";

interface BufferingIndicatorProps {
  isBuffering: boolean;
  bufferProgress?: number; // 0-100
}

export function BufferingIndicator({
  isBuffering,
  bufferProgress = 0,
}: BufferingIndicatorProps) {
  if (!isBuffering) return null;

  return (
    <div className="buffering-overlay">
      <div className="buffering-spinner">
        {/* YouTube-style spinner */}
        <svg className="spinner-svg" viewBox="0 0 100 100">
          <circle
            className="spinner-track"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
          />
          <circle
            className="spinner-circle"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {bufferProgress > 0 && bufferProgress < 100 && (
        <div className="buffer-progress-text">
          {Math.round(bufferProgress)}%
        </div>
      )}

      <style jsx>{`
        .buffering-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 35;
          pointer-events: none;
        }

        .buffering-spinner {
          width: 64px;
          height: 64px;
          position: relative;
        }

        .spinner-svg {
          width: 100%;
          height: 100%;
          animation: rotate 2s linear infinite;
        }

        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        .spinner-track {
          stroke: rgba(255, 255, 255, 0.2);
        }

        .spinner-circle {
          stroke: #fff;
          stroke-dasharray: 251.2;
          stroke-dashoffset: 0;
          animation: dash 1.5s ease-in-out infinite;
        }

        @keyframes dash {
          0% {
            stroke-dashoffset: 251.2;
          }
          50% {
            stroke-dashoffset: 62.8;
            transform: rotate(135deg);
          }
          100% {
            stroke-dashoffset: 251.2;
            transform: rotate(450deg);
          }
        }

        .buffer-progress-text {
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 600px) {
          .buffering-spinner {
            width: 48px;
            height: 48px;
          }

          .buffer-progress-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
