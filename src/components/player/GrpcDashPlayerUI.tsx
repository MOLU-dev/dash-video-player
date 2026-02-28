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
} from "@/types/player.types";
import type { Representation } from "@/types/player.types";
import { DownloadsManager } from "./DownloadsManager";
import OfflinePlayer from "./OfflinePlayer";

interface GrpcDashPlayerUIProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
  // handleResume: () => void;

  // Handlers
  handlePlay: () => void;
  handlePause: () => void;
  handlePlayButtonClick: () => void;
  handleReplayClick: () => void;
  switchQuality: (idx: number) => Promise<void>;
  setCurrentQuality: (quality: string | number) => void;
  handleSeek: (time: number) => void;
  //: (boolean: boolean) => void;
  isFirstRenderRef: React.RefObject<boolean>;
  handleStartFromBeginning: () => void;
  showResumeToast?: boolean;
  setShowResumeToast: (boolean: boolean) => void;

  //
  downloads: any[];
  downloadedVideos: any[];
  onDownload: () => void;
  onPauseDownload: () => void;
  onResumeDownload: () => void;
  onCancelDownload: () => void;
  onDeleteDownload: () => void;
  onPlayDownloaded: (videoId: string) => void;
  isVideoDownloaded: (videoId: string) => boolean;
  downloadProgress: number;
  downloadStatus: string;
  offlineVideo: { url: string; metadata: any } | null;
  onCloseOfflinePlayer: () => void;
  showDownloads: boolean;
  setShowDownloads: (show: boolean) => void;
  getHighestQualityRep: () => Representation | null;
  getDownloadStatus: (videoId: string) => Promise<{
    totalSegments: number;
    downloadedSegments: number;
    progress: number;
  } | null>;
  clearAllDownloads: () => void;
  isQualitySwitchBlocked?: boolean; 
  isLive: boolean;
}

export function GrpcDashPlayerUI({
  videoId,
  videoRef,
  availableQualities,
  currentStats,
  // showReplay,
  isOnline,
  // showOfflineMessage,
  currentQuality,
  bufferProgress,
  showResumePrompt,
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
  showResumeToast,
  setShowResumeToast,

  //
  downloads,
  downloadedVideos,
  onDownload,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onDeleteDownload,
  onPlayDownloaded,
  isVideoDownloaded,
  downloadProgress,
  downloadStatus,
  offlineVideo,
  onCloseOfflinePlayer,
  showDownloads,
  setShowDownloads,
  getHighestQualityRep,
  clearAllDownloads,
  getDownloadStatus,
  isQualitySwitchBlocked = false, 
  isLive,
}: GrpcDashPlayerUIProps) {
  const handleQualityChange = useCallback((quality: string | number) => {
     if (isQualitySwitchBlocked) {
       console.log("Quality selection is temporarily blocked");
       return;
     }
    setCurrentQuality(quality);
  }, []);
  const [isTheatreMode, setIsTheatreMode] = useState(false);

  useEffect(() => {
    console.log("Available Qualities:", availableQualities);
  }, [availableQualities]);

  const highestRep = getHighestQualityRep();

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
          // onResume={handleResume}
          onStartFromBeginning={handleStartFromBeginning}
          isFirstRenderRef={isFirstRenderRef}
          onDismissResumeToast={() => setShowResumeToast(false)}
          showResumeToast={showResumeToast}
          //offlineVideo={offlineVideo}
          videoId={videoId}
          representationId={highestRep?.id || ""}
          totalSegments={highestRep?.totalSegments || 0}
          title={`Video ${videoId}`}
          duration={0} // You might want to get this from your player state
          quality={highestRep?.height ? `${highestRep.height}p` : "HD"}
          thumbnail={`/api/thumbnail/${videoId}`}
          isVideoDownloaded={isVideoDownloaded(videoId)}
          downloadProgress={downloadProgress}
          downloadStatus={downloadStatus}
          onDownload={onDownload}
          onPauseDownload={onPauseDownload}
          onResumeDownload={onResumeDownload}
          onCancelDownload={onCancelDownload}
          onDeleteDownload={onDeleteDownload}
          onShowDownloads={() => setShowDownloads(true)}
          getDownloadStatus={() => getDownloadStatus(videoId)}
          clearAllDownloads={clearAllDownloads}
          isQualitySwitchBlocked={isQualitySwitchBlocked} 
          isLive={isLive}
        />

        {/* Offline Player */}
        {offlineVideo && (
          <OfflinePlayer
            videoUrl={offlineVideo.url}
            metadata={offlineVideo.metadata}
            onClose={onCloseOfflinePlayer}
          />
        )}

        {/* Downloads Manager */}
        {showDownloads && (
          <DownloadsManager
            downloadedVideos={downloadedVideos}
            onPlay={onPlayDownloaded}
            onDelete={onDeleteDownload}
            onClearAll={clearAllDownloads}
            onClose={() => setShowDownloads(false)}
            incompleteDownloads={downloads}
            onResume={onResumeDownload}
          />
        )}

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
