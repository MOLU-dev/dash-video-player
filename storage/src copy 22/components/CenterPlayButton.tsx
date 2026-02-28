// components/CenterPlayButton.tsx
"use client";

import React, { useState, useEffect } from "react";

interface CenterPlayButtonProps {
  isPlaying: boolean;
  isInitialState: boolean;
  thumbnailUrl?: string;
  onPlay: () => void;
}

export function CenterPlayButton({
  isPlaying,
  isInitialState,
  thumbnailUrl,
  onPlay,
}: CenterPlayButtonProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [flashType, setFlashType] = useState<"play" | "pause">("play");
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const triggerFlash = (type: "play" | "pause") => {
    setFlashType(type);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 500);
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    setIsPressed(false);
    onPlay();
  };

  return (
    <>
      {/* Initial Play Button with Thumbnail */}
      {isInitialState && (
        <div
          className="initial-overlay"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setIsPressed(false);
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        >
          {thumbnailUrl && (
            <div
              className="thumbnail-backdrop"
              style={{ backgroundImage: `url(${thumbnailUrl})` }}
            />
          )}
          <div
            className={`youtube-play-button ${isHovering ? "hover" : ""} ${
              isPressed ? "pressed" : ""
            }`}
          >
            {/* YouTube Logo Shape */}
            <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%">
              {/* Red YouTube button background */}
              <path
                className="ytp-large-play-button-bg"
                d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
                fill="#212121"
                fillOpacity="0.8"
              ></path>
              {/* White play triangle */}
              <path
                className="ytp-large-play-button-icon"
                d="M 45,24 27,14 27,34"
                fill="#fff"
              ></path>
            </svg>
          </div>
        </div>
      )}

      {/* Play/Pause Flash Animation */}
      {showFlash && !isInitialState && (
        <div className="center-flash">
          <div className="flash-icon">
            {flashType === "play" ? (
              <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path
                  d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"
                  fill="#fff"
                ></path>
              </svg>
            ) : (
              <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path
                  d="M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z"
                  fill="#fff"
                ></path>
              </svg>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .initial-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          cursor: pointer;
          z-index: 40;
          animation: fadeIn 0.3s ease;
          /* ADD: Ensure overlay fills container */
          min-height: 300px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .thumbnail-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: filter 0.1s ease;
          /* ADD: Prevent shrinking */
          min-height: inherit;
        }

        .youtube-play-button {
          position: relative;
          width: 68px;
          height: 48px;
          cursor: pointer;
          transition: transform 0.1s cubic-bezier(0.4, 0, 1, 1);
          z-index: 1;
        }

        /* Default state - semi-transparent background */
        .youtube-play-button .ytp-large-play-button-bg {
          transition: fill 0.1s cubic-bezier(0.4, 0, 1, 1),
            fill-opacity 0.1s cubic-bezier(0.4, 0, 1, 1);
        }

        /* Hover state - bright red (#f00) with full opacity */
        .youtube-play-button.hover .ytp-large-play-button-bg {
          fill: #f00;
          fill-opacity: 1;
        }

        /* Hover state - scale up slightly */
        .youtube-play-button.hover {
          transform: scale(1.1);
        }

        /* Pressed/Active state - darker red and scale down */
        .youtube-play-button.pressed {
          transform: scale(1.05) !important;
        }

        .youtube-play-button.pressed .ytp-large-play-button-bg {
          fill: #cc0000;
          fill-opacity: 1;
        }

        /* White play icon */
        .ytp-large-play-button-icon {
          transition: opacity 0.1s ease;
        }

        .center-flash {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 50%;
          pointer-events: none;
          z-index: 45;
          animation: flashFade 0.5s ease;
        }

        @keyframes flashFade {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        .flash-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flash-icon svg {
          width: 100%;
          height: 100%;
        }

        @media (max-width: 600px) {
          .youtube-play-button {
            width: 56px;
            height: 40px;
          }

          .center-flash {
            width: 64px;
            height: 64px;
          }

          .flash-icon {
            width: 40px;
            height: 40px;
          }
        }

        /* Touch devices - add active state */
        @media (hover: none) and (pointer: coarse) {
          .youtube-play-button:active {
            transform: scale(1.05) !important;
          }

          .youtube-play-button:active .ytp-large-play-button-bg {
            fill: #cc0000;
            fill-opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
