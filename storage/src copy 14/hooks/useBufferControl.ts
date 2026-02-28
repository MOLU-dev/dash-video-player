// ============================================
// 1. CREATE A SHARED BUFFER CONTROL HOOK
// ============================================
// hooks/useBufferControl.ts

import { useCallback, useRef } from "react";
import {
  TARGET_BUFFER_LEVEL,
  MAX_BUFFER_LEVEL,
} from "../../../src/constants/player.constants";

interface BufferControlState {
  lastFetchTime: number;
  isFetching: boolean;
  scheduledFetch: number | null;
}

export function useBufferControl() {
  const videoControlRef = useRef<BufferControlState>({
    lastFetchTime: 0,
    isFetching: false,
    scheduledFetch: null,
  });

  const audioControlRef = useRef<BufferControlState>({
    lastFetchTime: 0,
    isFetching: false,
    scheduledFetch: null,
  });

  /**
   * Calculate if we should fetch and how long to wait
   * Returns null if shouldn't fetch, or delay in ms
   */
  const shouldFetchSegment = useCallback(
    (
      mediaType: "video" | "audio",
      sb: SourceBuffer | null,
      currentTime: number,
      isEmergency: boolean = false
    ): { shouldFetch: boolean; delay: number; reason: string } => {
      if (!sb || sb.buffered.length === 0) {
        return { shouldFetch: true, delay: 0, reason: "No buffer data" };
      }

      // Calculate actual buffer ahead
      let actualBufferAhead = 0;
      for (let i = 0; i < sb.buffered.length; i++) {
        const start = sb.buffered.start(i);
        const end = sb.buffered.end(i);

        if (currentTime >= start && currentTime <= end) {
          actualBufferAhead = end - currentTime;
          break;
        } else if (currentTime < start) {
          actualBufferAhead = 0;
          break;
        }
      }

      // Emergency mode - always fetch immediately
      if (isEmergency || actualBufferAhead < 5) {
        return {
          shouldFetch: true,
          delay: 0,
          reason: `Emergency: ${actualBufferAhead.toFixed(1)}s buffered`,
        };
      }

      // Check if we're already at max buffer
      if (actualBufferAhead >= MAX_BUFFER_LEVEL) {
        return {
          shouldFetch: false,
          delay: 5000,
          reason: `Max buffer reached: ${actualBufferAhead.toFixed(1)}s`,
        };
      }

      // Calculate delay based on buffer level (gradual slowdown)
      let delay = 0;

      if (actualBufferAhead < 10) {
        // 5-10s: Fetch normally
        delay = 100;
      } else if (actualBufferAhead < TARGET_BUFFER_LEVEL) {
        // 10s to target: Gradual slowdown
        const progress = (actualBufferAhead - 10) / (TARGET_BUFFER_LEVEL - 10);
        delay = 100 + progress * 900; // 100ms → 1000ms
      } else if (actualBufferAhead < MAX_BUFFER_LEVEL) {
        // Target to max: Significant slowdown
        const progress =
          (actualBufferAhead - TARGET_BUFFER_LEVEL) /
          (MAX_BUFFER_LEVEL - TARGET_BUFFER_LEVEL);
        delay = 1000 + progress * 4000; // 1s → 5s
      }

      // Check if enough time has passed since last fetch
      const controlRef =
        mediaType === "video" ? videoControlRef : audioControlRef;
      const timeSinceLastFetch = Date.now() - controlRef.current.lastFetchTime;

      if (controlRef.current.isFetching) {
        return {
          shouldFetch: false,
          delay: delay,
          reason: "Already fetching",
        };
      }

      if (timeSinceLastFetch < delay) {
        return {
          shouldFetch: false,
          delay: delay - timeSinceLastFetch,
          reason: `Throttled: ${
            (delay - timeSinceLastFetch) / 1000
          }s remaining`,
        };
      }

      return {
        shouldFetch: true,
        delay: 0,
        reason: `OK to fetch: ${actualBufferAhead.toFixed(1)}s buffered`,
      };
    },
    []
  );

  const markFetchStart = useCallback((mediaType: "video" | "audio") => {
    const controlRef =
      mediaType === "video" ? videoControlRef : audioControlRef;
    controlRef.current.isFetching = true;
    controlRef.current.lastFetchTime = Date.now();
  }, []);

  const markFetchEnd = useCallback((mediaType: "video" | "audio") => {
    const controlRef =
      mediaType === "video" ? videoControlRef : audioControlRef;
    controlRef.current.isFetching = false;
  }, []);

  const cancelScheduledFetch = useCallback((mediaType: "video" | "audio") => {
    const controlRef =
      mediaType === "video" ? videoControlRef : audioControlRef;
    if (controlRef.current.scheduledFetch) {
      clearTimeout(controlRef.current.scheduledFetch);
      controlRef.current.scheduledFetch = null;
    }
  }, []);

  const scheduleNextFetch = useCallback(
    (mediaType: "video" | "audio", delay: number, callback: () => void) => {
      const controlRef =
        mediaType === "video" ? videoControlRef : audioControlRef;

      cancelScheduledFetch(mediaType);

      controlRef.current.scheduledFetch = window.setTimeout(() => {
        controlRef.current.scheduledFetch = null;
        callback();
      }, delay);
    },
    [cancelScheduledFetch]
  );

  return {
    shouldFetchSegment,
    markFetchStart,
    markFetchEnd,
    cancelScheduledFetch,
    scheduleNextFetch,
  };
}
