// components/SettingsButton.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import type { QualityInfo } from "../src/types/player.types";

interface SettingsButtonProps {
  currentQuality: string | number;
  availableQualities: QualityInfo[];
  onQualityChange: (quality: string | number) => void;
}

export function SettingsButton({
  currentQuality,
  availableQualities,
  onQualityChange,
}: SettingsButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const qualityOptions = [{ id: "auto", label: "Auto" }, ...availableQualities];

  const getCurrentQualityLabel = () => {
    if (currentQuality === "auto") return "Auto";
    const quality = availableQualities.find(
      (q) => parseInt(q.id) === currentQuality
    );
    return quality?.label || "Auto";
  };

  const handleQualityChange = (quality: string | number) => {
    onQualityChange(quality);
    setShowMenu(false);
  };

  return (
    <div className="settings-container" ref={menuRef}>
      <button
        className="settings-btn"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
          />
        </svg>
      </button>

      {showMenu && (
        <div className="settings-menu">
          <div className="menu-section">
            <h3 className="menu-title">Quality</h3>
            <div className="quality-options">
              {qualityOptions.map((quality) => (
                <button
                  key={quality.id}
                  className={`quality-option ${
                    (quality.id === "auto" && currentQuality === "auto") ||
                    (quality.id !== "auto" &&
                      currentQuality === parseInt(quality.id))
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleQualityChange(
                      quality.id === "auto" ? "auto" : parseInt(quality.id)
                    )
                  }
                >
                  <span className="quality-label">{quality.label}</span>
                  {((quality.id === "auto" && currentQuality === "auto") ||
                    (quality.id !== "auto" &&
                      currentQuality === parseInt(quality.id))) && (
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      className="check-icon"
                    >
                      <path
                        fill="currentColor"
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* You can add more sections here in the future */}
          {/* <div className="menu-section">
            <h3 className="menu-title">Playback</h3>
            // Add playback rate options, etc.
          </div> */}
        </div>
      )}

      <style jsx>{`
        .settings-container {
          position: relative;
          display: inline-block;
        }

        .settings-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }

        .settings-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .settings-menu {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 10px;
          background: rgba(28, 28, 28, 0.95);
          border-radius: 8px;
          padding: 16px;
          min-width: 200px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          z-index: 1000;
        }

        .menu-section {
          margin-bottom: 16px;
        }

        .menu-section:last-child {
          margin-bottom: 0;
        }

        .menu-title {
          color: #aaa;
          font-size: 12px;
          font-weight: 500;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quality-options {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quality-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: none;
          border: none;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-size: 14px;
        }

        .quality-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .quality-option.active {
          background: rgba(0, 102, 204, 0.2);
          color: #4dabf7;
        }

        .quality-label {
          flex: 1;
          text-align: left;
        }

        .check-icon {
          color: #4dabf7;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .settings-menu {
            position: fixed;
            bottom: 80px;
            right: 10px;
            left: 10px;
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}
