// components/ThumbnailPreview.tsx
"use client";

import React, { useState, useEffect } from "react";

interface ThumbnailPreviewProps {
  time: number;
  spriteUrl: string;
  vttUrl: string;
  isVisible: boolean;
  position: { x: number };
}

interface VTTCue {
  startTime: number;
  endTime: number;
  text: string;
}

interface SpriteInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ThumbnailPreview({
  time,
  spriteUrl,
  vttUrl,
  isVisible,
  position,
}: ThumbnailPreviewProps) {
  const [vttCues, setVttCues] = useState<VTTCue[]>([]);
  const [spriteInfo, setSpriteInfo] = useState<SpriteInfo | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState({
    width: 160,
    height: 90,
  });

  // Parse VTT file
  useEffect(() => {
    if (!vttUrl) return;

    fetch(vttUrl)
      .then((response) => response.text())
      .then((vttContent) => {
        const cues = parseVTT(vttContent);
        setVttCues(cues);
      })
      .catch((error) => console.error("Error loading VTT:", error));
  }, [vttUrl]);

  // Find sprite info for current time
  useEffect(() => {
    if (!vttCues.length) return;

    const cue = vttCues.find((c) => time >= c.startTime && time <= c.endTime);
    if (cue) {
      const info = parseSpriteInfo(cue.text);
      setSpriteInfo(info);
    }
  }, [time, vttCues]);

  const parseVTT = (vttContent: string): VTTCue[] => {
    const cues: VTTCue[] = [];
    const lines = vttContent.split("\n");
    let i = 0;

    // Skip WEBVTT header
    while (i < lines.length && !lines[i].includes("-->")) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();

      if (line.includes("-->")) {
        const [startStr, endStr] = line.split("-->").map((s) => s.trim());
        const startTime = parseVTTTime(startStr);
        const endTime = parseVTTTime(endStr);

        i++;
        let text = "";
        while (i < lines.length && lines[i].trim() !== "") {
          text += lines[i].trim() + " ";
          i++;
        }

        cues.push({ startTime, endTime, text: text.trim() });
      }
      i++;
    }

    return cues;
  };

  const parseVTTTime = (timeStr: string): number => {
    const parts = timeStr.split(":");
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (
        parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
      );
    } else if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
  };

  const parseSpriteInfo = (text: string): SpriteInfo | null => {
    // Format: "filename.jpg#xywh=x,y,w,h"
    const match = text.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
    if (match) {
      return {
        x: parseInt(match[1]),
        y: parseInt(match[2]),
        width: parseInt(match[3]),
        height: parseInt(match[4]),
      };
    }
    return null;
  };

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

  if (!isVisible || !spriteInfo) return null;

  return (
    <div
      className="thumbnail-preview"
      style={{
        left: `${position.x}px`,
      }}
    >
      <div className="thumbnail-container">
        <div
          className="thumbnail-image"
          style={{
            backgroundImage: `url(${spriteUrl})`,
            backgroundPosition: `-${spriteInfo.x}px -${spriteInfo.y}px`,
            width: `${thumbnailSize.width}px`,
            height: `${thumbnailSize.height}px`,
            backgroundSize: "auto",
          }}
        />
        <div className="thumbnail-time">{formatTime(time)}</div>
      </div>
      <div className="thumbnail-arrow" />

      <style jsx>{`
        .thumbnail-preview {
          position: absolute;
          bottom: 32px;
          transform: translateX(-50%);
          z-index: 100;
          pointer-events: none;
          animation: fadeIn 0.1s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .thumbnail-container {
          background: rgba(28, 28, 28, 0.95);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .thumbnail-image {
          display: block;
          image-rendering: crisp-edges;
        }

        .thumbnail-time {
          background: rgba(0, 0, 0, 0.9);
          color: white;
          text-align: center;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          font-family: monospace;
        }

        .thumbnail-arrow {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid rgba(28, 28, 28, 0.95);
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
        }

        @media (max-width: 600px) {
          .thumbnail-preview {
            bottom: 28px;
          }
        }
      `}</style>
    </div>
  );
}
