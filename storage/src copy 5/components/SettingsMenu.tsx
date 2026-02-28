// components/SettingsMenu.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { SettingsIcon, CheckIcon, ArrowRightIcon } from "./PlayerIcons";
import type { QualityInfo } from "../../../src/types/player.types";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuality: string | number;
  onQualityChange: (quality: string | number) => void;
  currentPlaybackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  availableQualities: QualityInfo[];
}

export function SettingsMenu({
  isOpen,
  onClose,
  currentQuality,
  onQualityChange,
  currentPlaybackRate,
  onPlaybackRateChange,
  availableQualities,
}: SettingsMenuProps) {
  const [activeMenu, setActiveMenu] = useState<"main" | "quality" | "playback">(
    "main"
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
        setActiveMenu("main");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const playbackRates = [
    { label: "0.25", value: 0.25 },
    { label: "0.5", value: 0.5 },
    { label: "0.75", value: 0.75 },
    { label: "Normal", value: 1 },
    { label: "1.25", value: 1.25 },
    { label: "1.5", value: 1.5 },
    { label: "1.75", value: 1.75 },
    { label: "2", value: 2 },
  ];

  const getCurrentQualityLabel = () => {
    const quality = availableQualities.find(
      (q) => q.id === currentQuality.toString()
    );
    return quality ? quality.label : "Auto";
  };

  const getCurrentPlaybackRateLabel = () => {
    const rate = playbackRates.find((r) => r.value === currentPlaybackRate);
    return rate ? rate.label : "Normal";
  };

  const renderMainMenu = () => (
    <div className="settings-menu">
      <div className="menu-section">
        <button className="menu-item" onClick={() => setActiveMenu("quality")}>
          <span>Quality</span>
          <span className="menu-value">{getCurrentQualityLabel()}</span>
          <ArrowRightIcon className="menu-arrow" />
        </button>

        <button className="menu-item" onClick={() => setActiveMenu("playback")}>
          <span>Playback speed</span>
          <span className="menu-value">{getCurrentPlaybackRateLabel()}</span>
          <ArrowRightIcon className="menu-arrow" />
        </button>
      </div>
    </div>
  );

  const renderQualityMenu = () => (
    <div className="settings-menu">
      <div className="menu-header">
        <button className="back-button" onClick={() => setActiveMenu("main")}>
          <ArrowRightIcon className="back-arrow" />
          <span>Quality</span>
        </button>
      </div>

      <div className="menu-section">
        <button
          className={`menu-item ${currentQuality === "auto" ? "active" : ""}`}
          onClick={() => {
            onQualityChange("auto");
            setActiveMenu("main");
          }}
        >
          <span>Auto</span>
          {currentQuality === "auto" && <CheckIcon className="check-icon" />}
        </button>

        {availableQualities.map((quality) => (
          <button
            key={quality.id}
            className={`menu-item ${
              currentQuality === quality.id ? "active" : ""
            }`}
            onClick={() => {
              onQualityChange(quality.id);
              setActiveMenu("main");
            }}
          >
            <span>{quality.label}</span>
            {currentQuality === quality.id && (
              <CheckIcon className="check-icon" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPlaybackMenu = () => (
    <div className="settings-menu">
      <div className="menu-header">
        <button className="back-button" onClick={() => setActiveMenu("main")}>
          <ArrowRightIcon className="back-arrow" />
          <span>Playback speed</span>
        </button>
      </div>

      <div className="menu-section">
        {playbackRates.map((rate) => (
          <button
            key={rate.value}
            className={`menu-item ${
              currentPlaybackRate === rate.value ? "active" : ""
            }`}
            onClick={() => {
              onPlaybackRateChange(rate.value);
              setActiveMenu("main");
            }}
          >
            <span>{rate.label}</span>
            {currentPlaybackRate === rate.value && (
              <CheckIcon className="check-icon" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="settings-container" ref={menuRef}>
      {activeMenu === "main" && renderMainMenu()}
      {activeMenu === "quality" && renderQualityMenu()}
      {activeMenu === "playback" && renderPlaybackMenu()}

      <style jsx>{`
        .settings-container {
          position: absolute;
          bottom: 60px;
          right: 10px;
          background: rgba(28, 28, 28, 0.95);
          border-radius: 8px;
          min-width: 200px;
          backdrop-filter: blur(10px);
          z-index: 1000;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .settings-menu {
          color: white;
          font-size: 14px;
          font-family: "Roboto", Arial, sans-serif;
        }

        .menu-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          font-weight: 500;
        }

        .back-arrow {
          width: 16px;
          height: 16px;
          transform: rotate(180deg);
        }

        .menu-section {
          padding: 8px 0;
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 16px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s ease;
        }

        .menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-item.active {
          color: #3ea6ff;
        }

        .menu-value {
          color: #aaa;
          font-size: 13px;
        }

        .menu-arrow {
          width: 16px;
          height: 16px;
          color: #aaa;
        }

        .check-icon {
          width: 16px;
          height: 16px;
          color: #3ea6ff;
        }

        @media (max-width: 600px) {
          .settings-container {
            right: 5px;
            bottom: 50px;
            min-width: 180px;
          }
        }
      `}</style>
    </div>
  );
}
