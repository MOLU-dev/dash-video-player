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
        {/* Modern, solid Loading Spinner */}
        <svg className="spinner-svg" viewBox="0 0 100 100">
          <circle
            className="spinner-track"
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
          />
          <circle
            className="spinner-circle"
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%);
          z-index: 35;
          pointer-events: none;
          backdrop-filter: blur(1px);
          transition: opacity 0.3s ease;
        }

        .buffering-spinner {
          width: 72px;
          height: 72px;
          position: relative;
          filter: drop-shadow(0 0 12px rgba(0,0,0,0.6));
        }

        .spinner-svg {
          width: 100%;
          height: 100%;
          animation: global-rotate 1s linear infinite;
        }

        @keyframes global-rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        .spinner-track {
          stroke: rgba(255, 255, 255, 0.25);
        }

        .spinner-circle {
          stroke: #ffffff;
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          stroke-linecap: round;
          transform-origin: center;
          animation: 
            dash-offset 1.5s ease-in-out infinite;
        }

        @keyframes dash-offset {
          0% {
            stroke-dashoffset: 200;
            transform: rotate(0deg);
          }
          50% {
            stroke-dashoffset: 50;
            transform: rotate(180deg);
          }
          100% {
            stroke-dashoffset: 200;
            transform: rotate(360deg);
          }
        }

        .buffer-progress-text {
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          margin-top: 20px;
          font-family: 'Inter', system-ui, sans-serif;
          letter-spacing: 0.02em;
          background: rgba(0, 0, 0, 0.6);
          padding: 6px 14px;
          border-radius: 8px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .buffering-spinner {
            width: 52px;
            height: 52px;
          }

          .buffer-progress-text {
            font-size: 12px;
            padding: 3px 10px;
          }
        }
      `}</style>
    </div>
  );
}
