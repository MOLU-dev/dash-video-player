// hooks/usePlayerEventHandlers.ts
import { useCallback, useRef} from "react";
import type { Representation } from "@/types/player.types";
import { fetchInitSegment } from "@/services/segmentFetcher";
import { appendBufferSafely, removeBufferRange } from "@/utils/bufferHelpers";
import { getSegmentNumber } from "@/utils/playerHelpers";
import {
  BUFFER_EMERGENCY_THRESHOLD,
  TARGET_BUFFER_LEVEL,
} from "@/constants/player.constants";

interface UsePlayerEventHandlersProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoRepsRef: React.RefObject<Representation[]>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  durationRef: React.RefObject<number>;
  videoQualityIdxRef: React.RefObject<number>;
  lastSeekTimeRef: React.RefObject<number>;
  lastStallTimeRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  throughputEMARef: React.RefObject<number>;
  lastQualitySwitchRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  rebufferTimeoutRef: React.RefObject<number | null>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  audioInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  pendingAppendsRef: React.RefObject<{
    video: { segmentNumber: number; duration: number }[];
    audio: { segmentNumber: number; duration: number }[];
  }>;
  pendingSegmentOperationsRef: React.RefObject<
    Map<number, { repId: string; mediaType: string }>
  >;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  operationQueuesRef: React.RefObject<any>;
  isInitializedRef: React.RefObject<boolean>;
  availableQualities: Array<{ id: string; label: string }>;
  setUiVideoQualityIdx: React.Dispatch<React.SetStateAction<number>>;
  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  setShowReplay: React.Dispatch<React.SetStateAction<boolean>>;
  setHasPlaybackStarted: React.Dispatch<React.SetStateAction<boolean>>;
  shouldAllowQualitySwitch: (context: string) => boolean;
  abortAllRequests: () => void;
  completeOngoingSegmentOperations: (
    mediaType: "video" | "audio"
  ) => Promise<void>;
  enqueueOperation: (
    mediaType: "video" | "audio",
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: "video" | "audio",
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  calculateEstimatedBufferEndWrapper: () => number;
  cleanupMediaSource: () => void;
  initializePlayer: () => void;
  showReplay: boolean;
  pauseDurationRef: React.RefObject<number>;
  shouldStopDownloadingRef: React.RefObject<boolean>;
  lastPauseTimeRef: React.RefObject<number>;
  isPausedRef: React.RefObject<boolean>;
  setIsPaused: (paused: boolean) => void;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  isOnlineRef: React.RefObject<boolean>;
  lastTimeUpdateRef: React.RefObject<number>;
  tryEndStream: () => void;
  shouldFetchSegment: (
    mediaType: "video" | "audio",
    videoSb: SourceBuffer | null,
    audioSb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean,
    isLive?: boolean
  ) => {
    shouldFetch: boolean;
    delay: number;
    reason: string;
    segmentsToFetch?: number;
    isPredictedStall?: boolean;
  };
  isLiveRef: React.RefObject<boolean>;
  targetBufferLevelRef: React.RefObject<number>;
  scheduleNextFetch: (
    mediaType: "video" | "audio",
    delay: number,
    callback: () => void
  ) => void;
  isInStallRecovery?: (mediaType?: "video" | "audio") => boolean;
  triggerStallRecovery?: (
    mediaType: "video" | "audio",
    severity: "low" | "critical" | "empty"
  ) => void;
  clearStallRecovery?: (mediaType?: "video" | "audio") => void;
}

