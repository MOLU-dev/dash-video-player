"use client";

import React, { useCallback, useState } from "react";
import { usePlayerState } from "../../../src/hooks/usePlayerState";
import { useThroughputMeasurement } from "../../../src/hooks/useThroughputMeasurement";
import { useMediaSource } from "../../../src/hooks/useMediaSource";
import { useNetworkStatus } from "../../../src/hooks/useNetworkStatus";
import { useBufferManagement } from "../../../src/hooks/useBufferManagement";
import { useQualitySelection } from "../../../src/hooks/useQualitySelection";
import { useSegmentFetching } from "../../../src/hooks/useSegmentFetching";
import { useDurationManagement } from "../../../src/hooks/useDurationManagement";
import { usePlayerCallbacks } from "../../../src/hooks/core/usePlayerCallbacks";
import { usePlayerInitializer } from "../../../src/hooks/core/usePlayerInitializer";
import { usePlayerEventHandlers } from "../../../src/hooks/core/usePlayerEventHandlers";
import { usePlayerEffects } from "../../../src/hooks/core/usePlayerEffects";
// import { PlayerControls } from "./PlayerControls";
// import { StatsDisplay } from "./StatsDisplay";
// import { VideoPlayer } from "./VideoPlayer";
// import { PlayOverlay } from "./PlayOverlay";
// import { ReplayOverlay } from "./ReplayOverlay";
// import { OfflineOverlay } from "./OfflineOverlay";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
} from "../../../src/constants/player.constants";
import { getBufferGap } from "../../../src/utils/playerHelpers";
import { usePlaybackPosition } from "./usePlaybackPosition";

export function useGrpcPlayer({ videoId }: { videoId: string }) {
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPosition, setSavedPosition] = useState<number | null>(null);

  const {
    getSavedPosition,
    savePosition,
    clearPosition,
    startAutoSave,
    stopAutoSave,
  } = usePlaybackPosition(videoId);

  const [shouldShowResumeAfterPlay, setShouldShowResumeAfterPlay] =
    useState(false);

  const [showResumeToast, setShowResumeToast] = useState(false);

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
    recoveryAbortRef,
    isSeekingRef,
    lastOnlineTimeRef,
    isInOnlineRecoveryRef,
    startupTimeRef,
    activeSegmentRequestsRef,
    segmentRequestIdRef,
    abortAllRequests,
    isDownloadingRef,
    isPausedRef,
    shouldStopDownloadingRef,
    currentQuality,
    setIsPaused,
    pauseDurationRef,
    lastPauseTimeRef,
    setCurrentQuality,
    isInitialState,
    setIsInitialState,
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
    isDownloadingRef,
    isPausedRef,
    shouldStopDownloadingRef,
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
      audioFinishedRef,
      isPausedRef,
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
    isPausedRef,
    shouldAllowQualitySwitch,
    currentQuality,
  });

  // Event handlers
  const {
    handleStall,
    resetStreamForSeek,
    resetPlayer,
    handlePlayButtonClick,
    handleReplayClick,
    onPause,
    onPlayResume,
    // onTimeUpdate,
    // onSeeking,
    // onWaiting,
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
    showReplay,
    isOnlineRef,
    mediaSourceStateRef,
    isPausedRef,
    setIsPaused,
    pauseDurationRef,
    shouldStopDownloadingRef,
    lastPauseTimeRef,
    lastTimeUpdateRef,
    tryEndStream,
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
    evictBuffer,
    abortAllRequests,
    lastBufferGapRef,
    lastTimeUpdateRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    isOnlineRef,
    resetStreamForSeek,
    handleStall,
    switchQuality,
    tryEndStream,
    setShowReplay,
    onPause,
    onPlayResume,
    // onSeeking,
    // onTimeUpdate,
    // onWaiting
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
  const { handleResume, handleStartFromBeginning } = usePlayerEffects({
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
    savedPosition,
    isStalledRef,
    currentQuality,
    hasPlaybackStarted,
    handlePlayButtonClick,
    getSavedPosition,
    clearPosition,
    savePosition,
    setBufferProgress,
    setIsBuffering,
    stopAutoSave,
    startAutoSave,
    setSavedPosition,
    setShowResumePrompt,
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
    onPause,
    onPlayResume,
    setShouldShowResumeAfterPlay,
  });

  //   return (
  //     <div className="player-container">
  //       {/* <PlayerControls
  //         mode={mode}
  //         setMode={setMode}
  //         uiVideoQualityIdx={uiVideoQualityIdx}
  //         availableQualities={availableQualities}
  //         onQualityChange={switchQuality}
  //       /> */}

  //       <StatsDisplay stats={currentStats} isOnline={isOnline} />

  //       <div className="video-wrapper">
  //   <VideoPlayer
  //           videoRef={videoRef}
  //           onPlay={onPlayResume}
  //           onPause={onPause}
  //           // onSeek={handleSeek}
  //           // availableQualities={availableQualities}
  //           // currentQuality={currentQuality}
  //           // onQualityChange={handleQualityChange}
  //         />
  //         {!hasPlaybackStarted && <PlayOverlay onPlay={handlePlayButtonClick} />}

  //         {showReplay && <ReplayOverlay onReplay={handleReplayClick} />}

  //         {showOfflineMessage && <OfflineOverlay />}
  //       </div>

  //       <style jsx>{`
  //         .player-container {
  //           max-width: 800px;
  //           margin: 0 auto;
  //           background: #1e1e1e;
  //           border-radius: 8px;
  //           overflow: hidden;
  //           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  //           font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  //         }

  //         .video-wrapper {
  //           position: relative;
  //         }

  //         @media (max-width: 600px) {
  //           .player-container {
  //             border-radius: 0;
  //           }
  //         }
  //       `}</style>
  //     </div>
  //   );
  // }
  // Add these in your hook’s internal logic:

  // const handlePlay = useCallback(() => {
  //   videoRef.current?.play();
  // }, []);

  const handlePlay = useCallback(() => {
    if (shouldShowResumeAfterPlay) {
      setShouldShowResumeAfterPlay(false);
      setShowResumePrompt(true);
      // Don't play the video when showing resume prompt
      return;
    }

    // Only play if we're not showing any prompts
    if (!showResumePrompt) {
      videoRef.current?.play();
    }
  }, [shouldShowResumeAfterPlay, showResumePrompt]);

  const handlePause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      resetStreamForSeek(time);
    },
    [resetStreamForSeek]
  );

  // Playback position management

  const actualShowResumePrompt = showResumePrompt || shouldShowResumeAfterPlay;

  return {
    videoRef,
    availableQualities,
    currentStats,
    showReplay,
    uiVideoQualityIdx,
    isOnline,
    showOfflineMessage,
    hasPlaybackStarted,
    currentQuality,
    isFirstRenderRef,
    isBuffering,
    bufferProgress,
    showResumePrompt: actualShowResumePrompt,
    savedPosition,
    handleResume,
    handleStartFromBeginning,
    handlePlay,
    handlePause,
    handlePlayButtonClick,
    handleReplayClick,
    switchQuality,
    setCurrentQuality,
    handleSeek,
  };
}
