// components/GestureIndicator.tsx
"use client";

import React from "react";

interface GestureIndicatorProps {
  type: "seek" | "brightness" | "volume";
  value: number;
  side?: "left" | "right";
}

export function GestureIndicator({ type, value, side }: GestureIndicatorProps) {
  const formatSeekTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    return `${seconds > 0 ? "+" : "-"}${Math.floor(absSeconds)}s`;
  };

  const getIcon = () => {
    switch (type) {
      case "seek":
        return value > 0 ? (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 13c0 4.4 3.6 8 8 8s8-3.6 8-8h-2c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6v4l5-5-5-5v4c-4.4 0-8 3.6-8 8z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 13c0 4.4-3.6 8-8 8s-8-3.6-8-8h2c0 3.3 2.7 6 6 6s6-2.7 6-6-2.7-6-6-6v4l-5-5 5-5v4c4.4 0 8 3.6 8 8z"
              fill="currentColor"
            />
          </svg>
        );
      case "brightness":
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
              fill="currentColor"
            />
          </svg>
        );
      case "volume":
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  const renderSlider = () => {
    if (type === "seek") return null;

    return (
      <div className="slider-container">
        <div className="slider-track">
          <div className="slider-fill" style={{ height: `${value}%` }} />
        </div>
      </div>
    );
  };

  // Determine display position
  const getPositionClass = () => {
    if (type === "seek") {
      // Seek appears on the same side
      return side === "left" ? "left" : "right";
    } else {
      // Brightness/volume appear on opposite side
      if (side === "left") return "right";
      if (side === "right") return "left";
    }
    return "center";
  };

  const positionClass = getPositionClass();
  const isSeek = type === "seek";

  return (
    <div className={`gesture-indicator ${positionClass}`}>
      <div
        className={`indicator-content ${
          isSeek ? "seek-style" : "control-style"
        }`}
      >
        <div className="indicator-icon">{getIcon()}</div>
        {isSeek ? (
          <div className="indicator-value">{formatSeekTime(value)}</div>
        ) : (
          <>
            {renderSlider()}
            <div className="indicator-value">{Math.round(value)}%</div>
          </>
        )}
      </div>

      <style jsx>{`
        .gesture-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1000;
          pointer-events: none;
          animation: fadeInScale 0.2s ease;
        }

        .gesture-indicator.left {
          left: 60px;
        }

        .gesture-indicator.right {
          right: 60px;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translateY(-50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }

        /* Seek style (circular) */
        .indicator-content.seek-style {
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        /* Control style (rectangular) */
        .indicator-content.control-style {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          min-width: 100px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .indicator-icon {
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seek-style .indicator-icon svg {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .slider-container {
          width: 6px;
          height: 120px;
          position: relative;
        }

        .slider-track {
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          position: relative;
          overflow: hidden;
        }

        .slider-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: white;
          border-radius: 3px;
          transition: height 0.1s ease;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .indicator-value {
          color: white;
          font-weight: 600;
          text-align: center;
        }

        .seek-style .indicator-value {
          font-size: 16px;
          margin-top: 8px;
          font-weight: 700;
        }

        .control-style .indicator-value {
          font-size: 14px;
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .gesture-indicator.left {
            left: 40px;
          }

          .gesture-indicator.right {
            right: 40px;
          }

          .indicator-content.seek-style {
            width: 100px;
            height: 100px;
            padding: 20px;
          }

          .indicator-content.control-style {
            padding: 16px;
            min-width: 80px;
          }

          .slider-container {
            height: 100px;
          }

          .seek-style .indicator-icon svg {
            width: 48px;
            height: 48px;
          }

          .control-style .indicator-icon svg {
            width: 28px;
            height: 28px;
          }

          .seek-style .indicator-value {
            font-size: 14px;
          }

          .control-style .indicator-value {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