export function usePlayerEventHandlers({
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
  initializePlayer,
  showReplay,
  pauseDurationRef,
  shouldStopDownloadingRef,
  lastPauseTimeRef,
  isPausedRef,
  setIsPaused,
  mediaSourceStateRef,
  isOnlineRef,
  lastTimeUpdateRef,
  tryEndStream,
  shouldFetchSegment,
  scheduleNextFetch,
  isInStallRecovery,
  triggerStallRecovery,
  clearStallRecovery,
  isLiveRef,
  targetBufferLevelRef,
}: UsePlayerEventHandlersProps) {
  // Track playhead velocity for predictive stall detection
  const playheadVelocityRef = useRef<{
    positions: Array<{ time: number; position: number }>;
    lastUpdate: number;
  }>({
    positions: [],
    lastUpdate: 0,
  });

  // Track buffer consumption rate
  const bufferConsumptionRef = useRef<{
    timestamps: number[];
    bufferLevels: number[];
    consumptionRate: number; // seconds per second
  }>({
    timestamps: [],
    bufferLevels: [],
    consumptionRate: 1.0, // Default to 1.0x playback speed
  });

  // Helper to calculate combined buffer gap
  const calculateCombinedBufferGap = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return 0;

    const videoSb = videoSbRef.current;
    const audioSb = audioSbRef.current;
    const currentTime = videoEl.currentTime;

    let videoBufferAhead = 0;
    let audioBufferAhead = 0;

    // Calculate video buffer ahead
    if (videoSb && videoSb.buffered.length > 0) {
      for (let i = 0; i < videoSb.buffered.length; i++) {
        const start = videoSb.buffered.start(i);
        const end = videoSb.buffered.end(i);
        if (currentTime >= start && currentTime <= end) {
          videoBufferAhead = end - currentTime;
          break;
        }
      }
    }

    // Calculate audio buffer ahead
    if (audioSb && audioSb.buffered.length > 0) {
      for (let i = 0; i < audioSb.buffered.length; i++) {
        const start = audioSb.buffered.start(i);
        const end = audioSb.buffered.end(i);
        if (currentTime >= start && currentTime <= end) {
          audioBufferAhead = end - currentTime;
          break;
        }
      }
    }

    // Update playhead velocity tracking
    const now = Date.now();
    playheadVelocityRef.current.positions.push({
      time: now,
      position: currentTime,
    });

    // Keep only last 10 positions
    if (playheadVelocityRef.current.positions.length > 10) {
      playheadVelocityRef.current.positions.shift();
    }

    // Update buffer consumption rate
    bufferConsumptionRef.current.timestamps.push(now);
    bufferConsumptionRef.current.bufferLevels.push(
      Math.min(videoBufferAhead, audioBufferAhead)
    );

    // Keep only last 5 seconds of data
    const cutoffTime = now - 5000;
    bufferConsumptionRef.current.timestamps =
      bufferConsumptionRef.current.timestamps.filter((t) => t > cutoffTime);
    bufferConsumptionRef.current.bufferLevels =
      bufferConsumptionRef.current.bufferLevels.slice(
        -bufferConsumptionRef.current.timestamps.length
      );

    // Calculate buffer consumption rate if we have enough data
    if (bufferConsumptionRef.current.timestamps.length >= 2) {
      const oldestIndex = 0;
      const newestIndex = bufferConsumptionRef.current.timestamps.length - 1;

      const timeDiff =
        (bufferConsumptionRef.current.timestamps[newestIndex] -
          bufferConsumptionRef.current.timestamps[oldestIndex]) /
        1000;
      const bufferDiff =
        bufferConsumptionRef.current.bufferLevels[oldestIndex] -
        bufferConsumptionRef.current.bufferLevels[newestIndex];

      if (timeDiff > 0.5) {
        // Only calculate if we have meaningful time difference
        bufferConsumptionRef.current.consumptionRate = Math.max(
          0.1,
          Math.min(5.0, bufferDiff / timeDiff)
        );
      }
    }

    return Math.min(videoBufferAhead, audioBufferAhead);
  }, [videoRef, videoSbRef, audioSbRef]);

  /**
   * Predict time until stall based on current buffer and consumption rate
   */
  const predictTimeUntilStall = useCallback((): number | null => {
    const combinedBufferGap = calculateCombinedBufferGap();
    const consumptionRate = bufferConsumptionRef.current.consumptionRate;

    // If buffer is increasing (consumption rate negative), no stall predicted
    if (consumptionRate <= 0) return null;

    // Calculate time until buffer runs out
    const timeUntilStall = combinedBufferGap / consumptionRate;

    // Only return prediction if it's less than 30 seconds (meaningful prediction)
    return timeUntilStall < 30 ? timeUntilStall : null;
  }, [calculateCombinedBufferGap]);

  /**
   * Smart stall detection with multiple levels of severity
   */
  const detectStallSeverity = useCallback((): {
    severity: "none" | "predicted" | "low" | "critical" | "empty";
    reason: string;
    timeUntilStall?: number;
  } => {
    const videoEl = videoRef.current;
    if (!videoEl) return { severity: "none", reason: "No video element" };

    const combinedBufferGap = calculateCombinedBufferGap();
    const estimatedBufferEnd = calculateEstimatedBufferEndWrapper();
    const currentTime = videoEl.currentTime;
    const estimatedBufferGap = Math.max(0, estimatedBufferEnd - currentTime);
    const bufferGap = Math.min(combinedBufferGap, estimatedBufferGap);

    // Level 1: TRUE STALL - Buffer completely empty
    if (bufferGap <= 0.1) {
      return {
        severity: "empty",
        reason: "Buffer completely empty",
      };
    }

    // --- DYNAMIC THRESHOLDS ---
    const targetBuffer = targetBufferLevelRef.current;
    const isLive = isLiveRef.current;
    
    // Emergency threshold is normally 20% of target (12s for VOD, 1s for Live)
    const emergencyThreshold = targetBuffer * 0.2;
    
    // Critical threshold is normally 30% of emergency (3.6s for VOD, 0.3s for Live)
    // For live, we want to be even more lenient: 0.5s is usually the "hard" limit
    const criticalThreshold = isLive 
      ? Math.max(0.5, emergencyThreshold * 0.5) 
      : emergencyThreshold * 0.3;

    // Level 1: TRUE STALL - Buffer completely empty
    if (bufferGap <= 0.1) {
      return {
        severity: "empty",
        reason: "Buffer completely empty",
      };
    }

    // Level 2: CRITICAL STALL - Buffer dangerously low
    if (bufferGap < criticalThreshold) {
      return {
        severity: "critical",
        reason: `Buffer critically low: ${bufferGap.toFixed(1)}s (threshold: ${criticalThreshold.toFixed(1)}s)`,
      };
    }

    // Level 3: LOW STALL - Buffer below emergency threshold
    if (bufferGap < emergencyThreshold) {
      return {
        severity: "low",
        reason: `Buffer low: ${bufferGap.toFixed(1)}s (threshold: ${emergencyThreshold.toFixed(1)}s)`,
      };
    }

    // Level 4: PREDICTED STALL - Based on buffer consumption rate
    const timeUntilStall = predictTimeUntilStall();
    if (timeUntilStall !== null && timeUntilStall < (isLive ? 3 : 10)) {
      return {
        severity: "predicted",
        reason: `Stall predicted in ${timeUntilStall.toFixed(1)}s`,
        timeUntilStall,
      };
    }

    // Level 5: BUFFER DECLINING RAPIDLY
    const consumptionRate = bufferConsumptionRef.current.consumptionRate;
    if (consumptionRate > 1.5 && bufferGap < targetBuffer * 0.5) {
      return {
        severity: "predicted",
        reason: `Buffer declining rapidly: ${consumptionRate.toFixed(
          2
        )}x playback speed`,
      };
    }

    return { severity: "none", reason: "No stall detected" };
  }, [
    videoRef,
    calculateCombinedBufferGap,
    calculateEstimatedBufferEndWrapper,
    predictTimeUntilStall,
  ]);

  /**
   * Smart stall recovery that respects buffer control
   */
  const handleStall = useCallback(async () => {
    if (!videoRef.current || !mediaSourceRef.current) return;

    // Don't start new stall recovery if we're already in one
    if (isStalledRef.current && isInStallRecovery?.("video")) {
      console.log("[SmartStall] Already in stall recovery, skipping");
      return;
    }

    const videoEl = videoRef.current;
    const now = Date.now();

    // Prevent overlapping stall recovery
    if (isInOnlineRecoveryRef.current) {
      console.log("[SmartStall] Blocked - in online recovery");
      return;
    }

    if (isSeekingRef.current) {
      console.log("[SmartStall] Blocked - currently seeking");
      return;
    }

    // Prevent too frequent stall recovery (cooldown period)
    if (now - lastStallTimeRef.current < 3000) {
      console.log("[SmartStall] Blocked - in cooldown period");
      return;
    }

    // Detect stall severity
    const stallDetection = detectStallSeverity();
    console.log(
      `[SmartStall] Detection: ${stallDetection.severity} - ${stallDetection.reason}`
    );

    // Only proceed with recovery for actual stalls
    if (stallDetection.severity === "none") {
      console.log("[SmartStall] No stall detected, exiting");
      return;
    }

    // Mark stall and trigger buffer control stall recovery
    lastStallTimeRef.current = now;
    isStalledRef.current = true;

    if (triggerStallRecovery) {
      triggerStallRecovery(
        "video",
        stallDetection.severity === "empty"
          ? "empty"
          : stallDetection.severity === "critical"
          ? "critical"
          : "low"
      );
      triggerStallRecovery(
        "audio",
        stallDetection.severity === "empty"
          ? "empty"
          : stallDetection.severity === "critical"
          ? "critical"
          : "low"
      );
    }

    // For predicted stalls, we can be less aggressive
    if (stallDetection.severity === "predicted") {
      console.log(`[SmartStall] Predicted stall - ${stallDetection.reason}`);
      // Just let buffer control handle it with its predictive logic
      isStalledRef.current = false;
      return;
    }

    console.log(
      `[SmartStall] Starting ${stallDetection.severity} stall recovery`
    );

    // Check if quality switching is allowed
    if (!shouldAllowQualitySwitch("stall-recovery")) {
      console.log("[SmartStall] Quality switching not allowed at this time");
      isStalledRef.current = false;
      if (clearStallRecovery) clearStallRecovery();
      return;
    }

    // For severe stalls, abort all ongoing requests
    if (
      stallDetection.severity === "empty" ||
      stallDetection.severity === "critical"
    ) {
      abortAllRequests();
    }

    try {
      // Wait for ongoing operations to complete
      await completeOngoingSegmentOperations("video");
      await completeOngoingSegmentOperations("audio");

      const currentTime = videoEl.currentTime;

      // ✅ Check what buffer control recommends for this stall
      const videoSb = videoSbRef.current;
      const audioSb = audioSbRef.current;

      const bufferCheckVideo = shouldFetchSegment(
        "video",
        videoSb,
        audioSb,
        currentTime,
        true, // emergency mode
        isLiveRef.current
      );

      const bufferCheckAudio = shouldFetchSegment(
        "audio",
        videoSb,
        audioSb,
        currentTime,
        true, // emergency mode
        isLiveRef.current
      );

      console.log(`[SmartStall] Buffer control recommendations:`);
      console.log(`  Video: ${bufferCheckVideo.reason}`);
      console.log(`  Audio: ${bufferCheckAudio.reason}`);

      // Only switch to lowest quality for severe stalls when buffer control agrees
      if (
        stallDetection.severity === "empty" ||
        stallDetection.severity === "critical"
      ) {
        if (
          videoRepsRef.current.length > 0 &&
          bufferCheckVideo.shouldFetch &&
          videoQualityIdxRef.current !== 0
        ) {
          const lowestIdx = 0;
          const rep = videoRepsRef.current[lowestIdx];

          console.log(`[SmartStall] Switching to lowest quality for recovery`);
          try {
            const initSegment = await fetchInitSegment(videoId, rep, "video");
            videoInitSegmentCache.current.set(rep.id, initSegment);
            currentVideoInitSegmentRef.current = initSegment;
            currentVideoRepIdRef.current = rep.id;

            await enqueueOperation("video", () =>
              appendBufferSafely(videoSbRef.current!, initSegment)
            );

            videoRepRef.current = rep;
            videoQualityIdxRef.current = lowestIdx;
            setUiVideoQualityIdx(lowestIdx);
            setCurrentStats((prev: any) => ({
              ...prev,
              quality: availableQualities[lowestIdx]?.label || "Auto",
            }));
          } catch (err) {
            console.error(
              "[SmartStall] Error switching to lowest quality:",
              err
            );
          }
        }
      }

      // ✅ RESUME FETCHING USING BUFFER CONTROL'S RECOMMENDATIONS
      if (videoRepRef.current) {
        videoNextSegRef.current = getSegmentNumber(
          videoRepRef.current,
          currentTime
        );
        videoFinishedRef.current = false;

        if (videoSb && bufferCheckVideo.shouldFetch) {
          console.log(`[SmartStall] Resuming video fetch as recommended`);

          if (bufferCheckVideo.delay === 0) {
            fetchNextSegment(
              videoId,
              videoRepRef.current,
              "video",
              videoSb,
              videoNextSegRef,
              videoFinishedRef,
              true // quality switch mode
            );
          } else if (bufferCheckVideo.delay > 0) {
            scheduleNextFetch("video", bufferCheckVideo.delay, () => {
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
            });
          }
        }
      }

      if (audioRepRef.current) {
        audioNextSegRef.current = getSegmentNumber(
          audioRepRef.current,
          currentTime
        );
        audioFinishedRef.current = false;

        if (audioSbRef.current && bufferCheckAudio.shouldFetch) {
          console.log(`[SmartStall] Resuming audio fetch as recommended`);

          if (bufferCheckAudio.delay === 0) {
            fetchNextSegment(
              videoId,
              audioRepRef.current,
              "audio",
              audioSbRef.current,
              audioNextSegRef,
              audioFinishedRef,
              true
            );
          } else if (bufferCheckAudio.delay > 0) {
            scheduleNextFetch("audio", bufferCheckAudio.delay, () => {
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
            });
          }
        }
      }
    } catch (error) {
      console.error("[SmartStall] Error during stall recovery:", error);
    } finally {
      // Clear stall flags after recovery period
      rebufferTimeoutRef.current = window.setTimeout(
        () => {
          isStalledRef.current = false;
          if (clearStallRecovery) clearStallRecovery();
          console.log("[SmartStall] Stall recovery completed");
        },
        stallDetection.severity === "empty" ? 3000 : 2000
      );
    }
  }, [
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
    videoQualityIdxRef,
    lastStallTimeRef,
    isStalledRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    mediaSourceRef,
    videoInitSegmentCache,
    currentVideoInitSegmentRef,
    currentVideoRepIdRef,
    rebufferTimeoutRef,
    availableQualities,
    calculateCombinedBufferGap,
    setUiVideoQualityIdx,
    setCurrentStats,
    shouldAllowQualitySwitch,
    abortAllRequests,
    completeOngoingSegmentOperations,
    enqueueOperation,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
    shouldFetchSegment,
    scheduleNextFetch,
    detectStallSeverity,
    isInStallRecovery,
    triggerStallRecovery,
    clearStallRecovery,
  ]);

  /**
   * Smart waiting handler that understands buffer control
   */
  const onWaiting = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    if (mediaSource?.readyState !== "open") return;

    if (isInOnlineRecoveryRef.current) {
      console.log("[onWaiting] Blocked - in online recovery cooldown");
      return;
    }

    if (isSeekingRef.current) {
      console.log("[onWaiting] Blocked - currently seeking");
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // First, check what buffer control says
    const currentTime = videoEl.currentTime;
    const bufferCheckVideo = shouldFetchSegment(
      "video",
      videoSbRef.current,
      audioSbRef.current,
      currentTime,
      true,
      isLiveRef.current
    );

    console.log(
      `[onWaiting] Triggered. Buffer control says: ${bufferCheckVideo.reason}`
    );

    // If buffer control already has a plan and we're not in a true stall, trust it
    if (bufferCheckVideo.shouldFetch && !bufferCheckVideo.isPredictedStall) {
      console.log(
        "[onWaiting] Buffer control is already handling it, trusting it"
      );
      return;
    }

    // Otherwise, check stall severity
    const stallDetection = detectStallSeverity();

    // Only trigger handleStall for actual stalls, not predicted ones
    if (stallDetection.severity === "predicted") {
      console.log(
        `[onWaiting] Only predicted stall (${stallDetection.reason}), letting buffer control handle it`
      );
      return;
    }

    if (stallDetection.severity !== "none") {
      console.log(
        `[onWaiting] ${stallDetection.severity} stall detected, triggering recovery`
      );
      handleStall();
    } else {
      console.log("[onWaiting] No stall detected, ignoring waiting event");
    }
  }, [
    mediaSourceRef,
    videoRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    videoSbRef,
    audioSbRef,
    shouldFetchSegment,
    detectStallSeverity,
    handleStall,
  ]);

  /**
   * Monitor buffer in real-time for predictive stall detection
   */
  const monitorBuffer = useCallback(() => {
    if (isPausedRef.current || !videoRef.current) return;

    const combinedBufferGap = calculateCombinedBufferGap();
    const timeUntilStall = predictTimeUntilStall();

    // Log buffer state periodically for debugging
    if (process.env.NODE_ENV === "development" && Math.random() < 0.05) {
      console.log(
        `[BufferMonitor] Combined buffer: ${combinedBufferGap.toFixed(1)}s`
      );
      console.log(
        `[BufferMonitor] Consumption rate: ${bufferConsumptionRef.current.consumptionRate.toFixed(
          2
        )}x`
      );
      if (timeUntilStall !== null) {
        console.log(
          `[BufferMonitor] Predicted time until stall: ${timeUntilStall.toFixed(
            1
          )}s`
        );
      }
    }

    // Proactively trigger fetch if we predict a stall soon
    // But ONLY if playing (don't fetch if paused/idle for VOD)
    if (
      !videoRef.current.paused &&
      timeUntilStall !== null &&
      timeUntilStall < 5 &&
      combinedBufferGap < TARGET_BUFFER_LEVEL * 0.5
    ) {
      console.log(
        `[BufferMonitor] Proactive fetch triggered - stall predicted in ${timeUntilStall.toFixed(
          1
        )}s`
      );

      // Check what buffer control says
      const currentTime = videoRef.current.currentTime;
      const bufferCheckVideo = shouldFetchSegment(
        "video",
        videoSbRef.current,
        audioSbRef.current,
        currentTime,
        true,
        isLiveRef.current
      );

      if (bufferCheckVideo.shouldFetch && bufferCheckVideo.delay === 0) {
        if (
          videoRepRef.current &&
          videoSbRef.current &&
          !isFetchingVideoRef.current
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
      }
    }
  }, [
    videoId,
    videoRef,
    videoSbRef,
    audioSbRef,
    videoRepRef,
    videoNextSegRef,
    videoFinishedRef,
    isFetchingVideoRef,
    isPausedRef,
    calculateCombinedBufferGap,
    predictTimeUntilStall,
    shouldFetchSegment,
    fetchNextSegment,
  ]);

  // Set up buffer monitoring interval
  const setupBufferMonitoring = useCallback(() => {
    const interval = setInterval(monitorBuffer, 1000);
    return () => clearInterval(interval);
  }, [monitorBuffer]);

  // Return setup function to be called from useEffect
  const startBufferMonitoring = useCallback(() => {
    return setupBufferMonitoring();
  }, [setupBufferMonitoring]);

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

    pendingAppendsRef.current = { video: [], audio: [] };

    operationQueuesRef.current = {
      video: [],
      audio: [],
      videoProcessing: false,
      audioProcessing: false,
    };

    // Reset buffer monitoring data
    playheadVelocityRef.current = {
      positions: [],
      lastUpdate: 0,
    };
    bufferConsumptionRef.current = {
      timestamps: [],
      bufferLevels: [],
      consumptionRate: 1.0,
    };

    // Clear stall recovery flags if available
    if (clearStallRecovery) clearStallRecovery();

    videoEl.pause();
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
    pendingAppendsRef,
    operationQueuesRef,
    isInitializedRef,
    clearStallRecovery,
  ]);

  const handlePlayButtonClick = useCallback(() => {
    setHasPlaybackStarted(true);
    initializePlayer();
    videoRef.current?.play();
  }, [setHasPlaybackStarted, initializePlayer, videoRef]);

  const handleReplayClick = useCallback(() => {
    setShowReplay(false);
    initializePlayer();
    videoRef.current?.play();
  }, [setShowReplay, initializePlayer, videoRef]);

  const handleEnded = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const isAtEnd = Math.abs(videoEl.currentTime - durationRef.current) < 0.1;

    if (isAtEnd) {
      setShowReplay(true);
      videoEl.currentTime = 0;
      resetPlayer();
    } else {
      resetPlayer();
    }
  }, [videoRef, durationRef, resetPlayer, setShowReplay]);

  const handleError = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && videoEl.error) {
      console.error("[PlayerError] Video element error:", {
        code: videoEl.error.code,
        message: videoEl.error.message,
      });
    } else {
      console.error(
        "[PlayerError] Video element error: Unknown error occurred"
      );
    }
    resetPlayer();
  }, [videoRef, resetPlayer]);

  const handlePlay = useCallback(() => {
    if (showReplay || !isInitializedRef.current) {
      setShowReplay(false);
      initializePlayer();
    }
  }, [showReplay, isInitializedRef, setShowReplay, initializePlayer]);

  const onPause = useCallback(() => {
    console.log("[PlayerEvent] Video paused - stopping all downloads");
    isPausedRef.current = true;
    setIsPaused(true);
    lastPauseTimeRef.current = Date.now();

    // Abort ongoing downloads
    abortAllRequests();

    // Mark that we should stop downloading
    shouldStopDownloadingRef.current = true;

    // Clear stall recovery flags
    if (clearStallRecovery) clearStallRecovery();
  }, [
    isPausedRef,
    setIsPaused,
    lastPauseTimeRef,
    shouldStopDownloadingRef,
    abortAllRequests,
    clearStallRecovery,
  ]);

  const onPlayResume = useCallback(() => {
    console.log(
      "[PlayerEvent] Video playing - checking buffer for resuming downloads"
    );

    const wasShowingReplay = showReplay;

    if (wasShowingReplay) {
      // This is a replay scenario - reinitialize
      setShowReplay(false);
      initializePlayer();
    } else {
      // Just resuming from pause
      setHasPlaybackStarted(true);
      const pauseDuration =
        lastPauseTimeRef.current > 0
          ? Date.now() - lastPauseTimeRef.current
          : 0;
      pauseDurationRef.current = pauseDuration;

      isPausedRef.current = false;
      setIsPaused(false);
      shouldStopDownloadingRef.current = false;

      // Check buffer state before resuming
      const videoEl = videoRef.current;
      if (
        videoEl &&
        isOnlineRef.current &&
        mediaSourceStateRef.current === "open" &&
        !isSeekingRef.current
      ) {
        const currentTime = videoEl.currentTime;

        // Use buffer control to decide when to resume fetching
        const bufferCheckVideo = shouldFetchSegment(
          "video",
          videoSbRef.current,
          audioSbRef.current,
          currentTime,
          false,
          isLiveRef.current
        );

        const bufferCheckAudio = shouldFetchSegment(
          "audio",
          videoSbRef.current,
          audioSbRef.current,
          currentTime,
          false,
          isLiveRef.current
        );

        console.log(
          `[PlayerEvent] Resuming playback. Buffer control recommendations:`
        );
        console.log(`  Video: ${bufferCheckVideo.reason}`);
        console.log(`  Audio: ${bufferCheckAudio.reason}`);

        // Only resume if buffer control allows it
        if (
          bufferCheckVideo.shouldFetch &&
          !videoFinishedRef.current &&
          videoRepRef.current &&
          videoSbRef.current
        ) {
          if (bufferCheckVideo.delay === 0) {
            console.log(
              "[PlayerEvent] Immediate video fetch allowed by buffer control"
            );
            fetchNextSegment(
              videoId,
              videoRepRef.current,
              "video",
              videoSbRef.current,
              videoNextSegRef,
              videoFinishedRef,
              false
            );
          } else if (bufferCheckVideo.delay > 0) {
            console.log(
              `[PlayerEvent] Buffer control delaying video fetch by ${bufferCheckVideo.delay}ms`
            );
            scheduleNextFetch("video", bufferCheckVideo.delay, () => {
              if (videoRepRef.current && videoSbRef.current) {
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
            });
          }
        }

        if (
          bufferCheckAudio.shouldFetch &&
          !audioFinishedRef.current &&
          audioRepRef.current &&
          audioSbRef.current
        ) {
          if (bufferCheckAudio.delay === 0) {
            console.log(
              "[PlayerEvent] Immediate audio fetch allowed by buffer control"
            );
            fetchNextSegment(
              videoId,
              audioRepRef.current,
              "audio",
              audioSbRef.current,
              audioNextSegRef,
              audioFinishedRef,
              false
            );
          } else if (bufferCheckAudio.delay > 0) {
            console.log(
              `[PlayerEvent] Buffer control delaying audio fetch by ${bufferCheckAudio.delay}ms`
            );
            scheduleNextFetch("audio", bufferCheckAudio.delay, () => {
              if (audioRepRef.current && audioSbRef.current) {
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
            });
          }
        }
      }

      // Reset pause duration after a delay
      setTimeout(() => {
        pauseDurationRef.current = 0;
      }, 1000);
    }
  }, [
    videoId,
    videoRef,
    isPausedRef,
    setIsPaused,
    lastPauseTimeRef,
    pauseDurationRef,
    shouldStopDownloadingRef,
    showReplay,
    setShowReplay,
    initializePlayer,
    isOnlineRef,
    mediaSourceStateRef,
    isSeekingRef,
    videoFinishedRef,
    audioFinishedRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    fetchNextSegment,
    shouldFetchSegment,
    scheduleNextFetch,
  ]);

  return {
    handleStall,
    resetPlayer,
    handlePlayButtonClick,
    handleReplayClick,
    handleEnded,
    handleError,
    handlePlay,
    onPause,
    onPlayResume,
    onWaiting,
    startBufferMonitoring,
    detectStallSeverity,
    calculateCombinedBufferGap,
    predictTimeUntilStall,
  };
}
