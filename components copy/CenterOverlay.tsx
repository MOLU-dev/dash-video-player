// components/CenterOverlay.tsx
"use client";

import React, { useState, useEffect } from "react";

interface CenterOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  duration: number;
  showOverlay: boolean;
  onHideOverlay: () => void;
}

export function CenterOverlay({
  videoRef,
  isPlaying,
  onPlayPause,
  onSeek,
  duration,
  showOverlay,
  onHideOverlay,
}: CenterOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const overlayTimeoutRef = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showOverlay) {
      setIsVisible(true);

      // Auto-hide after 3 seconds
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onHideOverlay, 300); // Wait for fade out animation
      }, 3000);

      return () => clearTimeout(timeout);
    } else {
      setIsVisible(false);
    }
  }, [showOverlay, onHideOverlay]);

  const handleSkip = (seconds: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const newTime = Math.max(
      0,
      Math.min(duration, videoElement.currentTime + seconds)
    );
    onSeek(newTime);

    // Reset overlay timer
    if (showOverlay) {
      // This will trigger the useEffect to reset the timer
    }
  };

  const handlePlayPauseClick = () => {
    onPlayPause();

    // Reset overlay timer
    if (showOverlay) {
      // This will trigger the useEffect to reset the timer
    }
  };

  if (!showOverlay && !isVisible) return null;

  return (
    <div className={`center-overlay ${isVisible ? "visible" : ""}`}>
      <div className="overlay-content">
        {/* Previous Button (Skip -10 seconds) */}
        <button
          className="skip-btn prev-btn"
          onClick={() => handleSkip(-10)}
          aria-label="Skip back 10 seconds"
        >
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            <path
              fill="currentColor"
              d="M11 16.07V7.93c0-.81.91-1.28 1.58-.83l5.77 4.07c.56.4.56 1.24 0 1.63l-5.77 4.07c-.67.45-1.58-.02-1.58-.83z"
            />
          </svg>
          <span className="skip-time">10</span>
        </button>

        {/* Play/Pause Button */}
        <button
          className="play-pause-btn"
          onClick={handlePlayPauseClick}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next Button (Skip +10 seconds) */}
        <button
          className="skip-btn next-btn"
          onClick={() => handleSkip(10)}
          aria-label="Skip forward 10 seconds"
        >
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            <path
              fill="currentColor"
              d="M13 16.07V7.93c0-.81.91-1.28 1.58-.83l5.77 4.07c.56.4.56 1.24 0 1.63l-5.77 4.07c-.67.45-1.58-.02-1.58-.83z"
            />
          </svg>
          <span className="skip-time">10</span>
        </button>
      </div>

      <style jsx>{`
        .center-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 5;
          pointer-events: none;
        }

        .center-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .overlay-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          padding: 20px;
        }

        .play-pause-btn {
          background: rgba(0, 0, 0, 0.7);
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }

        .play-pause-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .skip-btn {
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
          position: relative;
        }

        .skip-btn:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.05);
        }

        .skip-time {
          font-size: 12px;
          font-weight: bold;
          margin-top: 2px;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .overlay-content {
            gap: 20px;
          }

          .play-pause-btn {
            width: 70px;
            height: 70px;
          }

          .skip-btn {
            width: 50px;
            height: 50px;
          }

          .play-pause-btn svg,
          .skip-btn svg {
            width: 36px;
            height: 36px;
          }
        }

        @media (max-width: 480px) {
          .overlay-content {
            gap: 15px;
          }

          .play-pause-btn {
            width: 60px;
            height: 60px;
          }

          .skip-btn {
            width: 45px;
            height: 45px;
          }

          .play-pause-btn svg,
          .skip-btn svg {
            width: 32px;
            height: 32px;
          }

          .skip-time {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
