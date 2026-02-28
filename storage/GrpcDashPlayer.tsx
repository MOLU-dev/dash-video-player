"use client";

import React, { useEffect, useCallback, useState } from "react";
import { usePlayerState } from "../src/hooks/usePlayerState";
import { useThroughputMeasurement } from "../src/hooks/useThroughputMeasurement";
import { useMediaSource } from "../src/hooks/useMediaSource";
import { useNetworkStatus } from "../src/hooks/useNetworkStatus";
import { useBufferManagement } from "../src/hooks/useBufferManagement";
import { useQualitySelection } from "../src/hooks/useQualitySelection";
import { useSegmentFetching } from "../src/hooks/useSegmentFetching";
import { useDurationManagement } from "../src/hooks/useDurationManagement";
import { usePlayerCallbacks } from "../src/hooks/core/usePlayerCallbacks";
import { usePlayerInitializer } from "../src/hooks/core/usePlayerInitializer";
import { usePlayerEventHandlers } from "../src/hooks/core/usePlayerEventHandlers";
import { usePlayerEffects } from "../src/hooks/core/usePlayerEffects";
import { StatsDisplay } from "./StatsDisplay";
import { VideoPlayer } from "../src/components/VideoPlayer";
import { PlayOverlay } from "./PlayOverlay";
import { ReplayOverlay } from "./ReplayOverlay";
import { OfflineOverlay } from "./OfflineOverlay";
import { getBufferGap } from "../src/utils/playerHelpers";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
} from "../src/constants/player.constants";

