"use client";

import React, { useEffect, useCallback, useState } from "react";
import { usePlayerState } from "./src/hooks/usePlayerState";
import { useThroughputMeasurement } from "./src/hooks/useThroughputMeasurement";
import { useMediaSource } from "./src/hooks/useMediaSource";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";
import { useBufferManagement } from "./src/hooks/useBufferManagement";
import { useQualitySelection } from "./src/hooks/useQualitySelection";
import { useSegmentFetching } from "./src/hooks/useSegmentFetching";
import { PlayerControls } from "./PlayerControls";
import { StatsDisplay } from "./StatsDisplay";
import { VideoPlayer } from "./VideoPlayer";
import { PlayOverlay } from "./PlayOverlay";
import { ReplayOverlay } from "./ReplayOverlay";
import { OfflineOverlay } from "./OfflineOverlay";
import { grpcClient } from "./src/utils/grpcClient";
import { ManifestRequest, ManifestResponse } from "./src/proto/rpc_stream_pb";
import { parseManifest } from "./src/services/manifestParser";
import { fetchInitSegment } from "./src/services/segmentFetcher";
import { createSourceBufferForMime } from "./src/utils/dashHelpers";
import { getBufferGap, getSegmentNumber } from "./src/utils/playerHelpers";
import {
  appendBufferSafely,
  calculateEstimatedBufferEnd,
} from "./src/utils/bufferHelpers";
import {
  initializeBOLA,
  chooseInitialQualityIdx,
} from "./src/utils/qualityHelpers";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_RECOVERY_MULTIPLIER,
  REBUFFER_THRESHOLD,
  BUFFER_EVICTION_INTERVAL,
  BUFFER_EMERGENCY_THRESHOLD,
  BUFFER_MIN_SWITCH_THRESHOLD,
} from "./src/constants/player.constants";
import type { MediaType, OperationQueue } from "./src/types/player.types";
import { removeBufferRange } from "./src/utils/bufferHelpers";
import { useDurationManagement } from "./src/hooks/useDurationManagement";
import { CustomControls } from "./src/components/CustomControls";

