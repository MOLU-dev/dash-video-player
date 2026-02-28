"use client";

import React, { useEffect } from "react";
import { usePlayerState } from "../../src/hooks/usePlayerState";
import { useThroughputMeasurement } from "../../src/hooks/useThroughputMeasurement";
import { useMediaSource } from "../../src/hooks/useMediaSource";
import { useNetworkStatus } from "../../src/hooks/useNetworkStatus";
import { useBufferManagement } from "../../src/hooks/useBufferManagement";
import { useQualitySelection } from "../../src/hooks/useQualitySelection";
import { useSegmentFetching } from "../../src/hooks/useSegmentFetching";
import { useDurationManagement } from "../../src/hooks/useDurationManagement";
import { usePlayerCallbacks } from "../../src/hooks/core/usePlayerCallbacks";
import { usePlayerInitializer } from "../../src/hooks/core/usePlayerInitializer";
import { usePlayerEventHandlers } from "../../src/hooks/core/usePlayerEventHandlers";
import { usePlayerEffects } from "../../src/hooks/core/usePlayerEffects";
import { PlayerControls } from "./PlayerControls";
import { StatsDisplay } from "./StatsDisplay";
import { VideoPlayer } from "./VideoPlayer";
import { PlayOverlay } from "./PlayOverlay";
import { ReplayOverlay } from "./ReplayOverlay";
import { OfflineOverlay } from "./OfflineOverlay";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
} from "../../src/constants/player.constants";
import { getBufferGap } from "../../src/utils/playerHelpers";

export default function GrpcDashPlayer({ videoId }: { videoId: string }) {
  // Player state
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
    isPausedRef,
    shouldStopDownloadingRef,
    isDownloadingRef,
    currentQuality,
  } = playerState;

  // Throughput measurement
  const {
    throughputEMARef,
    updateThroughputMeasurement,
    getVideoThroughput,
    calculateWeightedThroughput,
  } = useThroughputMeasurement();

  // Media source management
  const { cleanupMediaSource } = useMediaSource({
    videoRef,
    mediaSourceRef,
    mediaSourceStateRef,
    videoSbRef,
    audioSbRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
  });

  // Duration management
  const { setMediaSourceDuration, getEffectiveDuration, isAtEnd, isAtStart } =
    useDurationManagement({
      videoRef,
      mediaSourceRef,
      durationRef,
    });

  // Player callbacks
  const {
    tryEndStream,
    processQueue,
    enqueueOperation: enqueueOp,
    validateSegmentCompatibility,
    calculateEstimatedBufferEndWrapper,
  } = usePlayerCallbacks({
    videoRef,
    videoRepRef,
    audioRepRef,
    videoFinishedRef,
    audioFinishedRef,
    operationQueuesRef,
    mediaSourceRef,
    durationRef,
    pendingAppendsRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    qualitySwitchInProgressRef,
  });

  // Wrap enqueueOperation to include callbacks
  const enqueueOperation = React.useCallback(
    (mediaType: "video" | "audio", operation: () => Promise<void>) => {
      enqueueOp(mediaType, operation, processQueue, tryEndStream);
    },
    [enqueueOp, processQueue, tryEndStream]
  );

  // Segment fetching
  const {
    fetchNextSegment,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
  } = useSegmentFetching({
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
    validateSegmentCompatibility,
    enqueueOperation,
    updateThroughputMeasurement,
    calculateEstimatedBufferEnd: calculateEstimatedBufferEndWrapper,
    tryEndStream,
    isPausedRef,
    shouldStopDownloadingRef,
    isDownloadingRef,
  });

  // Quality selection
  const { switchQuality, decideQuality, shouldAllowQualitySwitch } =
    useQualitySelection({
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
      cancelAllSegmentRequests,
      completeOngoingSegmentOperations,
      enqueueOperation,
      fetchNextSegment,
      getVideoThroughput,
      calculateEstimatedBufferEnd: calculateEstimatedBufferEndWrapper,
      videoId,
      isPausedRef,
      audioFinishedRef,
    });

  // Buffer management
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
    fetchNextSegment,
    switchQuality,
    enqueueOperation,
    videoId,
    currentQuality,
    isPausedRef,
    shouldAllowQualitySwitch,
  });

  // Event handlers
  const {
    handleStall,
    resetStreamForSeek,
    resetPlayer,
    handlePlayButtonClick,
    handleReplayClick,
  } = usePlayerEventHandlers({
    videoId,
    videoRef,
    videoRepsRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    videoQualityIdxRef,
    lastSeekTimeRef,
    lastStallTimeRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    mediaSourceRef,
    throughputEMARef,
    lastQualitySwitchRef,
    lastBufferGapRef,
    rebufferTimeoutRef,
    videoInitSegmentCache,
    audioInitSegmentCache,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    lastProcessedSegmentsRef,
    pendingAppendsRef,
    pendingSegmentOperationsRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    operationQueuesRef,
    isInitializedRef,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    setShowReplay,
    setHasPlaybackStarted,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    cleanupMediaSource,
    initializePlayer: () => {}, // Will be set below
  });

  // Player initializer
  const { initializePlayer } = usePlayerInitializer({
    videoId,
    videoRef,
    isInitializedRef,
    shouldInitializeRef,
    cleanupMediaSource,
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
    lastTimeUpdateRef,
    lastBufferGapRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    isOnlineRef,
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
    getVideoThroughput,
    enqueueOperation,
    fetchNextSegment,
    handleStall,
    resetStreamForSeek,
    switchQuality,
    evictBuffer,
    abortAllRequests,
    tryEndStream,
    setShowReplay,
  });

  // Network status
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
    fetchNextSegment,
    videoId,
    TARGET_BUFFER_LEVEL,
    BUFFER_RECOVERY_MULTIPLIER,
    getBufferGap,
  });

  // All effects (quality updates, auto mode, playhead velocity, etc.)
  usePlayerEffects({
    videoId,
    videoRef,
    videoReps,
    availableQualities,
    uiVideoQualityIdx,
    showReplay,
    videoQualityIdxRef,
    playheadVelocityRef,
    durationRef,
    mediaSourceStateRef,
    isFirstRenderRef,
    isInitializedRef,
    throughputEMARef,
    evictionIntervalRef,
    rebufferTimeoutRef,
    recoveryAbortRef,
    setAvailableQualities,
    setCurrentStats,
    setHasPlaybackStarted,
    setShowReplay,
    shouldAllowQualitySwitch,
    decideQuality,
    switchQuality,
    abortAllRequests,
    cleanupMediaSource,
    initializePlayer,
    resetPlayer,
    isPausedRef,
    audioFinishedRef,
    videoFinishedRef,
    currentQuality,
  });

  return (
    <div className="player-container">
      {/* <PlayerControls
        mode={mode}
        setMode={setMode}
        uiVideoQualityIdx={uiVideoQualityIdx}
        availableQualities={availableQualities}
        onQualityChange={switchQuality}
      /> */}

      <StatsDisplay stats={currentStats} isOnline={isOnline} />

      <div className="video-wrapper">
        <VideoPlayer videoRef={videoRef} />

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
