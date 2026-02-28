// hooks/useBufferManagement.ts - Simplified version that works with smart stall detection
import { useEffect, useCallback } from "react";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
  BUFFER_KEEP_BEHIND,
  MAX_BUFFER_LEVEL,
} from "../constants/player.constants";
import { calculateEstimatedBufferEnd } from "../utils/bufferHelpers";
import { removeBufferRange } from "../utils/bufferHelpers";
import type {
  Representation,
  PendingAppend,
  MediaType,
} from "../types/player.types";

interface UseBufferManagementProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  isOnlineRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  qualitySwitchInProgressRef: React.RefObject<boolean>;
  videoFetchPausedRef: React.RefObject<boolean>;
  audioFetchPausedRef: React.RefObject<boolean>;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  videoQualityIdxRef: React.RefObject<number>;
  pendingAppendsRef: React.RefObject<{
    video: PendingAppend[];
    audio: PendingAppend[];
  }>;
  setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  switchQuality: (newIdx: number) => Promise<void>;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  videoId: string;
  isPausedRef: React.RefObject<boolean>;
  shouldAllowQualitySwitch: (context?: string) => boolean;
  currentQuality: string | number;
  shouldFetchSegment: (
    mediaType: "video" | "audio",
    videoSb: SourceBuffer | null,
    audioSb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean
  ) => {
    shouldFetch: boolean;
    delay: number;
    reason: string;
    segmentsToFetch?: number;
    isPredictedStall?: boolean;
  };
  scheduleNextFetch: (
    mediaType: "video" | "audio",
    delay: number,
    callback: () => void
  ) => void;
  isInStallRecovery?: (mediaType?: "video" | "audio") => boolean;
}

