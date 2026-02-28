import { useCallback, useEffect } from 'react';

interface UseMediaSourceProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  mediaSourceStateRef: React.RefObject<'closed' | 'open' | 'ended'>;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  evictionIntervalRef: React.RefObject<number | null>;
  rebufferTimeoutRef: React.RefObject<number | null>;
}

export function useMediaSource({
  videoRef,
  mediaSourceRef,
  mediaSourceStateRef,
  videoSbRef,
  audioSbRef,
  evictionIntervalRef,
  rebufferTimeoutRef,
}: UseMediaSourceProps) {
  const cleanupMediaSource = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    if (!mediaSource) return;

    if (evictionIntervalRef.current) {
      clearInterval(evictionIntervalRef.current);
      evictionIntervalRef.current = null;
    }

    if (rebufferTimeoutRef.current) {
      clearTimeout(rebufferTimeoutRef.current);
      rebufferTimeoutRef.current = null;
    }

    [videoSbRef.current, audioSbRef.current].forEach((sb) => {
      if (sb && mediaSource.readyState === "open") {
        try {
          mediaSource.removeSourceBuffer(sb);
        } catch (e) {}
      }
    });

    videoSbRef.current = null;
    audioSbRef.current = null;
    mediaSourceRef.current = null;
    mediaSourceStateRef.current = "closed";

    try {
      if (mediaSource.readyState === "open") {
        mediaSource.endOfStream();
      }
    } catch (e) {}
  }, [
    mediaSourceRef,
    mediaSourceStateRef,
    videoSbRef,
    audioSbRef,
    evictionIntervalRef,
    rebufferTimeoutRef,
  ]);

  useEffect(() => {
    return () => {
      if (evictionIntervalRef.current) {
        clearInterval(evictionIntervalRef.current);
      }

      if (rebufferTimeoutRef.current) {
        clearTimeout(rebufferTimeoutRef.current);
      }
    };
  }, [evictionIntervalRef, rebufferTimeoutRef]);

  return { cleanupMediaSource };
}