// // components/Settings.tsx
// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import { PlayerIcons } from "./PlayerIcons";

// import type { QualityInfo } from "@/types/player.types";

// export type SettingsState = {
//   playbackRate: number;
//   quality: string | number;
//   autoplay: boolean;
//   annotations: boolean;
//   subtitles: boolean;
// };

// interface SettingsProps {
//   isOpen: boolean;
//   onClose: () => void;
//   currentSettings: SettingsState;
//   onSettingsChange: (settings: Partial<SettingsState>) => void;
//   availableQualities?: QualityInfo[];
//   position?: { bottom: number; right: number };
//   onQualityChange: (quality: string | number) => void;
//   currentQuality: string | number;
// }

// type MenuView = "main" | "playbackRate" | "quality";

// export function Settings({
//   isOpen,
//   onClose,
//   currentSettings,
//   onSettingsChange,
//   availableQualities = [],
//     position = { bottom: 48, right: 12 },
//     currentQuality,
//   onQualityChange
// }: SettingsProps) {
//   const [currentView, setCurrentView] = useState<MenuView>("main");
//   const menuRef = useRef<HTMLDivElement>(null);

//   const playbackRates = [
//     { label: "0.25", value: 0.25 },
//     { label: "0.5", value: 0.5 },
//     { label: "0.75", value: 0.75 },
//     { label: "Normal", value: 1 },
//     { label: "1.25", value: 1.25 },
//     { label: "1.5", value: 1.5 },
//     { label: "1.75", value: 1.75 },
//     { label: "2", value: 2 },
//   ];

//   // Close menu when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         onClose();
//       }
//     };

//     if (isOpen) {
//       document.addEventListener("mousedown", handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [isOpen, onClose]);

//   // Reset to main view when opening
//   useEffect(() => {
//     if (isOpen) {
//       setCurrentView("main");
//     }
//   }, [isOpen]);

//   if (!isOpen) return null;

//   const getCurrentQualityLabel = () => {
//     const quality = availableQualities.find(
//       (q) => q.id === currentQuality // Use currentQuality instead of currentSettings.quality
//     );
//     return quality?.label || "Auto";
//   };

//   const getCurrentPlaybackRateLabel = () => {
//     const rate = playbackRates.find(
//       (r) => r.value === currentSettings.playbackRate
//     );
//     return rate?.label || "Normal";
//   };

//   return (
//     <div
//       ref={menuRef}
//       className="settings-menu"
//       style={{
//         bottom: `${position.bottom}px`,
//         right: `${position.right}px`,
//       }}
//     >
//       {/* Main Menu */}
//       {currentView === "main" && (
//         <div className="menu-panel">
//           <div className="menu-header">
//             <h3>Settings</h3>
//           </div>

//           {/* Playback Speed */}
//           <button
//             className="menu-item"
//             onClick={() => setCurrentView("playbackRate")}
//           >
//             <span className="menu-item-label">Playback speed</span>
//             <span className="menu-item-value">
//               {getCurrentPlaybackRateLabel()}
//               <ChevronRight />
//             </span>
//           </button>

//           {/* Quality */}
//           <button
//             className="menu-item"
//             onClick={() => setCurrentView("quality")}
//           >
//             <span className="menu-item-label">Quality</span>
//             <span className="menu-item-value">
//               {getCurrentQualityLabel()}
//               <ChevronRight />
//             </span>
//           </button>

//           <div className="menu-divider" />

//           {/* Autoplay Toggle */}
//           <button
//             className="menu-item toggle-item"
//             onClick={() =>
//               onSettingsChange({ autoplay: !currentSettings.autoplay })
//             }
//           >
//             <span className="menu-item-label">Autoplay</span>
//             <div
//               className={`toggle-switch ${
//                 currentSettings.autoplay ? "active" : ""
//               }`}
//             >
//               <div className="toggle-slider" />
//             </div>
//           </button>

//           {/* Annotations Toggle */}
//           <button
//             className="menu-item toggle-item"
//             onClick={() =>
//               onSettingsChange({ annotations: !currentSettings.annotations })
//             }
//           >
//             <span className="menu-item-label">Annotations</span>
//             <div
//               className={`toggle-switch ${
//                 currentSettings.annotations ? "active" : ""
//               }`}
//             >
//               <div className="toggle-slider" />
//             </div>
//           </button>

