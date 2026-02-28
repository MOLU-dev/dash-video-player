import { useEffect, useCallback } from "react";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
  BUFFER_KEEP_BEHIND,
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
 // lastPlayheadPositionRef: React.RefObject<number>;
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
 // lastPlayheadPositionRef,
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

    // Update last playhead position for seek detection
   // lastPlayheadPositionRef.current = currentTime;

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
          console.log(
            `Evicting ${mediaType} buffer range [${evictionStart.toFixed(
              2
            )}, ${evictionEnd.toFixed(
              2
            )}] (keeping ${BUFFER_KEEP_BEHIND}s behind playhead at ${currentTime.toFixed(
              2
            )})`
          );
          await removeBufferRange(sb, evictionStart, evictionEnd);
        });
      } else {
        console.log(
          `No ${mediaType} buffer to evict (all within ${BUFFER_KEEP_BEHIND}s keep-behind window)`
        );
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
   // lastPlayheadPositionRef,
  ]);

  useEffect(() => {
    const bufferMonitor = setInterval(() => {
      if (isPausedRef.current) {
        console.log("Video is paused");
        return;
      }

      if (!isOnlineRef.current || isSeekingRef.current) return;
      if (qualitySwitchInProgressRef.current) return;

      const videoEl = videoRef.current;
      if (!videoEl || !videoEl.buffered || videoEl.buffered.length === 0)
        return;

      const currentTime = videoEl.currentTime;
      const estimatedBufferEnd = calculateEstimatedBufferEnd(
        videoEl,
        videoRepRef.current,
        audioRepRef.current,
        pendingAppendsRef.current
      );
      const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

      if (
        currentQuality === "auto" &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD &&
        !qualitySwitchInProgressRef.current &&
        !shouldAllowQualitySwitch
      ) {
        console.log(
          `[EMERGENCY] Buffer critical: ${bufferGap.toFixed(
            1
          )}s, forcing lowest quality`
        );

        if (videoQualityIdxRef.current !== 0) {
          switchQuality(0);
        }
      }

      setCurrentStats((prev: any) => ({
        ...prev,
        buffer: Math.round(bufferGap * 10) / 10,
      }));

      const shouldRefill =
        bufferGap < TARGET_BUFFER_LEVEL &&
        !qualitySwitchInProgressRef.current &&
        !videoFetchPausedRef.current;

      if (shouldRefill) {
        console.log("Buffer refill triggered:", bufferGap.toFixed(1));

        if (
          !videoFinishedRef.current &&
          videoRepRef.current &&
          videoSbRef.current &&
          !isFetchingVideoRef.current
        ) {
          const segmentDuration =
            videoRepRef.current.segmentDur / videoRepRef.current.timescale;
          const segmentsNeeded = Math.ceil(
            (TARGET_BUFFER_LEVEL - bufferGap) / segmentDuration
          );

          const segmentsToFetch = Math.min(3, segmentsNeeded);

          for (let i = 0; i < segmentsToFetch; i++) {
            if (
              videoNextSegRef.current >
              videoRepRef.current.startNumber +
                videoRepRef.current.totalSegments -
                1
            ) {
              videoFinishedRef.current = true;
              break;
            }

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

        if (
          !audioFinishedRef.current &&
          audioRepRef.current &&
          audioSbRef.current &&
          !isFetchingAudioRef.current
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
    }, 1000);

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
  ]);

  return { evictBuffer };
}
