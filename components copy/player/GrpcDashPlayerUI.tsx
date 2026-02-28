"use client";

import React from "react";
import { PlayerControls } from "./PlayerControls";
import { StatsDisplay } from "./StatsDisplay";
import { VideoPlayer } from "./VideoPlayer";
import { PlayOverlay } from "./PlayOverlay";
import { ReplayOverlay } from "./ReplayOverlay";
import { OfflineOverlay } from "./OfflineOverlay";
import type { PlayerStats, QualityInfo } from "../../src/types/player.types";

interface GrpcDashPlayerUIProps {
  // Video ref
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // State

  availableQualities: QualityInfo[];
  currentStats: PlayerStats;
  showReplay: boolean;
  uiVideoQualityIdx: number;
  isOnline: boolean;
  showOfflineMessage: boolean;
  hasPlaybackStarted: boolean;
  currentQuality: string | number;

  // Handlers
  handlePlay: () => void;
  handlePause: () => void;
  handlePlayButtonClick: () => void;
  handleReplayClick: () => void;
  switchQuality: (idx: number) => Promise<void>;
  setCurrentQuality: (quality: string | number) => void;
}

export function GrpcDashPlayerUI({
  videoRef,
  availableQualities,
  currentStats,
  showReplay,
  uiVideoQualityIdx,
  isOnline,
  showOfflineMessage,
  hasPlaybackStarted,
  currentQuality,
  handlePlay,
  handlePause,
  handlePlayButtonClick,
  handleReplayClick,
  switchQuality,
  setCurrentQuality,
}: GrpcDashPlayerUIProps) {
  return (
    <div className="player-container">
      {/* <PlayerControls

        uiVideoQualityIdx={uiVideoQualityIdx}
        availableQualities={availableQualities}
        onQualityChange={switchQuality}
      /> */}

      <StatsDisplay stats={currentStats} isOnline={isOnline} />

      <div className="video-wrapper">
        <VideoPlayer
          videoRef={videoRef}
          onPlay={handlePlay}
          onPause={handlePause}
        />

        {!hasPlaybackStarted && <PlayOverlay onPlay={handlePlayButtonClick} />}

        {showReplay && <ReplayOverlay onReplay={handleReplayClick} />}

        {showOfflineMessage && <OfflineOverlay />}
      </div>

      <style jsx>{`
        .player-container {
          max-width: 800px;
          margin: 0 auto;
          background: #1e1e1e;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .video-wrapper {
          position: relative;
        }

        @media (max-width: 600px) {
          .player-container {
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
