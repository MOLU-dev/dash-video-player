"use client";

import React, { useCallback, useState, useEffect } from "react";
// import { PlayerControls } from "./PlayerControls";
import { StatsDisplay } from "./StatsDisplay";
import { VideoPlayer } from "../VideoPlayer";
// import { PlayOverlay } from "./PlayOverlay";
// import { ReplayOverlay } from "./ReplayOverlay";
import { OfflineOverlay } from "./OfflineOverlay";
import type {
  PlayerStats,
  QualityInfo,
} from "../../../../src/types/player.types";

interface GrpcDashPlayerUIProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  availableQualities: QualityInfo[];
  currentStats: PlayerStats;
  showReplay: boolean;
  uiVideoQualityIdx: number;
  isOnline: boolean;
  showOfflineMessage: boolean;
  hasPlaybackStarted: boolean;
  currentQuality: string | number;
  savedPosition: number | null;
  isBuffering: boolean;
  bufferProgress: number;
  showResumePrompt?: boolean;
  handleResume: () => void;

  // Handlers
  handlePlay: () => void;
  handlePause: () => void;
  handlePlayButtonClick: () => void;
  handleReplayClick: () => void;
  switchQuality: (idx: number) => Promise<void>;
  setCurrentQuality: (quality: string | number) => void;
  handleSeek: (time: number) => void;
  setIsInitialState: (boolean: boolean) => void;
  isFirstRenderRef: React.RefObject<boolean>;
  handleStartFromBeginning: () => void;
}

export function GrpcDashPlayerUI({
  videoRef,
  availableQualities,
  currentStats,
  // showReplay,
  isOnline,
  // showOfflineMessage,
  // hasPlaybackStarted,
  currentQuality,
  bufferProgress,
  showResumePrompt,
  handleResume,
  isBuffering,
  savedPosition,
  handlePlay,
  handlePause,
  // handlePlayButtonClick,
  // handleReplayClick,
  setCurrentQuality,
  handleSeek,
  isFirstRenderRef,
  handleStartFromBeginning,
}: GrpcDashPlayerUIProps) {
  const handleQualityChange = useCallback((quality: string | number) => {
    setCurrentQuality(quality);
  }, []);
  const [isTheatreMode, setIsTheatreMode] = useState(false);

  useEffect(() => {
    console.log("Available Qualities:", availableQualities);
  }, [availableQualities]);

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
          isTheatreMode={isTheatreMode}
          onTheatreModeChange={setIsTheatreMode}
          onPause={handlePause}
          onSeek={handleSeek}
          availableQualities={availableQualities}
          currentQuality={currentQuality}
          spriteUrl="/sprites/kWgsI9sLFq3/sprite.webp" // Relative to public folder
          vttUrl="/sprites/kWgsI9sLFq3/sprite.vtt" // Relative to public folder
          onQualityChange={handleQualityChange}
          //isInitialState={isInitialState}
          //setIsInitialState={setIsInitialState}
          thumbnailUrl="/images/IMG-20250805-WA0000.jpg" // Relative to public folder
          isBuffering={isBuffering}
          bufferProgress={bufferProgress}
          showResumePrompt={showResumePrompt}
          savedPosition={savedPosition}
          onResume={handleResume}
          onStartFromBeginning={handleStartFromBeginning}
          isFirstRenderRef={isFirstRenderRef}
        />

        {/* {!hasPlaybackStarted && <PlayOverlay onPlay={handlePlayButtonClick} />}

        {showReplay && <ReplayOverlay onReplay={handleReplayClick} />}

        {showOfflineMessage && <OfflineOverlay />} */}
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
