import { useEffect, useCallback } from "react";
import {
  TARGET_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
  BUFFER_KEEP_BEHIND,
  //  BUFFER_EVICTION_INTERVAL,
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
    videoId: string, // Add this parameter
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

      const safeStart = Math.max(0, currentTime - BUFFER_KEEP_BEHIND);
      if (safeStart > 0) {
        enqueueOperation(mediaType, async () => {
          console.log(
            `Removing ${mediaType} buffer range [0, ${safeStart.toFixed(2)}]`
          );
          await removeBufferRange(sb, 0, safeStart);
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
  ]);

  useEffect(() => {
    const bufferMonitor = setInterval(() => {
      if (isPausedRef.current) {
        console.log(" video is paused");
        return;
      }

      if (videoFinishedRef.current && audioFinishedRef.current) {
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
  ]);

  return { evictBuffer };
}
