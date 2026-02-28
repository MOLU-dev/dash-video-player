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
            // Forward icon
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 13c0 4.4 3.6 8 8 8s8-3.6 8-8h-2c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6v4l5-5-5-5v4c-4.4 0-8 3.6-8 8z"
                fill="currentColor"
              />
              <text
                x="14"
                y="16"
                fontSize="8"
                fill="currentColor"
                fontWeight="bold"
              >
                10
              </text>
            </svg>
          ) : (
            // Backward icon
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 13c0 4.4-3.6 8-8 8s-8-3.6-8-8h2c0 3.3 2.7 6 6 6s6-2.7 6-6-2.7-6-6-6v4l-5-5 5-5v4c4.4 0 8 3.6 8 8z"
                fill="currentColor"
              />
              <text
                x="8"
                y="16"
                fontSize="8"
                fill="currentColor"
                fontWeight="bold"
              >
                10
              </text>
            </svg>
          );
        case "brightness":
          return (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
                fill="currentColor"
              />
            </svg>
          );
        case "volume":
          return (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                fill="currentColor"
              />
            </svg>
          );
      }
    };

    const getDisplayValue = () => {
      switch (type) {
        case "seek":
          return formatSeekTime(value);
        case "brightness":
          return `${Math.round(value)}%`;
        case "volume":
          return `${Math.round(value)}%`;
      }
    };

    return (
      <div
        className={`gesture-indicator ${
          side === "left" ? "left" : side === "right" ? "right" : "center"
        }`}
      >
        <div className="indicator-content">
          <div className="indicator-icon">{getIcon()}</div>
          <div className="indicator-value">{getDisplayValue()}</div>
        </div>

        <style jsx>{`
          .gesture-indicator {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 55;
            pointer-events: none;
            animation: fadeInScale 0.2s ease;
          }

          .gesture-indicator.left {
            left: 20%;
          }

          .gesture-indicator.right {
            right: 20%;
          }

          .gesture-indicator.center {
            left: 50%;
            transform: translate(-50%, -50%);
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

          .gesture-indicator.center {
            animation: fadeInScale 0.2s ease;
          }

          .gesture-indicator.center {
            transform: translate(-50%, -50%) scale(1);
          }

          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          .indicator-content {
            background: rgba(0, 0, 0, 0.8);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            min-width: 100px;
            backdrop-filter: blur(10px);
          }

          .indicator-icon {
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .indicator-value {
            color: white;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
          }

          @media (max-width: 600px) {
            .gesture-indicator.left {
              left: 15%;
            }

            .gesture-indicator.right {
              right: 15%;
            }

            .indicator-content {
              padding: 16px;
              min-width: 80px;
            }

            .indicator-icon {
              width: 40px;
              height: 40px;
            }

            .indicator-value {
              font-size: 14px;
            }
          }
        `}</style>
      </div>
    );
  }
