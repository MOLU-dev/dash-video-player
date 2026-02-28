import { useCallback } from "react";
import { getBufferGap } from "../../../src/utils/playerHelpers";
import {
  REBUFFER_THRESHOLD,
  BUFFER_MIN_SWITCH_THRESHOLD,
} from "../../../src/constants/player.constants";
import type { Representation } from "../../../src/types/player.types";

interface UsePlayerEventHandlersProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  isOnlineRef: React.RefObject<boolean>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  lastTimeUpdateRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  durationRef: React.RefObject<number>;
  videoQualityIdxRef: React.RefObject<number>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  handleStall: () => void;
  resetStreamForSeek: (time: number) => void;
  switchQuality: (idx: number) => Promise<void>;
  fetchNextSegment: (...args: any[]) => void;
  calculateEstimatedBufferEndWrapper: () => number;
}

export function usePlayerEventHandlers(props: UsePlayerEventHandlersProps) {
  const {
    videoRef,
    mediaSourceRef,
    isOnlineRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    lastTimeUpdateRef,
    lastBufferGapRef,
    durationRef,
    videoQualityIdxRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    handleStall,
    resetStreamForSeek,
    switchQuality,
    fetchNextSegment,
    calculateEstimatedBufferEndWrapper,
  } = props;

  const onTimeUpdate = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    const videoEl = videoRef.current;

    if (!mediaSource || mediaSource.readyState !== "open") return;
    if (!videoEl || !videoEl.buffered || videoEl.buffered.length === 0) return;
    if (!isOnlineRef.current) return;

    const now = Date.now();
    if (now - lastTimeUpdateRef.current < 500) return;
    lastTimeUpdateRef.current = now;

    const currentTime = videoEl.currentTime;
    const timeToEnd = durationRef.current - currentTime;
    const bufferGap = getBufferGap(videoEl.buffered, currentTime);

    // Check for stall
    if (
      bufferGap < REBUFFER_THRESHOLD &&
      !isStalledRef.current &&
      !isSeekingRef.current &&
      !isInOnlineRecoveryRef.current
    ) {
      console.log("⚠️ Stall detected, buffer gap:", bufferGap.toFixed(1));
      handleStall();
    }

    // Recover from stall
    if (bufferGap > 5 && isStalledRef.current) {
      console.log("✅ Recovered from stall");
      isStalledRef.current = false;
    }

    // Detect buffer loss and downgrade quality
    const bufferLoss = lastBufferGapRef.current - bufferGap;
    if (
      bufferLoss > 1.5 &&
      bufferGap < 5 &&
      !isSeekingRef.current &&
      !isInOnlineRecoveryRef.current
    ) {
      console.log(
        "⚠️ Significant buffer loss detected:",
        bufferLoss.toFixed(1)
      );
      const newQuality = Math.max(0, videoQualityIdxRef.current - 1);
      switchQuality(newQuality);
    }
    lastBufferGapRef.current = bufferGap;

    const isNearEnd = timeToEnd < 5;
    const isBufferLow = bufferGap < 15;

    // Proactively fetch segments when buffer is low
    if (
      isBufferLow &&
      !videoFinishedRef.current &&
      videoRepRef.current &&
      videoSbRef.current
    ) {
      fetchNextSegment(
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
        audioRepRef.current,
        "audio",
        audioSbRef.current,
        audioNextSegRef,
        audioFinishedRef,
        false
      );
    }

    // Ensure we fetch remaining segments near end
    if (isNearEnd) {
      if (
        !videoFinishedRef.current &&
        videoRepRef.current &&
        videoSbRef.current
      ) {
        fetchNextSegment(
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
          audioRepRef.current,
          "audio",
          audioSbRef.current,
          audioNextSegRef,
          audioFinishedRef,
          false
        );
      }
    }
  }, [
    videoRef,
    mediaSourceRef,
    isOnlineRef,
    isStalledRef,
    isSeekingRef,
    isInOnlineRecoveryRef,
    lastTimeUpdateRef,
    lastBufferGapRef,
    durationRef,
    videoQualityIdxRef,
    videoRepRef,
    audioRepRef,
    videoSbRef,
    audioSbRef,
    videoNextSegRef,
    audioNextSegRef,
    videoFinishedRef,
    audioFinishedRef,
    handleStall,
    switchQuality,
    fetchNextSegment,
  ]);

  const onSeeking = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const targetTime = videoEl.currentTime;
    console.log("🔍 Seeking to:", targetTime.toFixed(2));
    resetStreamForSeek(targetTime);
  }, [videoRef, resetStreamForSeek]);

  const onWaiting = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    if (!mediaSource || mediaSource.readyState !== "open") return;

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
        `onWaiting blocked: buffer gap ${bufferGap.toFixed(1)}s above threshold`
      );
      return;
    }

    console.log("⏸️ Waiting event, handling stall");
    handleStall();
  }, [
    videoRef,
    mediaSourceRef,
    isInOnlineRecoveryRef,
    isSeekingRef,
    handleStall,
    calculateEstimatedBufferEndWrapper,
  ]);

  return {
    onTimeUpdate,
    onSeeking,
    onWaiting,
  };
}
