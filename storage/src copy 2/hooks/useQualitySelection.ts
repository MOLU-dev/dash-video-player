import { useCallback, useEffect } from "react";
import type {
  Representation,
  BOLAState,
  PendingAppend,
  MediaType,
} from "../types/player.types";
import { fetchInitSegment } from "../services/segmentFetcher";
import { appendBufferSafely } from "../utils/bufferHelpers";
import {
  decideNextQuality,
  //chooseInitialQualityIdx,
} from "../utils/qualityHelpers";
import {
  BUFFER_MIN_SWITCH_THRESHOLD,
  BUFFER_EMERGENCY_THRESHOLD,
  TARGET_BUFFER_LEVEL,
 // ONLINE_COOLDOWN_PERIOD,
} from "../constants/player.constants";

interface UseQualitySelectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoRepsRef: React.RefObject<Representation[]>;
  videoRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  videoQualityIdxRef: React.RefObject<number>;
  lastQualitySwitchRef: React.RefObject<number>;
  qualitySwitchInProgressRef: React.RefObject<boolean>;
  pendingQualitySwitchRef: React.RefObject<{
    targetQuality: number;
    timestamp: number;
  } | null>;
  videoFetchPausedRef: React.RefObject<boolean>;
  audioFetchPausedRef: React.RefObject<boolean>;
  videoNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  pendingAppendsRef: React.RefObject<{
    video: PendingAppend[];
    audio: PendingAppend[];
  }>;
  isSeekingRef: React.RefObject<boolean>;
  isStalledRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  lastOnlineTimeRef: React.RefObject<number>;
  isInEmergencyModeRef: React.RefObject<boolean>;
  bolaStateRef: React.RefObject<BOLAState>;
  targetBufferLevelRef: React.RefObject<number>;
  setUiVideoQualityIdx: React.Dispatch<React.SetStateAction<number>>;
  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  availableQualities: Array<{ id: string; label: string }>;
  cancelAllSegmentRequests: (
    mediaType?: MediaType,
    specificRepId?: string
  ) => void;
  completeOngoingSegmentOperations: (mediaType: MediaType) => Promise<void>;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string, // Add this parameter
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  getVideoThroughput: () => number;
  calculateEstimatedBufferEnd: () => number;
  videoId: string;
  isPausedRef: React.RefObject<boolean>;
}