//           {/* Subtitles Toggle */}
//           <button
//             className="menu-item toggle-item"
//             onClick={() =>
//               onSettingsChange({ subtitles: !currentSettings.subtitles })
//             }
//           >
//             <span className="menu-item-label">Subtitles/CC</span>
//             <div
//               className={`toggle-switch ${
//                 currentSettings.subtitles ? "active" : ""
//               }`}
//             >
//               <div className="toggle-slider" />
//             </div>
//           </button>
//         </div>
//       )}

//       {/* Playback Rate Submenu */}
//       {currentView === "playbackRate" && (
//         <div className="menu-panel">
//           <div className="menu-header">
//             <button
//               className="back-button"
//               onClick={() => setCurrentView("main")}
//             >
//               <ChevronLeft />
//             </button>
//             <h3>Playback speed</h3>
//           </div>

//           {playbackRates.map((rate) => (
//             <button
//               key={rate.value}
//               className={`menu-option ${
//                 currentSettings.playbackRate === rate.value ? "active" : ""
//               }`}
//               onClick={() => {
//                 onSettingsChange({ playbackRate: rate.value });
//                 setCurrentView("main");
//               }}
//             >
//               <span>{rate.label}</span>
//               {currentSettings.playbackRate === rate.value && (
//                 <span className="checkmark">✓</span>
//               )}
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Quality Submenu */}
//       {currentView === "quality" && (
//         <div className="menu-panel">
//           <div className="menu-header">
//             <button
//               className="back-button"
//               onClick={() => setCurrentView("main")}
//             >
//               <ChevronLeft />
//             </button>
//             <h3>Quality</h3>
//           </div>

//           <button
//             key="auto"
//             className={`menu-option ${
//               currentQuality === "auto" ? "active" : ""
//             }`}
//             onClick={() => {
//               onQualityChange("auto");
//               setCurrentView("main");
//             }}
//           >
//             <span>Auto</span>
//             {currentQuality === "auto" && <span className="checkmark">✓</span>}
//           </button>

//           {availableQualities.map((quality) => (
//             <button
//               key={quality.id}
//               className={`menu-option ${
//                 currentQuality === quality.id ? "active" : "" // Use currentQuality instead of currentSettings.quality
//               }`}
//               onClick={() => {
//                 onQualityChange(quality.id); // Call onQualityChange directly
//                 setCurrentView("main");
//               }}
//             >
//               <span>{quality.label}</span>
//               {currentQuality === quality.id && ( // Use currentQuality instead of currentSettings.quality
//                 <span className="checkmark">✓</span>
//               )}
//             </button>
//           ))}
//         </div>
//       )}

//       <style jsx>{`
//         .settings-menu {
//           position: absolute;
//           background: rgba(28, 28, 28, 0.98);
//           border-radius: 12px;
//           min-width: 280px;
//           max-width: 320px;
//           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
//           backdrop-filter: blur(20px);
//           overflow: hidden;
//           z-index: 1000;
//           animation: slideUp 0.2s ease;
//         }

//         @keyframes slideUp {
//           from {
//             opacity: 0;
//             transform: translateY(10px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }

//         .menu-panel {
//           display: flex;
//           flex-direction: column;
//         }

//         .menu-header {
//           display: flex;
//           align-items: center;
//           padding: 16px 16px 12px;
//           border-bottom: 1px solid rgba(255, 255, 255, 0.1);
//           gap: 8px;
//         }

//         .menu-header h3 {
//           color: white;
//           font-size: 16px;
//           font-weight: 500;
//           margin: 0;
//           flex: 1;
//         }

//         .back-button {
//           background: none;
//           border: none;
//           color: white;
//           cursor: pointer;
//           padding: 4px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           border-radius: 4px;
//           transition: background 0.1s ease;
//           margin-left: -4px;
//         }

//         .back-button:hover {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .menu-item {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           width: 100%;
//           background: none;
//           border: none;
//           color: white;
//           padding: 12px 16px;
//           cursor: pointer;
//           transition: background 0.1s ease;
//           text-align: left;
//         }

//         .menu-item:hover {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .menu-item-label {
//           font-size: 14px;
//           font-weight: 400;
//         }

//         .menu-item-value {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           color: rgba(255, 255, 255, 0.7);
//           font-size: 13px;
//         }

//         .menu-option {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           width: 100%;
//           background: none;
//           border: none;
//           color: white;
//           padding: 12px 16px;
//           cursor: pointer;
//           transition: background 0.1s ease;
//           text-align: left;
//           font-size: 14px;
//         }

