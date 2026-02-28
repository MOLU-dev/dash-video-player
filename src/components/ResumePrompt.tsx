// components/ResumePrompt.tsx
"use client";

import React, { useState, useEffect } from "react";

interface ResumePromptProps {
  savedTime: number;
  onResume: () => void;
  onStartFromBeginning: () => void;
  autoHideDelay?: number; // milliseconds
}

export function ResumePrompt({
  savedTime,
  onResume,
  onStartFromBeginning,
  autoHideDelay = 10000,
}: ResumePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onStartFromBeginning();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHideDelay, onStartFromBeginning]);

  if (!isVisible) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="resume-prompt-overlay">
      <div className="resume-prompt">
        <div className="prompt-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="prompt-content">
          <h3 className="prompt-title">Continue watching?</h3>
          <p className="prompt-message">Resume from {formatTime(savedTime)}</p>
        </div>

        <div className="prompt-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              setIsVisible(false);
              onStartFromBeginning();
            }}
          >
            Start from beginning
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setIsVisible(false);
              onResume();
            }}
          >
            Resume
          </button>
        </div>
      </div>

      <style jsx>{`
        .resume-prompt-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          z-index: 60;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .resume-prompt {
          background: rgba(28, 28, 28, 0.98);
          border-radius: 12px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .prompt-icon {
          width: 48px;
          height: 48px;
          background: #3ea6ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 16px;
        }

        .prompt-content {
          text-align: center;
          margin-bottom: 24px;
        }

        .prompt-title {
          color: white;
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .prompt-message {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin: 0;
        }

        .prompt-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #3ea6ff;
          color: white;
        }

        .btn-primary:hover {
          background: #1c8fe8;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 600px) {
          .resume-prompt {
            padding: 24px;
          }

          .prompt-title {
            font-size: 18px;
          }

          .prompt-actions {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