export default function GrpcDashPlayer({ videoId }: { videoId: string }) {
  const playerState = usePlayerState();
  const {
    videoRef,
    mode,
    setMode,
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
    modeRef,
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
  } = playerState;

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

  const tryEndStream = useCallback(() => {
    const queue = operationQueuesRef.current;
    const videoEl = videoRef.current;

    // Check if all segments are fetched
    if (
      !videoFinishedRef.current ||
      !audioFinishedRef.current ||
      queue.video.length !== 0 ||
      queue.audio.length !== 0 ||
      queue.videoProcessing ||
      queue.audioProcessing ||
      !mediaSourceRef.current ||
      mediaSourceRef.current.readyState !== "open"
    ) {
      return;
    }

    // CRITICAL: Only end stream if video is near the end position
    if (videoEl && durationRef.current > 0) {
      const timeUntilEnd = durationRef.current - videoEl.currentTime;

      // Only end stream when playhead is within 2 seconds of the end
      // This allows buffering to complete without ending the stream prematurely
      if (timeUntilEnd > 2) {
        console.log(
          `Not ending stream yet - ${timeUntilEnd.toFixed(1)}s remaining`
        );
        return;
      }
    }

    console.log("Ending MediaSource stream");
    mediaSourceRef.current.endOfStream();
  }, [
    videoFinishedRef,
    audioFinishedRef,
    operationQueuesRef,
    mediaSourceRef,
    videoRef,
    durationRef,
  ]);

  const processQueue = useCallback(
    async (mediaType: MediaType) => {
      const queue = operationQueuesRef.current;
      let targetQueue: (() => Promise<void>)[];
      let processingFlag: keyof OperationQueue;

      if (mediaType === "video") {
        targetQueue = queue.video;
        processingFlag = "videoProcessing";
      } else {
        targetQueue = queue.audio;
        processingFlag = "audioProcessing";
      }

      if (queue[processingFlag] || targetQueue.length === 0) return;

      queue[processingFlag] = true;
      const operation = targetQueue.shift()!;

      try {
        await operation();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`Error processing ${mediaType} operation:`, err);
        }
      } finally {
        queue[processingFlag] = false;
        if (targetQueue.length > 0) {
          processQueue(mediaType);
        }
        tryEndStream();
      }
    },
    [operationQueuesRef, tryEndStream]
  );

  const enqueueOperation = useCallback(
    (mediaType: MediaType, operation: () => Promise<void>) => {
      const queue = operationQueuesRef.current;
      if (mediaType === "video") {
        queue.video.push(operation);
      } else {
        queue.audio.push(operation);
      }
      processQueue(mediaType);
    },
    [operationQueuesRef, processQueue]
  );

  const validateSegmentCompatibility = useCallback(
    (repId: string, mediaType: string, segmentNumber?: number): boolean => {
      if (mediaType === "video") {
        const currentRepId = currentVideoRepIdRef.current;

        if (qualitySwitchInProgressRef.current) {
          const isOldRep = repId === currentRepId;
          const isNewRep = videoRepRef.current
            ? repId === videoRepRef.current.id
            : false;

          if (!isOldRep && !isNewRep) {
            console.log(
              `Blocking segment from unrelated rep ${repId} during switch`
            );
            return false;
          }

          return true;
        }

        const isValid = repId === currentRepId;

        if (!isValid) {
          console.log(
            `Segment validation failed: expected ${currentRepId}, got ${repId}`
          );
          return false;
        }

        return true;
      } else {
        return repId === currentAudioRepIdRef.current;
      }
    },
    [
      currentVideoRepIdRef,
      currentAudioRepIdRef,
      qualitySwitchInProgressRef,
      videoRepRef,
    ]
  );

  const calculateEstimatedBufferEndWrapper = useCallback(() => {
    return calculateEstimatedBufferEnd(
      videoRef.current,
      videoRepRef.current,
      audioRepRef.current,
      pendingAppendsRef.current
    );
  }, [videoRef, videoRepRef, audioRepRef, pendingAppendsRef]);

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
  });

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
    });

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
    modeRef,
    videoQualityIdxRef,
    pendingAppendsRef,
    setCurrentStats,
    fetchNextSegment,
    switchQuality,
    enqueueOperation,
    videoId,
  });

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

  const handleStall = useCallback(async () => {
    if (!videoRef.current || !mediaSourceRef.current) return;
    if (isStalledRef.current) return;

    const videoEl = videoRef.current;
    const now = Date.now();

    if (isInOnlineRecoveryRef.current) {
      console.log("Stall handling blocked: in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      console.log("Stall handling blocked: currently seeking");
      return;
    }

    if (now - lastStallTimeRef.current < 3000) return;

    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const currentTime = videoEl.currentTime;
    const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

    console.log(
      "Stall check - buffer gap:",
      bufferGap.toFixed(1),
      "currentTime:",
      currentTime.toFixed(1)
    );

    if (bufferGap >= BUFFER_EMERGENCY_THRESHOLD * 0.8) {
      console.log(
        `Stall handling blocked: buffer gap ${bufferGap.toFixed(
          1
        )}s above emergency threshold`
      );
      return;
    }

    console.log("Handling stall with buffer gap:", bufferGap.toFixed(1));

    lastStallTimeRef.current = now;
    isStalledRef.current = true;

    if (!shouldAllowQualitySwitch("stall-recovery")) {
      console.log("Quality switch blocked by guard conditions during stall");
      isStalledRef.current = false;
      return;
    }

    abortAllRequests();

    try {
      await completeOngoingSegmentOperations("video");
      await completeOngoingSegmentOperations("audio");

      const currentTime = videoEl.currentTime;

      if (
        mode === "auto" &&
        videoRepsRef.current.length > 0 &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD * 0.5
      ) {
        const lowestIdx = 0;
        const lowestRep = videoRepsRef.current[lowestIdx];

        if (videoQualityIdxRef.current !== lowestIdx) {
          console.log("Stall recovery: switching to lowest quality");

          try {
            const initSegment = await fetchInitSegment(
              videoId,
              lowestRep.id,
              "video"
            );
            videoInitSegmentCache.current.set(lowestRep.id, initSegment);
            currentVideoInitSegmentRef.current = initSegment;
            currentVideoRepIdRef.current = lowestRep.id;

            await enqueueOperation("video", () =>
              appendBufferSafely(videoSbRef.current!, initSegment)
            );

            videoRepRef.current = lowestRep;
            videoQualityIdxRef.current = lowestIdx;
            setUiVideoQualityIdx(lowestIdx);
            setCurrentStats((prev) => ({
              ...prev,
              quality: availableQualities[lowestIdx]?.label || "Auto",
            }));
          } catch (err) {
            console.error(
              "Failed to fetch init segment for lowest quality during stall:",
              err
            );
          }
        }
      }

      if (videoRepRef.current) {
        videoNextSegRef.current = getSegmentNumber(
          videoRepRef.current,
          currentTime
        );
        videoFinishedRef.current = false;
      }

      if (audioRepRef.current) {
        audioNextSegRef.current = getSegmentNumber(
          audioRepRef.current,
          currentTime
        );
        audioFinishedRef.current = false;
      }

      if (videoRepRef.current && videoSbRef.current) {
        fetchNextSegment(
          videoId,
          videoRepRef.current,
          "video",
          videoSbRef.current,
          videoNextSegRef,
          videoFinishedRef,
          true
        );
      }

      if (audioRepRef.current && audioSbRef.current) {
        fetchNextSegment(
          videoId,
          audioRepRef.current,
          "audio",
          audioSbRef.current,
          audioNextSegRef,
          audioFinishedRef,
          true
        );
      }
    } catch (error) {
      console.error("Error during stall recovery:", error);
    } finally {
      rebufferTimeoutRef.current = window.setTimeout(() => {
        isStalledRef.current = false;
      }, 2000);
    }
  }, [
    videoRef,
    mediaSourceRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    lastStallTimeRef,
    videoRepsRef,
    videoQualityIdxRef,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    videoSbRef,
    audioSbRef,
    videoInitSegmentCache,
    currentVideoInitSegmentRef,
    currentVideoRepIdRef,
    rebufferTimeoutRef,
    mode,
    availableQualities,
    setUiVideoQualityIdx,
    setCurrentStats,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    videoId,
  ]);

  const resetStreamForSeek = useCallback(
    async (time: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      // Prevent seek loops
      if (Date.now() - lastSeekTimeRef.current < 500) return;
      lastSeekTimeRef.current = Date.now();

      if (isSeekingRef.current) {
        console.log("Seek operation already in progress");
        return;
      }

      // IMPORTANT: Don't show replay during seeking
      setShowReplay(false);

      isSeekingRef.current = true;
      lastStallTimeRef.current = Date.now();

      const seekingTimeout = setTimeout(() => {
        if (isSeekingRef.current) {
          console.warn("Seeking timeout - resetting seeking state");
          isSeekingRef.current = false;
        }
      }, 10000);

      try {
        abortAllRequests();

        operationQueuesRef.current = {
          video: [],
          audio: [],
          videoProcessing: false,
          audioProcessing: false,
        };

        isFetchingVideoRef.current = false;
        isFetchingAudioRef.current = false;

        pendingAppendsRef.current = { video: [], audio: [] };
        pendingSegmentOperationsRef.current.clear();

        const videoSb = videoSbRef.current;
        const audioSb = audioSbRef.current;
        const videoRep = videoRepRef.current;
        const audioRep = audioRepRef.current;

        if (!videoSb || !audioSb || !videoRep || !audioRep) {
          isSeekingRef.current = false;
          return;
        }

        await Promise.all([
          completeOngoingSegmentOperations("video"),
          completeOngoingSegmentOperations("audio"),
        ]);

        // Smart buffer clearing logic
        const currentTime = videoEl.currentTime;
        const isSeekingBackward = time < currentTime;
        const isTargetBuffered =
          videoEl.buffered.length > 0 &&
          Array.from({ length: videoEl.buffered.length }).some(
            (_, i) =>
              time >= videoEl.buffered.start(i) &&
              time <= videoEl.buffered.end(i)
          );

        let needsInitSegment = false;

        if (isSeekingBackward) {
          console.log(
            `⏪ Seeking backward: ${currentTime.toFixed(1)}s → ${time.toFixed(
              1
            )}s (clearing all buffers)`
          );

          // Clear all buffers when seeking backward
          await Promise.all([
            enqueueOperation("video", () =>
              removeBufferRange(videoSb, 0, Infinity)
            ),
            enqueueOperation("audio", () =>
              removeBufferRange(audioSb, 0, Infinity)
            ),
          ]);

          needsInitSegment = true;
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else if (isTargetBuffered) {
          console.log(
            `⏩ Seeking forward to buffered area: ${currentTime.toFixed(
              1
            )}s → ${time.toFixed(1)}s (preserving buffers)`
          );

          // Target is already buffered - preserve everything
          needsInitSegment = false;
        } else {
          console.log(
            `⏩ Seeking forward to unbuffered area: ${currentTime.toFixed(
              1
            )}s → ${time.toFixed(1)}s (clearing forward only)`
          );

          // Clear only from current position forward
          if (videoSb.buffered.length > 0) {
            await enqueueOperation("video", () =>
              removeBufferRange(videoSb, currentTime, Infinity)
            );
          }
          if (audioSb.buffered.length > 0) {
            await enqueueOperation("audio", () =>
              removeBufferRange(audioSb, currentTime, Infinity)
            );
          }

          needsInitSegment = false;
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Conditionally re-append init segments (only when seeking backward)
        if (needsInitSegment) {
          console.log("Re-appending init segments after backward seek");

          if (currentVideoInitSegmentRef.current) {
            await enqueueOperation("video", () =>
              appendBufferSafely(videoSb, currentVideoInitSegmentRef.current!)
            );
          }

          if (currentAudioInitSegmentRef.current) {
            await enqueueOperation("audio", () =>
              appendBufferSafely(audioSb, currentAudioInitSegmentRef.current!)
            );
          }
        } else {
          console.log("Preserving init segments (forward seek)");
        }

        // Reset segment numbers
        videoNextSegRef.current = getSegmentNumber(videoRep, time);
        audioNextSegRef.current = getSegmentNumber(audioRep, time);
        videoFinishedRef.current = false;
        audioFinishedRef.current = false;

        lastProcessedSegmentsRef.current.set(
          videoRep.id,
          videoNextSegRef.current - 1
        );
        lastProcessedSegmentsRef.current.set(
          audioRep.id,
          audioNextSegRef.current - 1
        );

        console.log(
          `Starting from segment ${videoNextSegRef.current} at ${time.toFixed(
            1
          )}s`
        );

        // Start fetching immediately after seek (faster response)
        setTimeout(() => {
          if (videoSbRef.current && videoRepRef.current) {
            for (let i = 0; i < 3; i++) {
              if (
                videoNextSegRef.current <=
                videoRep.startNumber + videoRep.totalSegments - 1
              ) {
                fetchNextSegment(
                  videoId,
                  videoRep,
                  "video",
                  videoSb,
                  videoNextSegRef,
                  videoFinishedRef,
                  false
                );
              }
            }
          }

          if (audioSbRef.current && audioRepRef.current) {
            fetchNextSegment(
              videoId,
              audioRep,
              "audio",
              audioSb,
              audioNextSegRef,
              audioFinishedRef,
              false
            );
          }
        }, 30); // Faster start time
      } catch (error) {
        console.error("Error during seek reset:", error);
      } finally {
        clearTimeout(seekingTimeout);
        // Shorter delay before allowing new seeks
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 250); // Even faster recovery
      }
    },
    [
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
      setShowReplay,
      videoId,
    ]
  );

  const resetPlayer = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    abortAllRequests();
    cleanupMediaSource();

    videoInitSegmentCache.current.clear();
    audioInitSegmentCache.current.clear();

    videoRepRef.current = null;
    audioRepRef.current = null;
    videoNextSegRef.current = 0;
    audioNextSegRef.current = 0;
    videoFinishedRef.current = false;
    audioFinishedRef.current = false;
    durationRef.current = 0;
    throughputEMARef.current = 0;
    lastQualitySwitchRef.current = 0;
    lastBufferGapRef.current = 0;
    isStalledRef.current = false;

    currentVideoInitSegmentRef.current = null;
    currentAudioInitSegmentRef.current = null;
    currentVideoRepIdRef.current = null;
    currentAudioRepIdRef.current = null;
    pendingSegmentOperationsRef.current.clear();

    lastProcessedSegmentsRef.current = new Map();
    currentBufferEndRef.current = 0;
    isQualitySwitchingRef.current = false;

    isInEmergencyModeRef.current = false;
    emergencySwitchCountRef.current = 0;
    bufferRecoveryTargetRef.current = 0;
    lastBufferStateRef.current = "healthy";

    pendingAppendsRef.current = { video: [], audio: [] };
    estimatedBufferEndRef.current = 0;

    operationQueuesRef.current = {
      video: [],
      audio: [],
      videoProcessing: false,
      audioProcessing: false,
    };

    videoEl.pause();
    //setShowReplay(true);
    isInitializedRef.current = false;
  }, [
    videoRef,
    abortAllRequests,
    cleanupMediaSource,
    videoInitSegmentCache,
    audioInitSegmentCache,
    videoRepRef,
    audioRepRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    durationRef,
    throughputEMARef,
    lastQualitySwitchRef,
    lastBufferGapRef,
    isStalledRef,
    currentVideoInitSegmentRef,
    currentAudioInitSegmentRef,
    currentVideoRepIdRef,
    currentAudioRepIdRef,
    pendingSegmentOperationsRef,
    lastProcessedSegmentsRef,
    currentBufferEndRef,
    isQualitySwitchingRef,
    isInEmergencyModeRef,
    emergencySwitchCountRef,
    bufferRecoveryTargetRef,
    lastBufferStateRef,
    pendingAppendsRef,
    estimatedBufferEndRef,
    operationQueuesRef,
    setShowReplay,
    isInitializedRef,
  ]);

  // Initialize player
  const initializePlayer = useCallback(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const videoEl = videoRef.current;
    shouldInitializeRef.current = false;
    isInitializedRef.current = true;

    if (!window.MediaSource) {
      console.error("MSE not supported");
      return;
    }

    cleanupMediaSource();
    mediaSourceRef.current = new MediaSource();
    const mediaSource = mediaSourceRef.current;
    const objectUrl = URL.createObjectURL(mediaSource);
    videoEl.src = objectUrl;

    mediaSource.addEventListener("sourceopen", () => {
      mediaSourceStateRef.current = "open";
      const manifestReq = new ManifestRequest();
      manifestReq.setVideoId(videoId);

      // console.log("ManifestRequest videoId:", manifestReq.getVideoId()); // DEBUG
      // console.log("Sending videoId to backend:", videoId); // Add this for debugging

      grpcClient.getManifest(
        manifestReq,
        {},
        async (err: any, rsp: ManifestResponse) => {
          if (err) {
            console.error("Error fetching MPD:", err);
            return;
          }

          const mpdXml = rsp.getMpdXml_asU8();
          const {
            videoReps: videoRepsArr,
            audioReps: audioRepsArr,
            duration,
            segmentDuration,
          } = parseManifest(mpdXml);

          if (videoRepsArr.length === 0) {
            console.error("No video representations found in MPD");
            return;
          }

          if (audioRepsArr.length === 0) {
            console.error("No audio representations found in MPD");
            return;
          }

          durationRef.current = duration;
          segmentDurationRef.current = segmentDuration;

          initializeBOLA(videoRepsArr);
          bolaStateRef.current = initializeBOLA(videoRepsArr);

          setVideoReps(videoRepsArr);
          videoRepsRef.current = videoRepsArr;
          setAudioReps(audioRepsArr);
          audioRepsRef.current = audioRepsArr;

          const initialQualityIdx = chooseInitialQualityIdx(
            videoRepsArr,
            getVideoThroughput(),
            throughputEMARef.current
          );
          const chosenVideo = videoRepsArr[initialQualityIdx];
          const chosenAudio = audioRepsArr[0];

          videoRepRef.current = chosenVideo;
          audioRepRef.current = chosenAudio;
          videoQualityIdxRef.current = initialQualityIdx;
          setUiVideoQualityIdx(initialQualityIdx);

          let videoSb: SourceBuffer, audioSb: SourceBuffer;
          try {
            if (videoSbRef.current || audioSbRef.current) {
              mediaSource.endOfStream();
              return;
            }

            if (!mediaSource || mediaSource.readyState !== "open") {
              console.error("MediaSource is not in open state");
              return;
            }

            videoSb = createSourceBufferForMime(
              mediaSource,
              chosenVideo.mimeType
            );
            audioSb = createSourceBufferForMime(
              mediaSource,
              chosenAudio.mimeType
            );

            if (!videoSb || !audioSb) {
              console.error("Failed to create SourceBuffer");
              return;
            }

            videoSbRef.current = videoSb;
            audioSbRef.current = audioSb;
          } catch (e) {
            // console.error("Failed to create SourceBuffer:", e);
            return;
          }

          videoFinishedRef.current = false;
          audioFinishedRef.current = false;

          evictionIntervalRef.current = window.setInterval(() => {
            evictBuffer();
          }, BUFFER_EVICTION_INTERVAL);

          Promise.all([
            fetchInitSegment(videoId, chosenVideo.id, "video").then(
              (initSegment) => {
                videoInitSegmentCache.current.set(chosenVideo.id, initSegment);
                currentVideoInitSegmentRef.current = initSegment;
                currentVideoRepIdRef.current = chosenVideo.id;
                return enqueueOperation("video", () =>
                  appendBufferSafely(videoSb, initSegment)
                );
              }
            ),
            fetchInitSegment(videoId, chosenAudio.id, "audio").then(
              (initSegment) => {
                audioInitSegmentCache.current.set(chosenAudio.id, initSegment);
                currentAudioInitSegmentRef.current = initSegment;
                currentAudioRepIdRef.current = chosenAudio.id;
                return enqueueOperation("audio", () =>
                  appendBufferSafely(audioSb, initSegment)
                );
              }
            ),
          ])
            .then(() => {
              videoNextSegRef.current = chosenVideo.startNumber;
              audioNextSegRef.current = chosenAudio.startNumber;

              lastProcessedSegmentsRef.current.set(
                chosenVideo.id,
                chosenVideo.startNumber - 1
              );
              lastProcessedSegmentsRef.current.set(
                chosenAudio.id,
                chosenAudio.startNumber - 1
              );

              fetchNextSegment(
                videoId,
                chosenVideo,
                "video",
                videoSb,
                videoNextSegRef,
                videoFinishedRef,
                false
              );
              fetchNextSegment(
                videoId,
                chosenAudio,
                "audio",
                audioSb,
                audioNextSegRef,
                audioFinishedRef,
                false
              );
            })
            .catch(console.error);

          const onTimeUpdate = () => {
            if (mediaSource.readyState !== "open") return;
            if (!videoEl.buffered || videoEl.buffered.length === 0) return;
            if (!isOnlineRef.current) return;

            const now = Date.now();
            if (now - lastTimeUpdateRef.current < 500) return;
            lastTimeUpdateRef.current = now;

            const currentTime = videoEl.currentTime;
            const timeToEnd = durationRef.current - currentTime;
            const bufferGap = getBufferGap(videoEl.buffered, currentTime);
            if (
              timeToEnd < 2 &&
              videoFinishedRef.current &&
              audioFinishedRef.current
            ) {
              tryEndStream();
            }

            if (
              bufferGap < REBUFFER_THRESHOLD &&
              !isStalledRef.current &&
              !isSeekingRef.current &&
              !isInOnlineRecoveryRef.current
            ) {
              handleStall();
            }

            if (bufferGap > 5 && isStalledRef.current) {
              isStalledRef.current = false;
            }

            const bufferLoss = lastBufferGapRef.current - bufferGap;
            if (
              bufferLoss > 1.5 &&
              bufferGap < 5 &&
              !isSeekingRef.current &&
              !isInOnlineRecoveryRef.current
            ) {
              const newQuality = Math.max(0, videoQualityIdxRef.current - 1);
              switchQuality(newQuality);
            }
            lastBufferGapRef.current = bufferGap;

            const isNearEnd = timeToEnd < 5;
            const isBufferLow = bufferGap < 15;

            if (
              isBufferLow &&
              !videoFinishedRef.current &&
              videoRepRef.current &&
              videoSbRef.current
            ) {
              fetchNextSegment(
                videoId,
                videoRepRef.current,
                "video",
                videoSbRef.current,
                videoNextSegRef,
                videoFinishedRef,
                false
              );
            }

            if (
              isBufferLow &&
              !audioFinishedRef.current &&
              audioRepRef.current &&
              audioSbRef.current
            ) {
              fetchNextSegment(
                videoId,
                audioRepRef.current,
                "audio",
                audioSbRef.current,
                audioNextSegRef,
                audioFinishedRef,
                false
              );
            }

            if (isNearEnd) {
              if (
                !videoFinishedRef.current &&
                videoRepRef.current &&
                videoSbRef.current
              ) {
                fetchNextSegment(
                  videoId,
                  videoRepRef.current,
                  "video",
                  videoSbRef.current,
                  videoNextSegRef,
                  videoFinishedRef,
                  false
                );
              }
              if (
                !audioFinishedRef.current &&
                audioRepRef.current &&
                audioSbRef.current
              ) {
                fetchNextSegment(
                  videoId,
                  audioRepRef.current,
                  "audio",
                  audioSbRef.current,
                  audioNextSegRef,
                  audioFinishedRef,
                  false
                );
              }
            }
          };

          const onSeeking = () => {
            const targetTime = videoEl.currentTime;

            // Hide replay overlay when seeking
            if (showReplay) {
              setShowReplay(false);
            }

            resetStreamForSeek(targetTime);
          };

          const onWaiting = () => {
            if (mediaSource.readyState !== "open") return;

            if (isInOnlineRecoveryRef.current) {
              console.log("onWaiting blocked: in online recovery cooldown");
              return;
            }

            if (isSeekingRef.current) {
              console.log("onWaiting blocked: currently seeking");
              return;
            }

            const videoEl = videoRef.current;
            if (!videoEl) return;

            const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
            const bufferGap = estimatedBufferEnd - videoEl.currentTime;

            if (bufferGap >= BUFFER_MIN_SWITCH_THRESHOLD) {
              console.log(
                `onWaiting blocked: buffer gap ${bufferGap.toFixed(
                  1
                )}s above minimum threshold`
              );
              return;
            }

            handleStall();
          };

          videoEl.addEventListener("timeupdate", onTimeUpdate);
          videoEl.addEventListener("seeking", onSeeking);
          videoEl.addEventListener("waiting", onWaiting);

          mediaSource.addEventListener("sourceclose", () => {
            mediaSourceStateRef.current = "closed";
            videoEl.removeEventListener("timeupdate", onTimeUpdate);
            videoEl.removeEventListener("seeking", onSeeking);
            videoEl.removeEventListener("waiting", onWaiting);
            abortAllRequests();
          });

          mediaSource.addEventListener("sourceended", () => {
            mediaSourceStateRef.current = "ended";
          });
        }
      );
    });
  }, [
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
    calculateEstimatedBufferEndWrapper,
  ]);

  useEffect(() => {
    if (videoReps.length > 0) {
      const qualities = [...videoReps]
        .sort((a, b) => a.bandwidth - b.bandwidth)
        .map((rep) => ({
          id: rep.id,
          label: rep.height
            ? `${rep.height}p`
            : `${Math.round(rep.bandwidth / 1000)}kbps`,
        }));

      setAvailableQualities(qualities);
      setCurrentStats((prev) => ({
        ...prev,
        quality: qualities[videoQualityIdxRef.current]?.label || "Auto",
      }));
    }
  }, [videoReps, videoQualityIdxRef, setAvailableQualities, setCurrentStats]);

  useEffect(() => {
    if (mode !== "auto" || !videoRef.current) return;

    const checkInterval = setInterval(() => {
      if (mediaSourceStateRef.current !== "open") return;

      if (!shouldAllowQualitySwitch("auto-mode")) {
        return;
      }

      const desiredQuality = decideQuality();
      if (desiredQuality !== videoQualityIdxRef.current) {
        console.log("Auto mode requesting quality switch:", {
          from: videoQualityIdxRef.current,
          to: desiredQuality,
        });
        switchQuality(desiredQuality);
      }
    }, 1500);

    return () => clearInterval(checkInterval);
  }, [
    mode,
    videoRef,
    mediaSourceStateRef,
    videoQualityIdxRef,
    shouldAllowQualitySwitch,
    decideQuality,
    switchQuality,
  ]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let lastTime = 0;
    let lastTimestamp = 0;

    const onTimeUpdate = () => {
      const now = Date.now();
      if (lastTimestamp > 0) {
        const deltaTime = (videoEl.currentTime - lastTime) * 1000;
        const deltaReal = now - lastTimestamp;
        playheadVelocityRef.current = Math.min(
          2,
          Math.max(0.5, deltaTime / deltaReal)
        );
      }
      lastTime = videoEl.currentTime;
      lastTimestamp = now;
    };

    videoEl.addEventListener("timeupdate", onTimeUpdate);
    return () => videoEl.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, playheadVelocityRef]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnded = () => {
      // Only show replay when video actually reaches the end
      const isAtEnd = Math.abs(videoEl.currentTime - durationRef.current) < 0.1;

      if (isAtEnd) {
        console.log("Video ended naturally at end position");
        setShowReplay(true);
        videoEl.currentTime = 0;
        resetPlayer();
      } else {
        // Video "ended" but not at the end position - just reset without replay
        console.log(
          "Video ended but not at end position - resetting without replay"
        );
        resetPlayer();
      }
    };

    const handleError = () => {
      console.error("Video element error:", videoEl.error);
      resetPlayer();
    };

    videoEl.addEventListener("ended", handleEnded);
    videoEl.addEventListener("error", handleError);

    return () => {
      videoEl.removeEventListener("ended", handleEnded);
      videoEl.removeEventListener("error", handleError);
    };
  }, [videoRef, durationRef, resetPlayer, setShowReplay]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handlePlay = () => {
      // Only initialize if we're showing replay or not initialized
      if (showReplay || !isInitializedRef.current) {
        setShowReplay(false);
        initializePlayer();
      }
    };

    videoEl.addEventListener("play", handlePlay);
    return () => videoEl.removeEventListener("play", handlePlay);
  }, [videoRef, showReplay, setShowReplay, initializePlayer, isInitializedRef]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    setHasPlaybackStarted(true);
    initializePlayer();

    const videoEl = videoRef.current;
    if (videoEl) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          setHasPlaybackStarted(false);
        });
      }
    }
  }, [
    videoId,
    videoRef,
    isFirstRenderRef,
    setHasPlaybackStarted,
    initializePlayer,
  ]);

  useEffect(() => {
    return () => {
      abortAllRequests();
      cleanupMediaSource();

      if (recoveryAbortRef.current) {
        try {
          recoveryAbortRef.current.abort();
        } catch (e) {}
        recoveryAbortRef.current = null;
      }

      if (evictionIntervalRef.current) {
        clearInterval(evictionIntervalRef.current);
      }

      if (rebufferTimeoutRef.current) {
        clearTimeout(rebufferTimeoutRef.current);
      }

      if (videoRef.current) {
        videoRef.current.src = "";
      }
    };
  }, [
    abortAllRequests,
    cleanupMediaSource,
    recoveryAbortRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
    videoRef,
  ]);

  // const handlePlayButtonClick = useCallback(() => {
  //   setHasPlaybackStarted(true);
  //   initializePlayer();
  //   videoRef.current?.play();
  // }, [setHasPlaybackStarted, initializePlayer, videoRef]);

  // const handleReplayClick = useCallback(() => {
  //   setShowReplay(false);
  //   initializePlayer();
  //   videoRef.current?.play();
  // }, [setShowReplay, initializePlayer, videoRef]);

  // Add this useEffect to update throughput in stats
  useEffect(() => {
    const updateStatsInterval = setInterval(() => {
      const throughputKbps = Math.round(throughputEMARef.current / 1000);

      setCurrentStats((prev) => ({
        ...prev,
        throughput: throughputKbps,
        // Also ensure quality is updated
        quality: availableQualities[uiVideoQualityIdx]?.label || "Auto",
      }));
    }, 1000);

    return () => clearInterval(updateStatsInterval);
  }, [availableQualities, uiVideoQualityIdx, setCurrentStats]);

  const shouldShowReplayOverlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.paused) return false;

    const currentTime = videoEl.currentTime;
    const effectiveDuration = getEffectiveDuration();

    // Only show replay if we're at the end of the actual content
    return isAtEnd(currentTime) && effectiveDuration > 0;
  }, [videoRef, getEffectiveDuration, isAtEnd]);

  const handlePlayButtonClick = useCallback(() => {
    console.log("▶️ Play button clicked");
    setHasPlaybackStarted(true);
    initializePlayer();
    videoRef.current?.play();
  }, [setHasPlaybackStarted, initializePlayer, videoRef]);

  const handleReplayClick = useCallback(() => {
    console.log("🔁 Replay button clicked");
    setShowReplay(false);
    initializePlayer();
    videoRef.current?.play();
  }, [setShowReplay, initializePlayer, videoRef]);

  // ============================================================================
  // RENDER
  // ============================================================================
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Add these handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setHasPlaybackStarted(true);
  }, [setHasPlaybackStarted]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      // Use your existing resetStreamForSeek function
      resetStreamForSeek(time);
    },
    [resetStreamForSeek]
  );

  // Add this useEffect to GrpcDashPlayer for keyboard controls
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
          // Toggle fullscreen
          break;

        case "m":
        case "M":
          e.preventDefault();
          videoEl.muted = !videoEl.muted;
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoRef, isPlaying]);

  return (
    <div className="player-container">
      {/* Top section: mode selector + stats */}
      <div className="controls-wrapper">
        <StatsDisplay stats={currentStats} isOnline={isOnline} />
      </div>

      {/* Video player section */}
      <div className="video-wrapper">
        <VideoPlayer
          videoRef={videoRef}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
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