//         .menu-option:hover {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .menu-option.active {
//           color: #3ea6ff;
//           font-weight: 500;
//         }

//         .checkmark {
//           font-size: 16px;
//           margin-left: auto;
//         }

//         .menu-divider {
//           height: 1px;
//           background: rgba(255, 255, 255, 0.1);
//           margin: 8px 0;
//         }

//         .toggle-item {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//         }

//         .toggle-switch {
//           width: 36px;
//           height: 20px;
//           background: rgba(255, 255, 255, 0.3);
//           border-radius: 10px;
//           position: relative;
//           transition: background 0.2s ease;
//           cursor: pointer;
//         }

//         .toggle-switch.active {
//           background: #3ea6ff;
//         }

//         .toggle-slider {
//           position: absolute;
//           width: 16px;
//           height: 16px;
//           background: white;
//           border-radius: 50%;
//           top: 2px;
//           left: 2px;
//           transition: transform 0.2s ease;
//         }

//         .toggle-switch.active .toggle-slider {
//           transform: translateX(16px);
//         }

//         @media (max-width: 600px) {
//           .settings-menu {
//             min-width: 240px;
//             max-width: 280px;
//           }

//           .menu-header h3 {
//             font-size: 14px;
//           }

//           .menu-item,
//           .menu-option {
//             padding: 10px 12px;
//             font-size: 13px;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// // Helper components for chevron icons
// const ChevronRight = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//     <path
//       d="M6 12L10 8L6 4"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// const ChevronLeft = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//     <path
//       d="M10 12L6 8L10 4"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// components/Settings.tsx (update the existing file)
"use client";

import React, { useState, useRef, useEffect } from "react";
import { PlayerIcons } from "./PlayerIcons";
import type { QualityInfo } from "@/types/player.types";

export type SettingsState = {
  playbackRate: number;
  quality: string | number;
  autoplay: boolean;
  annotations: boolean;
  subtitles: boolean;
};

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SettingsState;
  onSettingsChange: (settings: Partial<SettingsState>) => void;
  availableQualities?: QualityInfo[];
  position?: { bottom: number; right: number };
  onQualityChange: (quality: string | number) => void;
  currentQuality: string | number;
  onShowDownloads?: () => void; // Add this new prop
  isQualityChangeAllowed?: boolean; // Add this
}

type MenuView = "main" | "playbackRate" | "quality";