export function useQualitySelection({
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
  calculateEstimatedBufferEnd,
  videoId,
  isPausedRef,
  audioFinishedRef
}: UseQualitySelectionProps) {
  const shouldAllowQualitySwitch = useCallback(
    (context: string = "general"): boolean => {
      const videoEl = videoRef.current;

       if (videoFinishedRef.current && audioFinishedRef.current) {
         return false;
       }
      
      if (!videoEl) {
        console.log(`[${context}] Blocking: no video element`);
        return false;
      }

      if (!videoEl.buffered || videoEl.buffered.length === 0) {
        console.log(`[${context}] Blocking: no buffer data`);
        return false;
      }

      if (isInOnlineRecoveryRef.current) {
        console.log(`[${context}] Blocking: in online recovery cooldown`);
        return false;
      }

      if (isSeekingRef.current) {
        console.log(`[${context}] Blocking: currently seeking`);
        return false;
      }

      if (isStalledRef.current) {
        console.log(`[${context}] Blocking: currently in stall recovery`);
        return false;
      }

      if (qualitySwitchInProgressRef.current) {
        console.log(`[${context}] Blocking: quality switch in progress`);
        return false;
      }

      const timeSinceStart = Date.now() - lastOnlineTimeRef.current;
      if (timeSinceStart < 5000 && context !== "startup") {
        console.log(`[${context}] Blocking: within startup grace period`);
        return false;
      }

      const estimatedBufferEnd = calculateEstimatedBufferEnd();
      const bufferGap = estimatedBufferEnd - videoEl.currentTime;

      if (bufferGap < BUFFER_MIN_SWITCH_THRESHOLD) {
        console.log(
          `[${context}] Blocking: buffer gap ${bufferGap.toFixed(
            1
          )}s below minimum threshold ${BUFFER_MIN_SWITCH_THRESHOLD}s`
        );
        return false;
      }

      if (Date.now() - lastQualitySwitchRef.current < 3000) {
        console.log(`[${context}] Blocking: too frequent switching`);
        return false;
      }

      if (
        isInEmergencyModeRef.current &&
        bufferGap < TARGET_BUFFER_LEVEL * 0.5
      ) {
        console.log(`[${context}] Blocking: in emergency mode with low buffer`);
        return false;
      }

      console.log(
        `[${context}] Allowing quality switch - buffer: ${bufferGap.toFixed(
          1
        )}s`
      );
      return true;
    },
    [
      videoRef,
      isInOnlineRecoveryRef,
      isSeekingRef,
      isStalledRef,
      qualitySwitchInProgressRef,
      lastOnlineTimeRef,
      lastQualitySwitchRef,
      isInEmergencyModeRef,
      calculateEstimatedBufferEnd,
    ]
  );

  const switchQuality = useCallback(
    async (newIdx: number) => {
      const videoEl = videoRef.current;
      if (!videoEl || !videoSbRef.current) return;

      if (!shouldAllowQualitySwitch("quality-switch")) {
        console.log("Quality switch blocked by guard conditions");
        return;
      }

      if (qualitySwitchInProgressRef.current) {
        console.log(
          `Quality switch already in progress, queueing switch to ${newIdx}`
        );
        pendingQualitySwitchRef.current = {
          targetQuality: newIdx,
          timestamp: Date.now(),
        };
        return;
      }

      if (Date.now() - lastQualitySwitchRef.current < 2000) {
        console.log("Quality switch too frequent, blocking");
        return;
      }

      const currentRep = videoRepsRef.current[videoQualityIdxRef.current];
      const newRep = videoRepsRef.current[newIdx];

      if (!currentRep || !newRep) return;
      if (newIdx === videoQualityIdxRef.current) return;

      console.log("Starting quality switch...", {
        from: currentRep.id,
        to: newRep.id,
        fromIdx: videoQualityIdxRef.current,
        toIdx: newIdx,
      });

      qualitySwitchInProgressRef.current = true;
      lastQualitySwitchRef.current = Date.now();

      try {
        videoFetchPausedRef.current = true;
        audioFetchPausedRef.current = true;

        cancelAllSegmentRequests("video", currentRep.id);

        await completeOngoingSegmentOperations("video");

        const currentTime = videoEl.currentTime;
        const bufferEnd =
          videoEl.buffered.length > 0
            ? videoEl.buffered.end(videoEl.buffered.length - 1)
            : 0;

        const resumeTime = Math.max(currentTime, bufferEnd);
        const newSegmentDuration = newRep.segmentDur / newRep.timescale;

        const segmentIndex = Math.floor(resumeTime / newSegmentDuration);
        let newSegmentNum = newRep.startNumber + segmentIndex;

        newSegmentNum = Math.min(
          newSegmentNum,
          newRep.startNumber + newRep.totalSegments - 1
        );

        const lastProcessed =
          lastProcessedSegmentsRef.current.get(newRep.id) ||
          newRep.startNumber - 1;
        newSegmentNum = Math.max(newSegmentNum, lastProcessed + 1);

        console.log("Quality switch segment calculation:", {
          currentTime,
          bufferEnd,
          resumeTime,
          newSegmentDuration,
          segmentIndex,
          newSegmentNum,
          lastProcessed,
        });

        if (!videoInitSegmentCache.current.has(newRep.id)) {
          const initSegment = await fetchInitSegment(
            videoId,
            newRep.id,
            "video"
          );
          videoInitSegmentCache.current.set(newRep.id, initSegment);
          currentVideoInitSegmentRef.current = initSegment;
          currentVideoRepIdRef.current = newRep.id;

          await enqueueOperation("video", () =>
            appendBufferSafely(videoSbRef.current!, initSegment)
          );
        } else {
          const cachedInitSegment = videoInitSegmentCache.current.get(
            newRep.id
          )!;
          currentVideoInitSegmentRef.current = cachedInitSegment;
          currentVideoRepIdRef.current = newRep.id;

          await enqueueOperation("video", () =>
            appendBufferSafely(videoSbRef.current!, cachedInitSegment)
          );
        }

        videoRepRef.current = newRep;
        videoQualityIdxRef.current = newIdx;
        videoNextSegRef.current = newSegmentNum;
        videoFinishedRef.current = false;

        setUiVideoQualityIdx(newIdx);
        setCurrentStats((prev: any) => ({
          ...prev,
          quality: availableQualities[newIdx]?.label || "Auto",
        }));

        console.log("Quality switch preparation complete, resuming fetch...");

        videoFetchPausedRef.current = false;
        audioFetchPausedRef.current = false;

        if (videoSbRef.current) {
          for (let i = 0; i < 2; i++) {
            if (
              videoNextSegRef.current <=
              newRep.startNumber + newRep.totalSegments - 1
            ) {
              fetchNextSegment(
                videoId,
                newRep,
                "video",
                videoSbRef.current,
                videoNextSegRef,
                videoFinishedRef,
                true
              );
            }
          }
        }
      } catch (err) {
        console.error("Quality switch failed:", err);

        if (currentRep) {
          console.log("Reverting to previous quality due to switch failure");
          videoRepRef.current = currentRep;
          videoQualityIdxRef.current = videoRepsRef.current.indexOf(currentRep);
          setUiVideoQualityIdx(videoQualityIdxRef.current);

          videoFetchPausedRef.current = false;

          if (videoSbRef.current) {
            fetchNextSegment(
              videoId,
              currentRep,
              "video",
              videoSbRef.current,
              videoNextSegRef,
              videoFinishedRef,
              true
            );
          }
        }
      } finally {
        qualitySwitchInProgressRef.current = false;

        if (pendingQualitySwitchRef.current) {
          const pending = pendingQualitySwitchRef.current;
          pendingQualitySwitchRef.current = null;

          if (Date.now() - pending.timestamp < 5000) {
            setTimeout(() => switchQuality(pending.targetQuality), 1000);
          }
        }
      }
    },
    [
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
      setUiVideoQualityIdx,
      setCurrentStats,
      availableQualities,
      shouldAllowQualitySwitch,
      cancelAllSegmentRequests,
      completeOngoingSegmentOperations,
      enqueueOperation,
      fetchNextSegment,
      videoId,
    ]
  );

  const decideQuality = useCallback((): number => {
    if (videoRepsRef.current.length === 0 || !videoRef.current) {
      return videoQualityIdxRef.current;
    }

    if (!shouldAllowQualitySwitch()) {
      return videoQualityIdxRef.current;
    }

    const currentIdx = videoQualityIdxRef.current;
    const estimatedBufferEnd = calculateEstimatedBufferEnd();
    const bufferLevel = estimatedBufferEnd - videoRef.current.currentTime;

    const effectiveThroughput = getVideoThroughput();

    return decideNextQuality(
      videoRepsRef.current,
      currentIdx,
      bufferLevel,
      effectiveThroughput,
      bolaStateRef.current,
      targetBufferLevelRef.current
    );
  }, [
    videoRepsRef,
    videoRef,
    videoQualityIdxRef,
    bolaStateRef,
    targetBufferLevelRef,
    shouldAllowQualitySwitch,
    calculateEstimatedBufferEnd,
    getVideoThroughput,
  ]);

  return {
    switchQuality,
    decideQuality,
    shouldAllowQualitySwitch,
  };
}
