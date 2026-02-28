import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePlayerState } from "@/hooks/usePlayerState";
import { useThroughputMeasurement } from "@/hooks/useThroughputMeasurement";
import { useMediaSource } from "@/hooks/useMediaSource";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useBufferManagement } from "@/hooks/useBufferManagement";
import { useQualitySelection } from "@/hooks/useQualitySelection";
import { useSegmentFetching } from "@/hooks/useSegmentFetching";
import { useDurationManagement } from "@/hooks/useDurationManagement";
import { usePlayerCallbacks } from "@/hooks/core/usePlayerCallbacks";
import { usePlayerInitializer } from "@/hooks/core/usePlayerInitializer";
import { usePlayerEventHandlers } from "@/hooks/core/usePlayerEventHandlers";
import { usePlayerEffects } from "@/hooks/core/usePlayerEffects";
import { useBufferControl } from "@/hooks/useBufferControl";

import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
} from "@/constants/player.constants";

import { getBufferGap } from "@/utils/playerHelpers";

import { usePlaybackPosition } from "./usePlaybackPosition";
import { useDownloadManager } from "./useDownloadManager";

import type { Representation, PrefetchMetadata } from "@/types/player.types";

import { useSeekHandler } from "./useSeekHandler";

interface UseGrpcPlayerProps {
  videoId: string;
  autoInitialize?: boolean;
  disableAutoPlay?: boolean;
  isReelMode?: boolean;

  // ADD THIS:
  prefetchMetadata?: Map<string, PrefetchMetadata>;
}

export function useGrpcPlayer({
  videoId,
  autoInitialize = false,
  disableAutoPlay = false,
  isReelMode = false,

  prefetchMetadata = new Map(), // Default to empty Map
}: UseGrpcPlayerProps) {
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPosition, setSavedPosition] = useState<number | null>(null);

  // Memoize playback position functions
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
    isLive,
    setIsLive,
    isLiveRef,
  } = playerState;

  const initializePlayerRef = useRef<() => void>(() => {});

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

  // Player callbacks - Memoized
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
  const enqueueOperation = useCallback(
    (mediaType: "video" | "audio", operation: () => Promise<void>) => {
      enqueueOp(mediaType, operation, processQueue, tryEndStream);
    },
    [enqueueOp, processQueue, tryEndStream]
  );

  const {
    shouldFetchSegment: _shouldFetchSegment,
    markFetchStart,
    markFetchEnd,
    cancelScheduledFetch,
    scheduleNextFetch,
    getBufferState,
    getBufferVisualization,
  } = useBufferControl();

  // Wrap with isLive state
  const unifiedShouldFetchSegment = useCallback(
    (
      mediaType: "video" | "audio",
      videoSb: SourceBuffer | null,
      audioSb: SourceBuffer | null,
      currentTime: number,
      isEmergency?: boolean,
      isLiveOverride?: boolean
    ) =>
      _shouldFetchSegment(
        mediaType,
        videoSb,
        audioSb,
        currentTime,
        isEmergency,
        isLiveOverride !== undefined ? isLiveOverride : isLive
      ),
    [_shouldFetchSegment, isLive]
  );

  // Segment fetching - pass prefetchMetadata
  const {
    fetchNextSegment,
    fetchAndAppend,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
    getBufferStats,
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
    shouldFetchSegment: unifiedShouldFetchSegment,
    markFetchStart,
    markFetchEnd,
    scheduleNextFetch,
    videoSbRef,
    audioSbRef,
    prefetchMetadata,
    isLiveRef,
    qualitySwitchInProgressRef,
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
      isLiveRef,
    });

  // Player initializer - pass prefetchMetadata
  const switchQualityVoid = useCallback(
    async (newIdx: number) => {
      await switchQuality(newIdx);
    },
    [switchQuality]
  );

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
    switchQuality: switchQualityVoid,
    enqueueOperation,
    videoId,
    isPausedRef,
    shouldAllowQualitySwitch,
    currentQuality,
    shouldFetchSegment: unifiedShouldFetchSegment,
    scheduleNextFetch,
  });

  // Event handlers
  const {
    handleStall,
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
    initializePlayer: () => initializePlayerRef.current(),
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
    shouldFetchSegment: unifiedShouldFetchSegment,
    scheduleNextFetch,
    isLiveRef,
  });

  const { resetStreamForSeek } = useSeekHandler({
    videoRef,
    lastSeekTimeRef,
    isSeekingRef,
    lastStallTimeRef,
    videoSbRef,
    audioSbRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    lastProcessedSegmentsRef,
    pendingAppendsRef,
    pendingSegmentOperationsRef,
    isFetchingVideoRef,
    isFetchingAudioRef,
    operationQueuesRef,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    videoId,
  });

  // Player initializer - pass prefetchMetadata
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
    savedPosition, // Pass the saved position

    resetStreamForSeek,
    handleStall,
    switchQuality: switchQualityVoid,
    tryEndStream,
    setShowReplay,
    onPause,
    onPlayResume,
    prefetchMetadata,
    isLiveRef,
    setIsLive,
    targetBufferLevelRef,
    hasPlaybackStarted,
    setHasPlaybackStarted,
  });

  // Update ref for circular dependency
  useEffect(() => {
    initializePlayerRef.current = initializePlayer;
  }, [initializePlayer]);

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
    isPausedRef,
    isLiveRef,
  });

  // All effects
  const { handleStartFromBeginning, isQualitySwitchBlocked } = usePlayerEffects(
    {
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
      switchQuality: switchQualityVoid,
      abortAllRequests,
      cleanupMediaSource,
      initializePlayer,
      resetPlayer,
      onPause,
      onPlayResume,
      setShouldShowResumeAfterPlay,
      setShowResumeToast,
      setCurrentQuality,
      autoInitialize,
      disableAutoPlay,
      isReelMode,
    }
  );

  // Memoized handlers
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
      console.log(`🎯 SEEK HANDLER CALLED: Seeking to ${time}`);
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

  // Memoize highest quality rep
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

  // Memoize download progress calculations
  const currentDownloadProgress = useMemo(
    () => getDownloadProgress(videoId),
    [videoId, getDownloadProgress, downloads]
  );

  const downloadProgress = currentDownloadProgress
    ? currentDownloadProgress.downloadedSegments
    : 0;
  const downloadStatus = currentDownloadProgress
    ? currentDownloadProgress.status
    : "idle";

  const incompleteDownloads = useMemo(
    () =>
      downloads.filter(
        (d) => d.status === "incomplete" || d.status === "paused"
      ),
    [downloads]
  );

  // Cleanup
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

  // Single cleanup effect
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
    manualInitialize: initializePlayer,
    isQualitySwitchBlocked,
    isLive,
    setIsLive,
    isLiveRef,
  };
}