export function useBufferManagement({
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
  shouldFetchSegment,
  scheduleNextFetch,
  isInStallRecovery,
}: UseBufferManagementProps) {
  const evictBuffer = useCallback(() => {
    if (isPausedRef.current) {
      return;
    }

    const videoEl = videoRef.current;
    if (
      !videoEl ||
      !mediaSourceRef.current ||
      mediaSourceStateRef.current !== "open"
    )
      return;

    const currentTime = videoEl.currentTime;

    const evictForMediaType = (
      sb: SourceBuffer | null,
      mediaType: MediaType
    ) => {
      if (!sb || sb.buffered.length === 0) return;

      // Calculate the safe eviction point (keep BUFFER_KEEP_BEHIND seconds behind)
      const keepBehindTime = Math.max(0, currentTime - BUFFER_KEEP_BEHIND);

      // Find the earliest buffered range that needs eviction
      let evictionStart = 0;
      let evictionEnd = -1;

      for (let i = 0; i < sb.buffered.length; i++) {
        const rangeStart = sb.buffered.start(i);
        const rangeEnd = sb.buffered.end(i);

        // If this range ends before our keep-behind point, it can be removed entirely
        if (rangeEnd < keepBehindTime) {
          if (evictionEnd === -1) {
            evictionStart = rangeStart;
          }
          evictionEnd = rangeEnd;
        }
        // If this range starts before keep-behind but extends past it,
        // only remove the part before keep-behind
        else if (rangeStart < keepBehindTime && rangeEnd >= keepBehindTime) {
          if (evictionEnd === -1) {
            evictionStart = rangeStart;
          }
          evictionEnd = keepBehindTime - 0.5; // Add small buffer for safety
          break; // Don't check further ranges
        }
        // If range starts after keep-behind, we're done
        else if (rangeStart >= keepBehindTime) {
          break;
        }
      }

      // Only evict if we found a valid range
      if (evictionEnd > evictionStart) {
        enqueueOperation(mediaType, async () => {
          await removeBufferRange(sb, evictionStart, evictionEnd);
        });
      }
    };

    evictForMediaType(videoSbRef.current, "video");
    evictForMediaType(audioSbRef.current, "audio");
  }, [
    videoRef,
    videoSbRef,
    audioSbRef,
    mediaSourceRef,
    mediaSourceStateRef,
    enqueueOperation,
    isPausedRef,
  ]);

  useEffect(() => {
    const bufferMonitor = setInterval(() => {
      if (isPausedRef.current) {
        return;
      }

      // Don't run buffer management during stall recovery
      if (isInStallRecovery && isInStallRecovery()) {
        console.log("[BufferManagement] Skipping - in stall recovery");
        return;
      }

      if (!isOnlineRef.current || isSeekingRef.current) return;
      if (qualitySwitchInProgressRef.current) return;

      const videoEl = videoRef.current;
      if (!videoEl) return;

      const currentTime = videoEl.currentTime;

      // Calculate buffer gaps for stats
      const estimatedBufferEnd = calculateEstimatedBufferEnd(
        videoEl,
        videoRepRef.current,
        audioRepRef.current,
        pendingAppendsRef.current
      );
      const estimatedBufferGap = Math.max(0, estimatedBufferEnd - currentTime);

      // Update stats
      setCurrentStats((prev: any) => ({
        ...prev,
        buffer: Math.round(estimatedBufferGap * 10) / 10,
      }));

      // Quality switching logic
      if (
        currentQuality === "auto" &&
        estimatedBufferGap < BUFFER_EMERGENCY_THRESHOLD &&
        !qualitySwitchInProgressRef.current &&
        shouldAllowQualitySwitch("buffer-low")
      ) {
        if (videoQualityIdxRef.current !== 0) {
          console.log(
            `[BufferManagement] Low buffer (${estimatedBufferGap.toFixed(
              1
            )}s), switching to lowest quality`
          );
          switchQuality(0);
        }
      }

      // ✅ USE SMART BUFFER CONTROL (which already includes stall detection)
      const bufferCheckVideo = shouldFetchSegment(
        "video",
        videoSbRef.current,
        audioSbRef.current,
        currentTime,
        estimatedBufferGap < BUFFER_EMERGENCY_THRESHOLD
      );

      const bufferCheckAudio = shouldFetchSegment(
        "audio",
        videoSbRef.current,
        audioSbRef.current,
        currentTime,
        estimatedBufferGap < BUFFER_EMERGENCY_THRESHOLD
      );

      // Log predictions for debugging
      if (bufferCheckVideo.isPredictedStall) {
        console.log(`[BufferManagement] Video: ${bufferCheckVideo.reason}`);
      }
      if (bufferCheckAudio.isPredictedStall) {
        console.log(`[BufferManagement] Audio: ${bufferCheckAudio.reason}`);
      }

      // Only trigger fetches if buffer control allows and we're not already fetching
      if (
        bufferCheckVideo.shouldFetch &&
        bufferCheckVideo.delay === 0 &&
        !videoFinishedRef.current &&
        videoRepRef.current &&
        videoSbRef.current &&
        !isFetchingVideoRef.current &&
        !videoFetchPausedRef.current
      ) {
        console.log(
          `[BufferManagement] Triggering video fetch - ${bufferCheckVideo.reason}`
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
        // Schedule next fetch
        scheduleNextFetch("video", bufferCheckVideo.delay, () => {
          if (
            !videoFinishedRef.current &&
            videoRepRef.current &&
            videoSbRef.current &&
            !isFetchingVideoRef.current &&
            !videoFetchPausedRef.current
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
        });
      }

      // Audio fetching
      if (
        bufferCheckAudio.shouldFetch &&
        bufferCheckAudio.delay === 0 &&
        !audioFinishedRef.current &&
        audioRepRef.current &&
        audioSbRef.current &&
        !isFetchingAudioRef.current &&
        !audioFetchPausedRef.current
      ) {
        console.log(
          `[BufferManagement] Triggering audio fetch - ${bufferCheckAudio.reason}`
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
        scheduleNextFetch("audio", bufferCheckAudio.delay, () => {
          if (
            !audioFinishedRef.current &&
            audioRepRef.current &&
            audioSbRef.current &&
            !isFetchingAudioRef.current &&
            !audioFetchPausedRef.current
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
        });
      }

      // Auto-evict buffer when we're above max buffer
      if (estimatedBufferGap > MAX_BUFFER_LEVEL * 0.8) {
        evictBuffer();
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(bufferMonitor);
  }, [
    videoId,
    videoRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoFinishedRef,
    audioFinishedRef,
    videoNextSegRef,
    audioNextSegRef,
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
    isPausedRef,
    shouldAllowQualitySwitch,
    currentQuality,
    shouldFetchSegment,
    scheduleNextFetch,
    evictBuffer,
    isInStallRecovery,
  ]);

  return { evictBuffer };
}
