"use client";

import React, { useCallback, useState, useEffect } from "react";
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
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
} from "../../../src/constants/player.constants";
import { getBufferGap } from "../../../src/utils/playerHelpers";
import { usePlaybackPosition } from "./usePlaybackPosition";
import { useDownloadManager } from "./useDownloadManager";
import type { Representation } from "../../../src/types/player.types";

// NEW: Interface with optional props for reel mode
interface UseGrpcPlayerProps {
  videoId: string;
  autoInitialize?: boolean; // Control auto-initialization
  disableAutoPlay?: boolean; // Prevent automatic playback
}

export function useGrpcPlayer({
  videoId,
  autoInitialize = true, // Default: true for backward compatibility
  disableAutoPlay = false, // Default: false for backward compatibility
}: UseGrpcPlayerProps) {
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
    showResumeToast,
    setShowResumeToast,
    shouldShowResumeAfterPlay,
    setShouldShowResumeAfterPlay,
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
    initializePlayer: () => {},
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
  // PASS NEW PROPS to usePlayerEffects
  const { handleStartFromBeginning } = usePlayerEffects({
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
    isPausedRef,
    audioFinishedRef,
    videoFinishedRef,
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
    setShowResumeToast,
    autoInitialize, // NEW: Pass control flag
    disableAutoPlay, // NEW: Pass control flag
  });

  // MODIFY handlePlay to respect disableAutoPlay
  const handlePlay = useCallback(() => {
    if (disableAutoPlay) {
      console.warn(`[REEL MODE] Auto-play prevented for video ${videoId}`);
      return;
    }
    videoRef.current?.play();
  }, [disableAutoPlay, videoId, videoRef]);

  const handlePause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const handleSeek = useCallback(
    (time: number) => {
      resetStreamForSeek(time);
    },
    [resetStreamForSeek]
  );

  const actualShowResumePrompt = showResumePrompt || shouldShowResumeAfterPlay;

  // Download manager
  const {
    downloads,
    downloadedVideos,
    downloadVideo,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteDownloadedVideo,
    playDownloadedVideo,
    isVideoDownloaded,
    getDownloadProgress,
    isInitialized,
    clearAllDownloads,
    getDownloadStatus,
    resumeIncompleteDownload,
  } = useDownloadManager();

  const [offlineVideo, setOfflineVideo] = useState<{
    url: string;
    metadata: any;
  } | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);

  const getHighestQualityRep = useCallback((): Representation | null => {
    if (videoReps.length === 0) return null;
    const sortedReps = [...videoReps].sort((a, b) => b.bandwidth - a.bandwidth);
    return sortedReps[0];
  }, [videoReps]);

  // Download handlers
  const handleDownload = useCallback(() => {
    const highestRep = getHighestQualityRep();
    if (!highestRep) return;

    downloadVideo(
      videoId,
      highestRep.id,
      highestRep.totalSegments,
      `Video ${videoId}`,
      durationRef.current,
      highestRep.height ? `${highestRep.height}p` : "HD",
      `/api/thumbnail/${videoId}`
    );
  }, [videoId, getHighestQualityRep, downloadVideo, durationRef]);

  const handlePauseDownload = useCallback(() => {
    pauseDownload(videoId);
  }, [videoId, pauseDownload]);

  const handleResumeDownload = useCallback(() => {
    const highestRep = getHighestQualityRep();
    if (!highestRep) return;

    resumeDownload(
      videoId,
      highestRep.id,
      highestRep.totalSegments,
      `Video ${videoId}`,
      durationRef.current,
      highestRep.height ? `${highestRep.height}p` : "HD",
      `/api/thumbnail/${videoId}`
    );
  }, [videoId, getHighestQualityRep, resumeDownload, durationRef]);

  const handleCancelDownload = useCallback(() => {
    cancelDownload(videoId);
  }, [videoId, cancelDownload]);

  const handleDeleteDownload = useCallback(() => {
    deleteDownloadedVideo(videoId);
  }, [videoId, deleteDownloadedVideo]);

  const handlePlayDownloaded = useCallback(
    async (downloadVideoId: string) => {
      try {
        const videoData = await playDownloadedVideo(downloadVideoId);
        setOfflineVideo(videoData);
        setShowDownloads(false);
      } catch (error) {
        console.error("Failed to play downloaded video:", error);
      }
    },
    [playDownloadedVideo]
  );

  const handleCloseOfflinePlayer = useCallback(() => {
    setOfflineVideo(null);
    if (offlineVideo) {
      URL.revokeObjectURL(offlineVideo.url);
    }
  }, [offlineVideo]);

  const currentDownloadProgress = getDownloadProgress(videoId);
  const downloadProgress = currentDownloadProgress
    ? currentDownloadProgress.downloadedSegments
    : 0;
  const downloadStatus = currentDownloadProgress
    ? currentDownloadProgress.status
    : "idle";

  const incompleteDownloads = downloads.filter(
    (d) => d.status === "incomplete" || d.status === "paused"
  );

  const cleanup = useCallback(() => {
    console.log(`Cleaning up player for video ${videoId}`);

    abortAllRequests();
    cancelAllSegmentRequests?.();

    if (evictionIntervalRef.current) {
      clearInterval(evictionIntervalRef.current);
      evictionIntervalRef.current = null;
    }
    if (rebufferTimeoutRef.current) {
      clearTimeout(rebufferTimeoutRef.current);
      rebufferTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = "";
    }

    cleanupMediaSource?.();
  }, [
    videoId,
    abortAllRequests,
    cancelAllSegmentRequests,
    cleanupMediaSource,
    evictionIntervalRef,
    rebufferTimeoutRef,
    videoRef,
  ]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
    handleStartFromBeginning,
    handlePlay,
    handlePause,
    handlePlayButtonClick,
    handleReplayClick,
    switchQuality,
    setCurrentQuality,
    handleSeek,
    showResumeToast,
    setShowResumeToast,
    downloads,
    downloadedVideos,
    onDownload: handleDownload,
    onPauseDownload: handlePauseDownload,
    onResumeDownload: handleResumeDownload,
    onCancelDownload: handleCancelDownload,
    onDeleteDownload: handleDeleteDownload,
    onPlayDownloaded: handlePlayDownloaded,
    isVideoDownloaded,
    downloadProgress,
    downloadStatus,
    offlineVideo,
    onCloseOfflinePlayer: handleCloseOfflinePlayer,
    showDownloads,
    setShowDownloads,
    getHighestQualityRep,
    clearAllDownloads,
    getDownloadStatus,
    resumeIncompleteDownload,
    incompleteDownloads,
    cleanup,
    // NEW: Expose manual initialization for reel mode
    manualInitialize: initializePlayer,
  };
}
