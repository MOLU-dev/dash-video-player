import { useEffect } from "react";
import { ONLINE_COOLDOWN_PERIOD } from "../constants/player.constants";
import {
  MediaType,
  Representation,
} from "../types/player.types";

interface UseNetworkStatusProps {
  setIsOnline: (online: boolean) => void;
  setShowOfflineMessage: (show: boolean) => void;
  isOnlineRef: React.RefObject<boolean>;
  lastOnlineTimeRef: React.RefObject<number>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  startupTimeRef: React.RefObject<number>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  videoRepRef: React.RefObject<any>;
  audioRepRef: React.RefObject<any>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInEmergencyModeRef: React.RefObject<boolean>;
  bufferRecoveryTargetRef: React.RefObject<number>;
  targetBufferLevelRef: React.RefObject<number>;
  abortAllRequests: () => void;
  fetchNextSegment: (
    videoId: string, // Add this parameter
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  videoId: string;
  TARGET_BUFFER_LEVEL: number;
  BUFFER_RECOVERY_MULTIPLIER: number;
  getBufferGap: (buffered: TimeRanges, currentTime: number) => number;
}

export function useNetworkStatus({
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
}: UseNetworkStatusProps) {
  useEffect(() => {
    const handleOnline = () => {
      console.log("Connection restored");
      setIsOnline(true);
      isOnlineRef.current = true;
      setShowOfflineMessage(false);

      lastOnlineTimeRef.current = Date.now();
      startupTimeRef.current = Date.now();
      isInOnlineRecoveryRef.current = true;

      setTimeout(() => {
        isInOnlineRecoveryRef.current = false;
      }, ONLINE_COOLDOWN_PERIOD);

      if (mediaSourceStateRef.current === "open" && videoRef.current) {
        const videoEl = videoRef.current;

        const bufferGap =
          videoEl && videoEl.buffered && videoEl.buffered.length
            ? getBufferGap(videoEl.buffered, videoEl.currentTime)
            : 0;

        if (bufferGap > TARGET_BUFFER_LEVEL * 0.3) {
          return;
        }

        if (isInEmergencyModeRef.current) {
          bufferRecoveryTargetRef.current =
            targetBufferLevelRef.current * BUFFER_RECOVERY_MULTIPLIER;
        }

        if (
          videoRepRef.current &&
          videoSbRef.current &&
          !videoFinishedRef.current
        ) {
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

        if (
          audioRepRef.current &&
          audioSbRef.current &&
          !audioFinishedRef.current
        ) {
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

        if (
          videoEl.paused &&
          videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          videoEl
            .play()
            .catch((e) => console.log("Autoplay after reconnect failed:", e));
        }
      }
    };

    const handleOffline = () => {
      console.log("Connection lost");
      setIsOnline(false);
      isOnlineRef.current = false;
      setShowOfflineMessage(true);
      abortAllRequests();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    videoId,
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
    TARGET_BUFFER_LEVEL,
    BUFFER_RECOVERY_MULTIPLIER,
    getBufferGap,
  ]);
}
