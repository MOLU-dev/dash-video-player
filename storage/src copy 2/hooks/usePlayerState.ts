import { useState, useRef, useCallback } from 'react';
import type {
  Representation,
  PlayerStats,
  QualityInfo,
  BOLAState,
  PendingQualitySwitch,
  PendingAppend,
  OperationQueue,
  SegmentRequest,
} from '../types/player.types';
import { TARGET_BUFFER_LEVEL } from '../constants/player.constants';

export function usePlayerState() {
  const [videoReps, setVideoReps] = useState<Representation[]>([]);
  const [audioReps, setAudioReps] = useState<Representation[]>([]);
  const [availableQualities, setAvailableQualities] = useState<QualityInfo[]>(
    []
  );
  const [currentStats, setCurrentStats] = useState<PlayerStats>({
    throughput: 0,
    buffer: 0,
    quality: "",
  });
  const [showReplay, setShowReplay] = useState(false);
  const [uiVideoQualityIdx, setUiVideoQualityIdx] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);

  // Refs for video element and media source
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const mediaSourceStateRef = useRef<"closed" | "open" | "ended">("closed");
  const videoSbRef = useRef<SourceBuffer | null>(null);
  const audioSbRef = useRef<SourceBuffer | null>(null);

  // Refs for representations
  const videoRepsRef = useRef<Representation[]>([]);
  const audioRepsRef = useRef<Representation[]>([]);
  const videoRepRef = useRef<Representation | null>(null);
  const audioRepRef = useRef<Representation | null>(null);

  // Refs for segment tracking
  const videoNextSegRef = useRef<number>(0);
  const audioNextSegRef = useRef<number>(0);
  const videoFinishedRef = useRef<boolean>(false);
  const audioFinishedRef = useRef<boolean>(false);
  const durationRef = useRef<number>(0);

  // Refs for quality management
  const videoQualityIdxRef = useRef(0);
  const lastQualitySwitchRef = useRef(0);
  const qualitySwitchInProgressRef = useRef(false);
  const pendingQualitySwitchRef = useRef<PendingQualitySwitch | null>(null);

  // Refs for abort controllers
  const abortControllersRef = useRef<{
    video: AbortController[];
    audio: AbortController[];
  }>({ video: [], audio: [] });

  // Refs for operation queues
  const operationQueuesRef = useRef<OperationQueue>({
    video: [],
    audio: [],
    videoProcessing: false,
    audioProcessing: false,
  });

  // Refs for fetching state
  const isFetchingVideoRef = useRef(false);
  const isFetchingAudioRef = useRef(false);
  const videoFetchPausedRef = useRef(false);
  const audioFetchPausedRef = useRef(false);

  // Refs for timing
  const lastTimeUpdateRef = useRef(0);
  const lastSeekTimeRef = useRef(0);
  const lastBufferGapRef = useRef(0);
  const evictionIntervalRef = useRef<number | null>(null);

  // Refs for BOLA
  const bolaStateRef = useRef<BOLAState>({
    vp: 0,
    gp: 0,
    utilities: [],
  });

  // Refs for buffer management
  const targetBufferLevelRef = useRef(TARGET_BUFFER_LEVEL);
  const segmentDurationRef = useRef(0);
  const playheadVelocityRef = useRef(1);
  const isStalledRef = useRef(false);
  const lastStallTimeRef = useRef(0);
  const rebufferTimeoutRef = useRef<number | null>(null);

  // Refs for mode management
  const isInitializedRef = useRef(false);
  const shouldInitializeRef = useRef(true);
  const isOnlineRef = useRef(true);

  // Refs for quality switch tracking
  const lastProcessedSegmentsRef = useRef<Map<string, number>>(new Map());
  const currentBufferEndRef = useRef(0);
  const isQualitySwitchingRef = useRef(false);

  // Refs for init segments
  const currentVideoInitSegmentRef = useRef<Uint8Array | null>(null);
  const currentAudioInitSegmentRef = useRef<Uint8Array | null>(null);
  const currentVideoRepIdRef = useRef<string | null>(null);
  const currentAudioRepIdRef = useRef<string | null>(null);
  const pendingSegmentOperationsRef = useRef<
    Map<number, { repId: string; mediaType: string }>
  >(new Map());

  const segmentOperationIdRef = useRef(0);

  // Refs for buffer state
  const isInEmergencyModeRef = useRef(false);
  const emergencySwitchCountRef = useRef(0);
  const bufferRecoveryTargetRef = useRef(0);
  const lastBufferStateRef = useRef<"healthy" | "low" | "critical">("healthy");

  // Refs for init segment caching
  const videoInitSegmentCache = useRef<Map<string, Uint8Array>>(new Map());
  const audioInitSegmentCache = useRef<Map<string, Uint8Array>>(new Map());

  // Refs for fetch timing
  const lastVideoFetchTimeRef = useRef(0);
  const lastAudioFetchTimeRef = useRef(0);
  const isFirstRenderRef = useRef(true);

  // Refs for pending appends
  const pendingAppendsRef = useRef<{
    video: PendingAppend[];
    audio: PendingAppend[];
  }>({ video: [], audio: [] });

  const estimatedBufferEndRef = useRef(0);

  // Refs for quality stability
  const lastStableQualityRef = useRef<number | null>(null);

  // Refs for recovery
  const recoveryAbortRef = useRef<AbortController | null>(null);
  const isSeekingRef = useRef(false);

  // Refs for online/offline
  const lastOnlineTimeRef = useRef(0);
  const isInOnlineRecoveryRef = useRef(false);
  const startupTimeRef = useRef(0);

  // Refs for active segment requests
  const activeSegmentRequestsRef = useRef<Map<number, SegmentRequest>>(
    new Map()
  );
  const segmentRequestIdRef = useRef(0);

  const abortAllRequests = useCallback((mediaType?: "video" | "audio") => {
    if (!mediaType || mediaType === "video") {
      abortControllersRef.current.video.forEach((ac) => {
        try {
          ac.abort();
        } catch (e) {}
      });
      abortControllersRef.current.video = [];
    }
    if (!mediaType || mediaType === "audio") {
      abortControllersRef.current.audio.forEach((ac) => {
        try {
          ac.abort();
        } catch (e) {}
      });
      abortControllersRef.current.audio = [];
    }
  }, []);

//New
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const lastPauseTimeRef = useRef(0);
  const pauseDurationRef = useRef(0);

  // Track download state
  const isDownloadingRef = useRef(false);
  const shouldStopDownloadingRef = useRef(false);
  
 
  const [currentQuality, setCurrentQuality] = useState<string | number>("auto");


  return {
    // State
    videoReps,
    setVideoReps,
    audioReps,
    setAudioReps,

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

    // Refs
    videoRef,
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

    // Functions
    abortAllRequests,
    isPaused,
    setIsPaused,
    isPausedRef,
    lastPauseTimeRef,
    pauseDurationRef,
    isDownloadingRef,
    shouldStopDownloadingRef,
    setCurrentQuality,
    currentQuality,
  };
}