export default function GrpcDashPlayer({ videoId }: { videoId: string }) {
  const playerState = usePlayerState();
  const {
    videoRef,
    availableQualities,
    setAvailableQualities,
    currentStats,
    setCurrentStats,
    showReplay,
    setShowReplay,
    uiVideoQualityIdx,
    setUiVideoQualityIdx,
    isOnline,
    setIsOnline,
    showOfflineMessage,
    setShowOfflineMessage,
    hasPlaybackStarted,
    setHasPlaybackStarted,
    videoReps,
    setVideoReps,
    audioReps,
    setAudioReps,
    mediaSourceRef,
    mediaSourceStateRef,
    videoSbRef,
    audioSbRef,
    videoRepsRef,
    audioRepsRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    videoQualityIdxRef,
    lastQualitySwitchRef,
    qualitySwitchInProgressRef,
    pendingQualitySwitchRef,
    abortControllersRef,
    operationQueuesRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    videoFetchPausedRef,
    audioFetchPausedRef,
    lastTimeUpdateRef,
    lastSeekTimeRef,
    lastBufferGapRef,
    evictionIntervalRef,
    bolaStateRef,
    targetBufferLevelRef,
    segmentDurationRef,
    playheadVelocityRef,
    isStalledRef,
    lastStallTimeRef,
    rebufferTimeoutRef,
    isInitializedRef,
    shouldInitializeRef,
    isOnlineRef,
    lastProcessedSegmentsRef,
    currentBufferEndRef,
    isQualitySwitchingRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    pendingSegmentOperationsRef,
    segmentOperationIdRef,
    isInEmergencyModeRef,
    emergencySwitchCountRef,
    bufferRecoveryTargetRef,
    lastBufferStateRef,
    videoInitSegmentCache,
    audioInitSegmentCache,
    lastVideoFetchTimeRef,
    lastAudioFetchTimeRef,
    isFirstRenderRef,
    pendingAppendsRef,
    estimatedBufferEndRef,
    lastStableQualityRef,
    recoveryAbortRef,
    isSeekingRef,
    lastOnlineTimeRef,
    isInOnlineRecoveryRef,
    startupTimeRef,
    activeSegmentRequestsRef,
    segmentRequestIdRef,
    abortAllRequests,
    // CRITICAL: Pause/play refs
    isPausedRef,
    isPaused,
    setIsPaused,
    lastPauseTimeRef,
    pauseDurationRef,
    isDownloadingRef,
    shouldStopDownloadingRef,
  } = playerState;

  const [currentQuality, setCurrentQuality] = useState<string | number>("auto");

  const {
    throughputEMARef,
    updateThroughputMeasurement,
    getVideoThroughput,
    calculateWeightedThroughput,
  } = useThroughputMeasurement();

  const { cleanupMediaSource } = useMediaSource({
    videoRef,
    mediaSourceRef,
    mediaSourceStateRef,
    videoSbRef,
    audioSbRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
  });

  const { setMediaSourceDuration, getEffectiveDuration, isAtEnd, isAtStart } =
    useDurationManagement({
      videoRef,
      mediaSourceRef,
      durationRef,
    });

  // Initialize callbacks first
  const callbacks = usePlayerCallbacks({
    videoRef,
    mediaSourceRef,
    videoSbRef,
    audioSbRef,
    videoRepRef,
    audioRepRef,
    videoRepsRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    operationQueuesRef,
    videoQualityIdxRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    qualitySwitchInProgressRef,
    lastProcessedSegmentsRef,
    pendingAppendsRef,
    lastSeekTimeRef,
    isSeekingRef,
    lastStallTimeRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    pendingSegmentOperationsRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    videoInitSegmentCache,
    audioInitSegmentCache,
    throughputEMARef,
    lastQualitySwitchRef,
    lastBufferGapRef,
    isInitializedRef,
    currentBufferEndRef,
    isQualitySwitchingRef,
    isInEmergencyModeRef,
    emergencySwitchCountRef,
    bufferRecoveryTargetRef,
    lastBufferStateRef,
    estimatedBufferEndRef,
    rebufferTimeoutRef,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    setShowReplay,
    shouldAllowQualitySwitch: () => true, // Will be replaced
    abortAllRequests,
    completeOngoingSegmentOperations: async () => {}, // Will be replaced
    fetchNextSegment: async () => {}, // Will be replaced
    cleanupMediaSource,
    videoId,
  });

  // Initialize segment fetching with callbacks
  const segmentFetching = useSegmentFetching({
    videoId,
    videoRef,
    mediaSourceStateRef,
    isOnlineRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    videoFetchPausedRef,
    audioFetchPausedRef,
    abortControllersRef,
    lastProcessedSegmentsRef,
    currentBufferEndRef,
    lastVideoFetchTimeRef,
    lastAudioFetchTimeRef,
    pendingSegmentOperationsRef,
    segmentOperationIdRef,
    activeSegmentRequestsRef,
    segmentRequestIdRef,
    pendingAppendsRef,
    throughputEMARef,
    operationQueuesRef,
    validateSegmentCompatibility: callbacks.validateSegmentCompatibility,
    enqueueOperation: callbacks.enqueueOperation,
    updateThroughputMeasurement,
    calculateEstimatedBufferEnd: callbacks.calculateEstimatedBufferEndWrapper,
    tryEndStream: callbacks.tryEndStream,
    isDownloadingRef,
    isPausedRef,
    shouldStopDownloadingRef,
  });

  // Initialize quality selection with segment fetching
  const qualitySelection = useQualitySelection({
    videoRef,
    videoRepsRef,
    videoRepRef,
    videoSbRef,
    videoQualityIdxRef,
    lastQualitySwitchRef,
    qualitySwitchInProgressRef,
    pendingQualitySwitchRef,
    videoFetchPausedRef,
    audioFetchPausedRef,
    videoNextSegRef,
    videoFinishedRef,
    lastProcessedSegmentsRef,
    currentVideoInitSegmentRef,
    currentVideoRepIdRef,
    videoInitSegmentCache,
    pendingAppendsRef,
    isSeekingRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    lastOnlineTimeRef,
    isInEmergencyModeRef,
    bolaStateRef,
    targetBufferLevelRef,
    setUiVideoQualityIdx,
    setCurrentStats,
    availableQualities,
    cancelAllSegmentRequests: segmentFetching.cancelAllSegmentRequests,
    completeOngoingSegmentOperations:
      segmentFetching.completeOngoingSegmentOperations,
    enqueueOperation: callbacks.enqueueOperation,
    fetchNextSegment: segmentFetching.fetchNextSegment,
    getVideoThroughput,
    calculateEstimatedBufferEnd: callbacks.calculateEstimatedBufferEndWrapper,
    videoId,
  });

  // Update callbacks with quality selection methods
  const callbacksWithQuality = {
    ...callbacks,
    shouldAllowQualitySwitch: qualitySelection.shouldAllowQualitySwitch,
    completeOngoingSegmentOperations:
      segmentFetching.completeOngoingSegmentOperations,
    fetchNextSegment: segmentFetching.fetchNextSegment,
  };

  const { evictBuffer } = useBufferManagement({
    videoRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoFinishedRef,
    audioFinishedRef,
    videoNextSegRef,
    audioNextSegRef,
    mediaSourceRef,
    mediaSourceStateRef,
    isOnlineRef,
    isSeekingRef,
    qualitySwitchInProgressRef,
    videoFetchPausedRef,
    audioFetchPausedRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    videoQualityIdxRef,
    pendingAppendsRef,
    setCurrentStats,
    fetchNextSegment: segmentFetching.fetchNextSegment,
    switchQuality: qualitySelection.switchQuality,
    enqueueOperation: callbacks.enqueueOperation,
    videoId,
    isPausedRef,
  });

  // Initialize event handlers with all dependencies
  const eventHandlers = usePlayerEventHandlers({
    videoId,
    videoRef,
    mediaSourceRef,
    mediaSourceStateRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    lastTimeUpdateRef,
    lastBufferGapRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    isOnlineRef,
    videoQualityIdxRef,
    isInitializedRef,
    isPausedRef, // CRITICAL
    lastPauseTimeRef,
    pauseDurationRef,
    shouldStopDownloadingRef,
    showReplay,
    setShowReplay,
    setHasPlaybackStarted,
    setIsPaused,
    tryEndStream: callbacks.tryEndStream,
    handleStall: callbacksWithQuality.handleStall,
    resetStreamForSeek: callbacksWithQuality.resetStreamForSeek,
    switchQuality: qualitySelection.switchQuality,
    fetchNextSegment: segmentFetching.fetchNextSegment,
    calculateEstimatedBufferEndWrapper:
      callbacks.calculateEstimatedBufferEndWrapper,
    resetPlayer: callbacksWithQuality.resetPlayer,
    initializePlayer: () => {}, // Will be replaced by initializer
    abortAllRequests,
  });

  // Initialize player with event handlers
  const initializer = usePlayerInitializer({
    videoId,
    videoRef,
    isInitializedRef,
    shouldInitializeRef,
    mediaSourceRef,
    mediaSourceStateRef,
    videoSbRef,
    audioSbRef,
    videoRepsRef,
    audioRepsRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    segmentDurationRef,
    videoQualityIdxRef,
    evictionIntervalRef,
    bolaStateRef,
    videoInitSegmentCache,
    audioInitSegmentCache,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    lastProcessedSegmentsRef,
    throughputEMARef,
    setVideoReps,
    setAudioReps,
    setUiVideoQualityIdx,
    cleanupMediaSource,
    enqueueOperation: callbacks.enqueueOperation,
    fetchNextSegment: segmentFetching.fetchNextSegment,
    getVideoThroughput,
    evictBuffer,
    onTimeUpdate: eventHandlers.onTimeUpdate,
    onSeeking: eventHandlers.onSeeking,
    onWaiting: eventHandlers.onWaiting,
    onPause: eventHandlers.onPause, // CRITICAL
    onPlayResume: eventHandlers.onPlayResume, // CRITICAL
    abortAllRequests,
  });

  // Update event handlers with initializer
  const eventHandlersWithInit = {
    ...eventHandlers,
    initializePlayer: initializer.initializePlayer,
  };

  useNetworkStatus({
    setIsOnline,
    setShowOfflineMessage,
    isOnlineRef,
    lastOnlineTimeRef,
    isInOnlineRecoveryRef,
    startupTimeRef,
    mediaSourceStateRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoFinishedRef,
    audioFinishedRef,
    videoNextSegRef,
    audioNextSegRef,
    videoRef,
    isInEmergencyModeRef,
    bufferRecoveryTargetRef,
    targetBufferLevelRef,
    abortAllRequests,
    fetchNextSegment: segmentFetching.fetchNextSegment,
    videoId,
    TARGET_BUFFER_LEVEL,
    BUFFER_RECOVERY_MULTIPLIER,
    getBufferGap,
  });

  usePlayerEffects({
    videoId,
    videoRef,
    videoReps,
    availableQualities,
    uiVideoQualityIdx,
    showReplay,
    mediaSourceStateRef,
    videoQualityIdxRef,
    playheadVelocityRef,
    throughputEMARef,
    durationRef,
    isFirstRenderRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
    recoveryAbortRef,
    videoFinishedRef,
    audioFinishedRef,
    isPausedRef, // CRITICAL
    setAvailableQualities,
    setCurrentStats,
    setHasPlaybackStarted,
    shouldAllowQualitySwitch: qualitySelection.shouldAllowQualitySwitch,
    decideQuality: qualitySelection.decideQuality,
    switchQuality: qualitySelection.switchQuality,
    handleEnded: eventHandlersWithInit.handleEnded,
    handleError: eventHandlersWithInit.handleError,
    handlePlay: eventHandlersWithInit.handlePlay,
    initializePlayer: initializer.initializePlayer,
    abortAllRequests,
    cleanupMediaSource,
    currentQuality,
  });

  // UI handlers
  const handleQualityChange = useCallback((quality: string | number) => {
    setCurrentQuality(quality);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setHasPlaybackStarted(true);
  }, [setHasPlaybackStarted]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      callbacksWithQuality.resetStreamForSeek(time);
    },
    [callbacksWithQuality]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          if (isPlaying) {
            videoEl.pause();
          } else {
            videoEl.play().catch(console.error);
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
          break;

        case "ArrowRight":
          e.preventDefault();
          videoEl.currentTime = Math.min(
            videoEl.duration,
            videoEl.currentTime + 10
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          videoEl.volume = Math.min(1, videoEl.volume + 0.1);
          break;

        case "ArrowDown":
          e.preventDefault();
          videoEl.volume = Math.max(0, videoEl.volume - 0.1);
          break;

        case "f":
        case "F":
          e.preventDefault();
          break;

        case "m":
        case "M":
          e.preventDefault();
          videoEl.muted = !videoEl.muted;
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [videoRef, isPlaying]);

  return (
    <div className="player-container">
      <div className="controls-wrapper">
        <StatsDisplay stats={currentStats} isOnline={isOnline} />
      </div>

      <div className="video-wrapper">
        <VideoPlayer
          videoRef={videoRef}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          availableQualities={availableQualities}
          currentQuality={currentQuality}
          onQualityChange={handleQualityChange}
        />

        {!hasPlaybackStarted && (
          <PlayOverlay onPlay={eventHandlersWithInit.handlePlayButtonClick} />
        )}
        {showReplay && (
          <ReplayOverlay onReplay={eventHandlersWithInit.handleReplayClick} />
        )}
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

        .controls-wrapper {
          background: #2a2a2a;
          border-bottom: 1px solid #444;
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
