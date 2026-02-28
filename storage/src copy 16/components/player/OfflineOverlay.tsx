"use client";

import React from "react";

export function OfflineOverlay() {
  return (
    <div className="offline-overlay">
      <div className="offline-message">
        <p>You are currently offline</p>
        <p>Video will resume when connection is restored</p>
      </div>

      <style jsx>{`
        .offline-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          z-index: 20;
        }

        .offline-message {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          color: white;
        }

        .offline-message p {
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
}
