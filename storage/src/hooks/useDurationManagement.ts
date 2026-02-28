// hooks/useDurationManagement.ts
import { useCallback, useRef } from "react";

interface UseDurationManagementProps {
  mediaSourceRef: React.RefObject<MediaSource | null>;
  durationRef: React.RefObject<number>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useDurationManagement({
  mediaSourceRef,
  durationRef,
  videoRef,
}: UseDurationManagementProps) {
  const setMediaSourceDuration = useCallback(
    (duration: number) => {
      const mediaSource = mediaSourceRef.current;
      if (!mediaSource || mediaSource.readyState !== "open") {
        console.warn("MediaSource not ready for setting duration");
        return false;
      }

      try {
        mediaSource.duration = duration;
        durationRef.current = duration;
        console.log("MediaSource duration set to:", duration);
        return true;
      } catch (error) {
        console.error("Failed to set MediaSource duration:", error);
        return false;
      }
    },
    [mediaSourceRef, durationRef]
  );

  const getEffectiveDuration = useCallback(() => {
    const videoEl = videoRef.current;
    const mediaSource = mediaSourceRef.current;

    // Prefer MediaSource duration as it represents the actual buffered content
    if (
      mediaSource &&
      mediaSource.duration !== Infinity &&
      mediaSource.duration > 0
    ) {
      return mediaSource.duration;
    }

    // Fallback to video element duration
    if (videoEl && videoEl.duration && videoEl.duration !== Infinity) {
      return videoEl.duration;
    }

    // Final fallback to parsed total duration
    return durationRef.current;
  }, [videoRef, mediaSourceRef, durationRef]);

  const isAtEnd = useCallback(
    (currentTime: number, threshold: number = 0.5) => {
      const duration = getEffectiveDuration();
      return duration > 0 && currentTime >= duration - threshold;
    },
    [getEffectiveDuration]
  );

  const isAtStart = useCallback(
    (currentTime: number, threshold: number = 0.5) => {
      return currentTime <= threshold;
    },
    []
  );

  return {
    setMediaSourceDuration,
    getEffectiveDuration,
    isAtEnd,
    isAtStart,
  };
}
