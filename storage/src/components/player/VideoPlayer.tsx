"use client";

import React from "react";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function VideoPlayer({ videoRef }: VideoPlayerProps) {
  return (
    <div className="video-container">
      <video ref={videoRef} controls className="video-player" />

      <style jsx>{`
        .video-container {
          position: relative;
          width: 100%;
          background: #000;
        }

        .video-player {
          width: 100%;
          display: block;
          max-height: 450px;
        }

        @media (max-width: 600px) {
          .video-player {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