export function Settings({
  isOpen,
  onClose,
  currentSettings,
  onSettingsChange,
  availableQualities = [],
  position = { bottom: 48, right: 12 },
  currentQuality,
  onQualityChange,
  onShowDownloads, // Add this to destructuring
}: SettingsProps) {
  const [currentView, setCurrentView] = useState<MenuView>("main");
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset to main view when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentView("main");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getCurrentQualityLabel = () => {
    const quality = availableQualities.find((q) => q.id === currentQuality);
    return quality?.label || "Auto";
  };

  const getCurrentPlaybackRateLabel = () => {
    const rate = playbackRates.find(
      (r) => r.value === currentSettings.playbackRate
    );
    return rate?.label || "Normal";
  };

  return (
    <div
      ref={menuRef}
      className="settings-menu"
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
      }}
    >
      {/* Main Menu */}
      {currentView === "main" && (
        <div className="menu-panel">
          <div className="menu-header">
            <h3>Settings</h3>
          </div>

          {/* Playback Speed */}
          <button
            className="menu-item"
            onClick={() => setCurrentView("playbackRate")}
          >
            <span className="menu-item-label">Playback speed</span>
            <span className="menu-item-value">
              {getCurrentPlaybackRateLabel()}
              <ChevronRight />
            </span>
          </button>

          {/* Quality */}
          <button
            className="menu-item"
            onClick={() => setCurrentView("quality")}
          >
            <span className="menu-item-label">Quality</span>
            <span className="menu-item-value">
              {getCurrentQualityLabel()}
              <ChevronRight />
            </span>
          </button>

          {/* Downloads Option - Add this section */}
          {onShowDownloads && (
            <>
              <button
                className="menu-item"
                onClick={() => {
                  onShowDownloads();
                  onClose();
                }}
              >
                <span className="menu-item-label">Downloads</span>
                <span className="menu-item-value">
                  <DownloadIcon />
                </span>
              </button>
            </>
          )}

          <div className="menu-divider" />

          {/* Autoplay Toggle */}
          <button
            className="menu-item toggle-item"
            onClick={() =>
              onSettingsChange({ autoplay: !currentSettings.autoplay })
            }
          >
            <span className="menu-item-label">Autoplay</span>
            <div
              className={`toggle-switch ${
                currentSettings.autoplay ? "active" : ""
              }`}
            >
              <div className="toggle-slider" />
            </div>
          </button>

          {/* Annotations Toggle */}
          <button
            className="menu-item toggle-item"
            onClick={() =>
              onSettingsChange({ annotations: !currentSettings.annotations })
            }
          >
            <span className="menu-item-label">Annotations</span>
            <div
              className={`toggle-switch ${
                currentSettings.annotations ? "active" : ""
              }`}
            >
              <div className="toggle-slider" />
            </div>
          </button>

          {/* Subtitles Toggle */}
          <button
            className="menu-item toggle-item"
            onClick={() =>
              onSettingsChange({ subtitles: !currentSettings.subtitles })
            }
          >
            <span className="menu-item-label">Subtitles/CC</span>
            <div
              className={`toggle-switch ${
                currentSettings.subtitles ? "active" : ""
              }`}
            >
              <div className="toggle-slider" />
            </div>
          </button>
        </div>
      )}

      {/* Playback Rate Submenu */}
      {currentView === "playbackRate" && (
        <div className="menu-panel">
          <div className="menu-header">
            <button
              className="back-button"
              onClick={() => setCurrentView("main")}
            >
              <ChevronLeft />
            </button>
            <h3>Playback speed</h3>
          </div>

          {playbackRates.map((rate) => (
            <button
              key={rate.value}
              className={`menu-option ${
                currentSettings.playbackRate === rate.value ? "active" : ""
              }`}
              onClick={() => {
                onSettingsChange({ playbackRate: rate.value });
                setCurrentView("main");
              }}
            >
              <span>{rate.label}</span>
              {currentSettings.playbackRate === rate.value && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Quality Submenu */}
      {currentView === "quality" && (
        <div className="menu-panel">
          <div className="menu-header">
            <button
              className="back-button"
              onClick={() => setCurrentView("main")}
            >
              <ChevronLeft />
            </button>
            <h3>Quality</h3>
          </div>

          <button
            key="auto"
            className={`menu-option ${
              currentQuality === "auto" ? "active" : ""
            }`}
            onClick={() => {
              onQualityChange("auto");
              setCurrentView("main");
            }}
          >
            <span>Auto</span>
            {currentQuality === "auto" && <span className="checkmark">✓</span>}
          </button>

          {availableQualities.map((quality) => (
            <button
              key={quality.id}
              className={`menu-option ${
                currentQuality === quality.id ? "active" : ""
              }`}
              onClick={() => {
                onQualityChange(quality.id);
                setCurrentView("main");
              }}
            >
              <span>{quality.label}</span>
              {currentQuality === quality.id && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .settings-menu {
          position: absolute;
          background: rgba(28, 28, 28, 0.98);
          border-radius: 12px;
          min-width: 280px;
          max-width: 320px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 1000;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .menu-panel {
          display: flex;
          flex-direction: column;
        }

        .menu-header {
          display: flex;
          align-items: center;
          padding: 16px 16px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          gap: 8px;
        }

        .menu-header h3 {
          color: white;
          font-size: 16px;
          font-weight: 500;
          margin: 0;
          flex: 1;
        }

        .back-button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.1s ease;
          margin-left: -4px;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: none;
          border: none;
          color: white;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.1s ease;
          text-align: left;
        }

        .menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-item-label {
          font-size: 14px;
          font-weight: 400;
        }

        .menu-item-value {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }

        .menu-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: none;
          border: none;
          color: white;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.1s ease;
          text-align: left;
          font-size: 14px;
        }

        .menu-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-option.active {
          color: #3ea6ff;
          font-weight: 500;
        }

        .checkmark {
          font-size: 16px;
          margin-left: auto;
        }

        .menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }

        .toggle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toggle-switch {
          width: 36px;
          height: 20px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          position: relative;
          transition: background 0.2s ease;
          cursor: pointer;
        }

        .toggle-switch.active {
          background: #3ea6ff;
        }

        .toggle-slider {
          position: absolute;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(16px);
        }

        @media (max-width: 600px) {
          .settings-menu {
            min-width: 240px;
            max-width: 280px;
          }

          .menu-header h3 {
            font-size: 14px;
          }

          .menu-item,
          .menu-option {
            padding: 10px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

// Helper components for icons
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 12L10 8L6 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Add the DownloadIcon component
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
  </svg>
);
