// // hooks/useBufferControl.ts
// import { useCallback, useRef } from "react";
// import {
//   TARGET_BUFFER_LEVEL,
//   MAX_BUFFER_LEVEL,
//   BUFFER_EMERGENCY_THRESHOLD,
// } from "@/constants/player.constants";

// interface UnifiedBufferState {
//   videoBufferAhead: number;
//   audioBufferAhead: number;
//   combinedBufferAhead: number;
//   lastFetchTime: number;
//   isFetching: boolean;
//   scheduledFetch: number | null;
// }

// export function useBufferControl() {
//   const bufferStateRef = useRef<{
//     video: UnifiedBufferState;
//     audio: UnifiedBufferState;
//     lastUpdated: number;
//   }>({
//     video: {
//       videoBufferAhead: 0,
//       audioBufferAhead: 0,
//       combinedBufferAhead: 0,
//       lastFetchTime: 0,
//       isFetching: false,
//       scheduledFetch: null,
//     },
//     audio: {
//       videoBufferAhead: 0,
//       audioBufferAhead: 0,
//       combinedBufferAhead: 0,
//       lastFetchTime: 0,
//       isFetching: false,
//       scheduledFetch: null,
//     },
//     lastUpdated: 0,
//   });

//   /**
//    * Update buffer state for both video and audio
//    */
//   const updateBufferState = useCallback(
//     (
//       videoSb: SourceBuffer | null,
//       audioSb: SourceBuffer | null,
//       currentTime: number
//     ): {
//       videoBufferAhead: number;
//       audioBufferAhead: number;
//       combinedBufferAhead: number;
//     } => {
//       let videoBufferAhead = 0;
//       let audioBufferAhead = 0;

//       // Calculate video buffer
//       if (videoSb && videoSb.buffered.length > 0) {
//         for (let i = 0; i < videoSb.buffered.length; i++) {
//           const start = videoSb.buffered.start(i);
//           const end = videoSb.buffered.end(i);
//           if (currentTime >= start && currentTime <= end) {
//             videoBufferAhead = end - currentTime;
//             break;
//           }
//         }
//       }

//       // Calculate audio buffer
//       if (audioSb && audioSb.buffered.length > 0) {
//         for (let i = 0; i < audioSb.buffered.length; i++) {
//           const start = audioSb.buffered.start(i);
//           const end = audioSb.buffered.end(i);
//           if (currentTime >= start && currentTime <= end) {
//             audioBufferAhead = end - currentTime;
//             break;
//           }
//         }
//       }

//       // Combined buffer is limited by whichever is shorter
//       const combinedBufferAhead = Math.min(videoBufferAhead, audioBufferAhead);

//       // Update both video and audio states with the same info
//       const now = Date.now();
//       bufferStateRef.current = {
//         video: {
//           ...bufferStateRef.current.video,
//           videoBufferAhead,
//           audioBufferAhead,
//           combinedBufferAhead,
//         },
//         audio: {
//           ...bufferStateRef.current.audio,
//           videoBufferAhead,
//           audioBufferAhead,
//           combinedBufferAhead,
//         },
//         lastUpdated: now,
//       };

//       return { videoBufferAhead, audioBufferAhead, combinedBufferAhead };
//     },
//     []
//   );

//   /**
//    * Calculate exponential slowdown as buffer approaches target
//    * More aggressive slowdown as we get closer to TARGET_BUFFER_LEVEL
//    */
//   const calculateExponentialSlowdown = useCallback(
//     (
//       currentBuffer: number,
//       targetBuffer: number,
//       maxBuffer: number,
//       mediaType: "video" | "audio"
//     ): { delay: number; segmentsToFetch: number } => {
//       // Normalize buffer level (0 to 1+)
//       const normalized =
//         (currentBuffer - BUFFER_EMERGENCY_THRESHOLD) /
//         (targetBuffer - BUFFER_EMERGENCY_THRESHOLD);

//       // Exponential decay function: f(x) = e^(-k * x)
//       // k controls how aggressive the slowdown is
//       const k = 3.0; // Higher = more aggressive slowdown

//       let delay = 0;
//       let segmentsToFetch = 1;

//       // Emergency zone (0-5s)
//       if (currentBuffer < BUFFER_EMERGENCY_THRESHOLD) {
//         delay = 0;
//         segmentsToFetch = mediaType === "video" ? 4 : 3;
//       }
//       // Rapid fetch zone (5-15s)
//       else if (currentBuffer < 15) {
//         const progress =
//           (currentBuffer - BUFFER_EMERGENCY_THRESHOLD) /
//           (15 - BUFFER_EMERGENCY_THRESHOLD);
//         delay = 50 + progress * 100; // 50ms → 150ms
//         segmentsToFetch = mediaType === "video" ? 3 : 2;
//       }
//       // Moderate zone (15-30s) - Start slowing down
//       else if (currentBuffer < targetBuffer * 0.5) {
//         const progress = (currentBuffer - 15) / (targetBuffer * 0.5 - 15);
//         const expFactor = Math.exp(-k * progress);
//         delay = 150 + expFactor * 850; // 150ms → 1000ms
//         segmentsToFetch = mediaType === "video" ? 2 : 1;
//       }
//       // Aggressive slowdown zone (30-45s)
//       else if (currentBuffer < targetBuffer * 0.75) {
//         const progress =
//           (currentBuffer - targetBuffer * 0.5) /
//           (targetBuffer * 0.75 - targetBuffer * 0.5);
//         const expFactor = Math.exp(-k * progress);
//         delay = 1000 + expFactor * 2000; // 1000ms → 3000ms
//         segmentsToFetch = 1;
//       }
//       // Very aggressive slowdown zone (45-60s)
//       else if (currentBuffer < targetBuffer) {
//         const progress =
//           (currentBuffer - targetBuffer * 0.75) /
//           (targetBuffer - targetBuffer * 0.75);
//         const expFactor = Math.exp(-k * progress);
//         delay = 3000 + expFactor * 4000; // 3000ms → 7000ms
//         segmentsToFetch = 1;
//       }
//       // Maintenance zone (60-66s) - Minimal fetching
//       else if (currentBuffer < maxBuffer) {
//         const progress =
//           (currentBuffer - targetBuffer) / (maxBuffer - targetBuffer);
//         delay = 7000 + progress * 8000; // 7s → 15s
//         segmentsToFetch = 1;
//       }
//       // Max buffer reached
//       else {
//         delay = 15000; // 15 seconds
//         segmentsToFetch = 0;
//       }

//       return { delay, segmentsToFetch };
//     },
//     []
//   );

//   /**
//    * Unified buffer control logic with aggressive slowdown
//    */
//   const shouldFetchSegment = useCallback(
//     (
//       mediaType: "video" | "audio",
//       videoSb: SourceBuffer | null,
//       audioSb: SourceBuffer | null,
//       currentTime: number,
//       isEmergency: boolean = false
//     ): {
//       shouldFetch: boolean;
//       delay: number;
//       reason: string;
//       segmentsToFetch?: number;
//     } => {
//       // Update current buffer state
//       const { videoBufferAhead, audioBufferAhead, combinedBufferAhead } =
//         updateBufferState(videoSb, audioSb, currentTime);

//       const bufferAhead =
//         mediaType === "video" ? videoBufferAhead : audioBufferAhead;
//       const state = bufferStateRef.current[mediaType];

//       // Emergency mode - always fetch immediately
//       if (isEmergency || combinedBufferAhead < BUFFER_EMERGENCY_THRESHOLD) {
//         return {
//           shouldFetch: true,
//           delay: 0,
//           segmentsToFetch: mediaType === "video" ? 4 : 3,
//           reason: `🚨 Emergency: Combined=${combinedBufferAhead.toFixed(
//             1
//           )}s, ${mediaType}=${bufferAhead.toFixed(1)}s`,
//         };
//       }

//       // Check if we're already at max buffer
//       if (combinedBufferAhead >= MAX_BUFFER_LEVEL) {
//         return {
//           shouldFetch: false,
//           delay: 15000, // Wait 15 seconds
//           reason: `⛔ Max buffer: ${combinedBufferAhead.toFixed(1)}s`,
//         };
//       }

//       // Check if the other track is lagging significantly (more than 10 seconds)
//       const otherBufferAhead =
//         mediaType === "video" ? audioBufferAhead : videoBufferAhead;
//       const bufferImbalance = Math.abs(videoBufferAhead - audioBufferAhead);

//       // If other track is significantly behind, prioritize it
//       if (bufferImbalance > 10 && otherBufferAhead < combinedBufferAhead) {
//         const otherMediaType = mediaType === "video" ? "audio" : "video";
//         return {
//           shouldFetch: false,
//           delay: 100,
//           segmentsToFetch: 1,
//           reason: `⚖️ Prioritizing ${otherMediaType}: Imbalance=${bufferImbalance.toFixed(
//             1
//           )}s`,
//         };
//       }

//       // Calculate delay based on COMBINED buffer level with exponential slowdown
//       const { delay, segmentsToFetch } = calculateExponentialSlowdown(
//         combinedBufferAhead,
//         TARGET_BUFFER_LEVEL,
//         MAX_BUFFER_LEVEL,
//         mediaType
//       );

//       // Check if we're currently fetching
//       if (state.isFetching) {
//         return {
//           shouldFetch: false,
//           delay: delay,
//           reason: "⏳ Already fetching",
//         };
//       }

//       // Check throttling - have enough time passed since last fetch?
//       const timeSinceLastFetch = Date.now() - state.lastFetchTime;

//       if (timeSinceLastFetch < delay) {
//         const remainingDelay = delay - timeSinceLastFetch;
//         return {
//           shouldFetch: false,
//           delay: remainingDelay,
//           reason: `⏱️ Throttled: ${(remainingDelay / 1000).toFixed(
//             1
//           )}s remaining (Buffer: ${combinedBufferAhead.toFixed(1)}s)`,
//         };
//       }

//       // Determine reason based on buffer level
//       let reason = "";
//       if (combinedBufferAhead < 15) {
//         reason = `⚡ Fast fetch: Low buffer (${combinedBufferAhead.toFixed(
//           1
//         )}s)`;
//       } else if (combinedBufferAhead < TARGET_BUFFER_LEVEL * 0.5) {
//         reason = `🏃 Moderate fetch: Buffer building (${combinedBufferAhead.toFixed(
//           1
//         )}s)`;
//       } else if (combinedBufferAhead < TARGET_BUFFER_LEVEL) {
//         reason = `🚶 Slowing down: Approaching target (${combinedBufferAhead.toFixed(
//           1
//         )}s)`;
//       } else {
//         reason = `🐌 Maintenance: Above target (${combinedBufferAhead.toFixed(
//           1
//         )}s)`;
//       }

//       return {
//         shouldFetch: true,
//         delay: 0,
//         segmentsToFetch,
//         reason: `${reason} | V:${videoBufferAhead.toFixed(
//           1
//         )}s A:${audioBufferAhead.toFixed(1)}s`,
//       };
//     },
//     [updateBufferState, calculateExponentialSlowdown]
//   );

//   /**
//    * Visual representation of buffer states for debugging
//    */
//   const getBufferVisualization = useCallback((bufferLevel: number): string => {
//     const maxBars = 30;
//     const filledBars = Math.min(
//       Math.floor((bufferLevel / MAX_BUFFER_LEVEL) * maxBars),
//       maxBars
//     );
//     const emptyBars = maxBars - filledBars;

//     let color = "🟢"; // Green
//     if (bufferLevel < BUFFER_EMERGENCY_THRESHOLD) color = "🔴"; // Red
//     else if (bufferLevel < TARGET_BUFFER_LEVEL * 0.5) color = "🟡"; // Yellow
//     else if (bufferLevel < TARGET_BUFFER_LEVEL) color = "🟠"; // Orange
//     else color = "🟢"; // Green

//     return `${color} ${"█".repeat(filledBars)}${"░".repeat(
//       emptyBars
//     )} ${bufferLevel.toFixed(1)}s`;
//   }, []);

//   /**
//    * Debug logging for buffer states
//    */
//   const logBufferState = useCallback(
//     (
//       mediaType: "video" | "audio",
//       shouldFetch: boolean,
//       delay: number,
//       reason: string,
//       videoBufferAhead: number,
//       audioBufferAhead: number
//     ) => {
//       const now = Date.now();
//       const state = bufferStateRef.current[mediaType];

//       // Only log every 2 seconds to avoid console spam
//       if (now - state.lastFetchTime > 2000 || shouldFetch) {
//         console.log(
//           `[BufferControl] ${mediaType.toUpperCase()}: ${
//             shouldFetch ? "✅ FETCH" : "⏸️ PAUSE"
//           }`
//         );
//         console.log(`  ${getBufferVisualization(videoBufferAhead)} (Video)`);
//         console.log(`  ${getBufferVisualization(audioBufferAhead)} (Audio)`);
//         console.log(`  Delay: ${delay}ms | ${reason}`);
//         console.log(`  Time since last fetch: ${now - state.lastFetchTime}ms`);
//         console.log(`  Currently fetching: ${state.isFetching}`);
//         console.log("---");
//       }
//     },
//     [getBufferVisualization]
//   );

//   const markFetchStart = useCallback((mediaType: "video" | "audio") => {
//     const now = Date.now();
//     bufferStateRef.current[mediaType].isFetching = true;
//     bufferStateRef.current[mediaType].lastFetchTime = now;

//     // Log the start
//     console.log(
//       `[BufferControl] 🚀 ${mediaType.toUpperCase()} fetch started at ${now}`
//     );
//   }, []);

//   const markFetchEnd = useCallback((mediaType: "video" | "audio") => {
//     bufferStateRef.current[mediaType].isFetching = false;
//     console.log(
//       `[BufferControl] ✅ ${mediaType.toUpperCase()} fetch completed`
//     );
//   }, []);

//   const cancelScheduledFetch = useCallback((mediaType: "video" | "audio") => {
//     if (bufferStateRef.current[mediaType].scheduledFetch) {
//       clearTimeout(bufferStateRef.current[mediaType].scheduledFetch);
//       bufferStateRef.current[mediaType].scheduledFetch = null;
//       console.log(`[BufferControl] ❌ Cancelled scheduled ${mediaType} fetch`);
//     }
//   }, []);

//   const scheduleNextFetch = useCallback(
//     (mediaType: "video" | "audio", delay: number, callback: () => void) => {
//       cancelScheduledFetch(mediaType);

//       if (delay <= 0) {
//         callback();
//         return;
//       }

//       bufferStateRef.current[mediaType].scheduledFetch = window.setTimeout(
//         () => {
//           bufferStateRef.current[mediaType].scheduledFetch = null;
//           console.log(
//             `[BufferControl] ⏰ Scheduled ${mediaType} fetch triggered after ${delay}ms`
//           );
//           callback();
//         },
//         delay
//       );
//     },
//     [cancelScheduledFetch]
//   );

//   // Get current buffer state for debugging/UI
//   const getBufferState = useCallback(
//     () => ({
//       video: bufferStateRef.current.video,
//       audio: bufferStateRef.current.audio,
//       lastUpdated: bufferStateRef.current.lastUpdated,
//     }),
//     []
//   );

//   return {
//     shouldFetchSegment,
//     markFetchStart,
//     markFetchEnd,
//     cancelScheduledFetch,
//     scheduleNextFetch,
//     getBufferState,
//     updateBufferState,
//     getBufferVisualization,
//     logBufferState,
//   };
// }


// hooks/useBufferControl.ts
import { useCallback, useRef } from "react";
import {
  TARGET_BUFFER_LEVEL,
  MAX_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
} from "@/constants/player.constants";

interface UnifiedBufferState {
  videoBufferAhead: number;
  audioBufferAhead: number;
  combinedBufferAhead: number;
  lastFetchTime: number;
  isFetching: boolean;
  scheduledFetch: number | null;
  isInStallRecovery: boolean;
  lastStallTime: number;
}

export function useBufferControl() {
  const bufferStateRef = useRef<{
    video: UnifiedBufferState;
    audio: UnifiedBufferState;
    lastUpdated: number;
    isGlobalStall: boolean;
    stallRecoveryStart: number | null;
  }>({
    video: {
      videoBufferAhead: 0,
      audioBufferAhead: 0,
      combinedBufferAhead: 0,
      lastFetchTime: 0,
      isFetching: false,
      scheduledFetch: null,
      isInStallRecovery: false,
      lastStallTime: 0,
    },
    audio: {
      videoBufferAhead: 0,
      audioBufferAhead: 0,
      combinedBufferAhead: 0,
      lastFetchTime: 0,
      isFetching: false,
      scheduledFetch: null,
      isInStallRecovery: false,
      lastStallTime: 0,
    },
    lastUpdated: 0,
    isGlobalStall: false,
    stallRecoveryStart: null,
  });

  // Track consecutive low buffer events for stall prediction
  const lowBufferHistoryRef = useRef<{
    timestamps: number[];
    counts: { [key: number]: number }; // Buffer level bucket counts
  }>({
    timestamps: [],
    counts: {},
  });

  /**
   * Update buffer state for both video and audio
   */
  const updateBufferState = useCallback((
    videoSb: SourceBuffer | null,
    audioSb: SourceBuffer | null,
    currentTime: number
  ): {
    videoBufferAhead: number;
    audioBufferAhead: number;
    combinedBufferAhead: number;
  } => {
    let videoBufferAhead = 0;
    let audioBufferAhead = 0;

    // Calculate video buffer
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

    // Calculate audio buffer
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

    // Combined buffer is limited by whichever is shorter
    const combinedBufferAhead = Math.min(videoBufferAhead, audioBufferAhead);

    // Update low buffer history for stall prediction
    const now = Date.now();
    const history = lowBufferHistoryRef.current;
    
    // Keep only events from last 10 seconds
    history.timestamps = history.timestamps.filter(ts => now - ts < 10000);
    
    // Track buffer level distribution
    const bucket = Math.floor(combinedBufferAhead);
    history.counts[bucket] = (history.counts[bucket] || 0) + 1;

    // Update both video and audio states with the same info
    bufferStateRef.current = {
      video: {
        ...bufferStateRef.current.video,
        videoBufferAhead,
        audioBufferAhead,
        combinedBufferAhead,
      },
      audio: {
        ...bufferStateRef.current.audio,
        videoBufferAhead,
        audioBufferAhead,
        combinedBufferAhead,
      },
      lastUpdated: now,
      isGlobalStall: combinedBufferAhead < 0.5 && now - (bufferStateRef.current.stallRecoveryStart || 0) > 1000,
      stallRecoveryStart: combinedBufferAhead < 0.5 && !bufferStateRef.current.stallRecoveryStart 
        ? now 
        : bufferStateRef.current.stallRecoveryStart,
    };

    return { videoBufferAhead, audioBufferAhead, combinedBufferAhead };
  }, []);

  /**
   * Predict if a stall is imminent based on buffer history
   */
  const predictImminentStall = useCallback((combinedBufferAhead: number): boolean => {
    const history = lowBufferHistoryRef.current;
    const now = Date.now();
    
    // Clear old history
    history.timestamps = history.timestamps.filter(ts => now - ts < 5000);
    
    // If buffer is already very low, stall is imminent
    if (combinedBufferAhead < BUFFER_EMERGENCY_THRESHOLD * 0.3) {
      return true;
    }
    
    // Count how many times buffer dropped below emergency threshold in last 5 seconds
    const recentLowBufferEvents = history.timestamps.filter(ts => now - ts < 5000);
    
    // If buffer is declining rapidly and we've had multiple low buffer events
    if (recentLowBufferEvents.length > 3 && combinedBufferAhead < BUFFER_EMERGENCY_THRESHOLD * 0.7) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Calculate exponential slowdown as buffer approaches target
   */
  const calculateExponentialSlowdown = useCallback((
    currentBuffer: number,
    targetBuffer: number,
    maxBuffer: number,
    mediaType: "video" | "audio",
    isStallPredicted: boolean = false,
    isLive: boolean = false
  ): { delay: number; segmentsToFetch: number } => {
    // 🔴 LIVE STRATEGY: Be conservative to maintain low latency
    if (isLive) {
      if (currentBuffer < 10) {
        return { delay: 0, segmentsToFetch: 1 };
      }
      return { delay: 1000, segmentsToFetch: 1 };
    }

    // 📺 VOD STRATEGY: From (5s delay, 5 segments) spread to (2s delay, 1 segment)
    if (isStallPredicted && currentBuffer < targetBuffer * 0.8) {
      return {
        delay: Math.max(0, 100 - (currentBuffer * 10)),
        segmentsToFetch: mediaType === "video" ? 3 : 2,
      };
    }

    if (currentBuffer < 5) {
      // Initial burst to start playback
      return { delay: 100, segmentsToFetch: mediaType === "video" ? 5 : 3 };
    }

    if (currentBuffer >= maxBuffer) {
      // At or above max buffer, stop fetching
      return { delay: 10000, segmentsToFetch: 0 };
    }

    // Linear interpolation between (5s, 5 segments) at 5s buffer 
    // and (2s, 1 segment) at max buffer
    const progress = Math.max(0, Math.min(1, (currentBuffer - 5) / (maxBuffer - 5)));
    
    const delay = Math.round(5000 - (progress * 3000));
    
    let segmentsToFetch = 1;
    if (mediaType === "video") {
      segmentsToFetch = Math.round(5 - (progress * 4));
    } else {
      segmentsToFetch = Math.round(3 - (progress * 2));
    }
    segmentsToFetch = Math.max(1, segmentsToFetch);

    return { delay, segmentsToFetch };
  }, []);

  /**
   * Unified buffer control logic with smart stall detection
   */
  const shouldFetchSegment = useCallback((
    mediaType: "video" | "audio",
    videoSb: SourceBuffer | null,
    audioSb: SourceBuffer | null,
    currentTime: number,
    isEmergency: boolean = false,
    isLive: boolean = false
  ): { 
    shouldFetch: boolean; 
    delay: number; 
    reason: string; 
    segmentsToFetch?: number;
    isPredictedStall?: boolean;
  } => {
    // Update current buffer state
    const { videoBufferAhead, audioBufferAhead, combinedBufferAhead } = 
      updateBufferState(videoSb, audioSb, currentTime);

    const bufferAhead = mediaType === "video" ? videoBufferAhead : audioBufferAhead;
    const state = bufferStateRef.current[mediaType];

    // ✅ SMART STALL DETECTION: Multiple levels of stall detection
    const now = Date.now();
    let stallReason = "";
    let isPredictedStall = false;
    let shouldFetchAggressively = false;

    // Level 1: TRUE STALL - No buffer at all
    if (combinedBufferAhead <= 0.1) {
      stallReason = `🚨 TRUE STALL: Buffer completely empty (Live: ${isLive})`;
      shouldFetchAggressively = true;
      bufferStateRef.current.isGlobalStall = true;
    }
    // Level 2: EMERGENCY STALL - Buffer critically low
    else if (combinedBufferAhead < BUFFER_EMERGENCY_THRESHOLD * 0.3) {
      stallReason = "🚨 CRITICAL STALL: Buffer < 1.5s";
      shouldFetchAggressively = true;
    }
    // Level 3: PREDICTED STALL - Based on buffer trends
    else if (predictImminentStall(combinedBufferAhead)) {
      stallReason = "⚠️ PREDICTED STALL: Buffer declining rapidly";
      shouldFetchAggressively = true;
      isPredictedStall = true;
    }
    // Level 4: BUFFER IMBALANCE STALL - One track lagging significantly
    else if (Math.abs(videoBufferAhead - audioBufferAhead) > 10) {
      const laggingTrack = videoBufferAhead < audioBufferAhead ? "video" : "audio";
      stallReason = `⚠️ IMBALANCE STALL: ${laggingTrack} lagging by ${Math.abs(videoBufferAhead - audioBufferAhead).toFixed(1)}s`;
      shouldFetchAggressively = mediaType === laggingTrack;
    }

    // If we're in any stall condition, handle it appropriately
    if (shouldFetchAggressively) {
      // Check if we're already handling this stall
      if (state.isInStallRecovery && now - state.lastStallTime < 3000) {
        return {
          shouldFetch: false,
          delay: 100,
          reason: `⏳ Stall recovery already in progress (${stallReason})`,
        };
      }

      // Mark that we're entering stall recovery
      bufferStateRef.current[mediaType].isInStallRecovery = true;
      bufferStateRef.current[mediaType].lastStallTime = now;

      // Determine segments to fetch based on stall severity
      let segmentsToFetch = mediaType === "video" ? 3 : 2;
      if (combinedBufferAhead <= 0.1) {
        segmentsToFetch = mediaType === "video" ? 4 : 3;
      }

      return {
        shouldFetch: true,
        delay: 0,
        segmentsToFetch,
        reason: stallReason,
        isPredictedStall,
      };
    }

    // Clear stall recovery flag if we're out of the stall
    if (state.isInStallRecovery && combinedBufferAhead > BUFFER_EMERGENCY_THRESHOLD) {
      bufferStateRef.current[mediaType].isInStallRecovery = false;
    }

    // Check if we're already at max buffer
    if (combinedBufferAhead >= MAX_BUFFER_LEVEL) {
      return {
        shouldFetch: false,
        delay: 15000,
        reason: `⛔ Max buffer reached: ${combinedBufferAhead.toFixed(1)}s`,
      };
    }

    // Check if the other track is lagging significantly (more than 10 seconds)
    const otherBufferAhead = mediaType === "video" ? audioBufferAhead : videoBufferAhead;
    const bufferImbalance = Math.abs(videoBufferAhead - audioBufferAhead);

    // If other track is significantly behind, prioritize it
    if (bufferImbalance > 10 && otherBufferAhead < combinedBufferAhead) {
      const otherMediaType = mediaType === "video" ? "audio" : "video";
      return {
        shouldFetch: false,
        delay: 100,
        reason: `⚖️ Prioritizing ${otherMediaType}: Imbalance=${bufferImbalance.toFixed(1)}s`,
      };
    }

    // Calculate delay based on COMBINED buffer level with exponential slowdown
    const isStallPredicted = predictImminentStall(combinedBufferAhead);
    const { delay, segmentsToFetch } = calculateExponentialSlowdown(
      combinedBufferAhead,
      TARGET_BUFFER_LEVEL,
      MAX_BUFFER_LEVEL,
      mediaType,
      isStallPredicted,
      isLive
    );

    // Check if we're currently fetching
    if (state.isFetching) {
      return {
        shouldFetch: false,
        delay: delay,
        reason: "⏳ Already fetching",
      };
    }

    // Check throttling - have enough time passed since last fetch?
    const timeSinceLastFetch = now - state.lastFetchTime;

    if (timeSinceLastFetch < delay) {
      const remainingDelay = delay - timeSinceLastFetch;
      return {
        shouldFetch: false,
        delay: remainingDelay,
        reason: `⏱️ Throttled: ${(remainingDelay / 1000).toFixed(1)}s remaining (Buffer: ${combinedBufferAhead.toFixed(1)}s)`,
      };
    }

    // Determine reason based on buffer level
    let reason = "";
    if (combinedBufferAhead < 15) {
      reason = `⚡ Fast fetch: Low buffer (${combinedBufferAhead.toFixed(1)}s)`;
    } else if (combinedBufferAhead < TARGET_BUFFER_LEVEL * 0.5) {
      reason = `🏃 Moderate fetch: Buffer building (${combinedBufferAhead.toFixed(1)}s)`;
    } else if (combinedBufferAhead < TARGET_BUFFER_LEVEL) {
      reason = `🚶 Slowing down: Approaching target (${combinedBufferAhead.toFixed(1)}s)`;
    } else {
      reason = `🐌 Maintenance: Above target (${combinedBufferAhead.toFixed(1)}s)`;
    }

    // Add stall prediction warning if applicable
    if (isStallPredicted) {
      reason = `⚠️ Stall predicted! ${reason}`;
    }

    return {
      shouldFetch: true,
      delay: 0,
      segmentsToFetch,
      reason: `${reason} | V:${videoBufferAhead.toFixed(1)}s A:${audioBufferAhead.toFixed(1)}s`,
      isPredictedStall,
    };
  }, [updateBufferState, predictImminentStall, calculateExponentialSlowdown]);

  /**
   * Check if we're currently in a stall recovery situation
   */
  const isInStallRecovery = useCallback((mediaType?: "video" | "audio"): boolean => {
    if (mediaType) {
      return bufferStateRef.current[mediaType].isInStallRecovery;
    }
    return bufferStateRef.current.isGlobalStall;
  }, []);

  /**
   * Manually trigger stall recovery mode
   */
  const triggerStallRecovery = useCallback((mediaType: "video" | "audio", severity: "low" | "critical" | "empty") => {
    const now = Date.now();
    bufferStateRef.current[mediaType].isInStallRecovery = true;
    bufferStateRef.current[mediaType].lastStallTime = now;
    
    if (severity === "empty") {
      bufferStateRef.current.isGlobalStall = true;
    }

    console.log(`[BufferControl] Manual stall recovery triggered for ${mediaType} (${severity})`);
  }, []);

  /**
   * Clear stall recovery flags
   */
  const clearStallRecovery = useCallback((mediaType?: "video" | "audio") => {
    if (mediaType) {
      bufferStateRef.current[mediaType].isInStallRecovery = false;
    } else {
      bufferStateRef.current.video.isInStallRecovery = false;
      bufferStateRef.current.audio.isInStallRecovery = false;
      bufferStateRef.current.isGlobalStall = false;
      bufferStateRef.current.stallRecoveryStart = null;
    }
    console.log(`[BufferControl] Stall recovery cleared for ${mediaType || "all"}`);
  }, []);

  /**
   * Visual representation of buffer states for debugging
   */
  const getBufferVisualization = useCallback((bufferLevel: number): string => {
    const maxBars = 30;
    const filledBars = Math.min(Math.floor((bufferLevel / MAX_BUFFER_LEVEL) * maxBars), maxBars);
    const emptyBars = maxBars - filledBars;
    
    let color = "🟢"; // Green
    if (bufferLevel < BUFFER_EMERGENCY_THRESHOLD * 0.3) color = "🔴"; // Red
    else if (bufferLevel < BUFFER_EMERGENCY_THRESHOLD) color = "🟠"; // Orange
    else if (bufferLevel < TARGET_BUFFER_LEVEL * 0.5) color = "🟡"; // Yellow
    else if (bufferLevel < TARGET_BUFFER_LEVEL) color = "🟢"; // Green
    else color = "🔵"; // Blue
    
    return `${color} ${"█".repeat(filledBars)}${"░".repeat(emptyBars)} ${bufferLevel.toFixed(1)}s`;
  }, []);

  const markFetchStart = useCallback((mediaType: "video" | "audio") => {
    const now = Date.now();
    bufferStateRef.current[mediaType].isFetching = true;
    bufferStateRef.current[mediaType].lastFetchTime = now;
    
    // Log the start
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BufferControl] 🚀 ${mediaType.toUpperCase()} fetch started at ${now}`);
    }
  }, []);

  const markFetchEnd = useCallback((mediaType: "video" | "audio") => {
    bufferStateRef.current[mediaType].isFetching = false;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BufferControl] ✅ ${mediaType.toUpperCase()} fetch completed`);
    }
  }, []);

  const cancelScheduledFetch = useCallback((mediaType: "video" | "audio") => {
    if (bufferStateRef.current[mediaType].scheduledFetch) {
      clearTimeout(bufferStateRef.current[mediaType].scheduledFetch);
      bufferStateRef.current[mediaType].scheduledFetch = null;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[BufferControl] ❌ Cancelled scheduled ${mediaType} fetch`);
      }
    }
  }, []);

  const scheduleNextFetch = useCallback(
    (mediaType: "video" | "audio", delay: number, callback: () => void) => {
      cancelScheduledFetch(mediaType);

      if (delay <= 0) {
        callback();
        return;
      }

      bufferStateRef.current[mediaType].scheduledFetch = window.setTimeout(() => {
        bufferStateRef.current[mediaType].scheduledFetch = null;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[BufferControl] ⏰ Scheduled ${mediaType} fetch triggered after ${delay}ms`);
        }
        callback();
      }, delay);
    },
    [cancelScheduledFetch]
  );

  // Get current buffer state for debugging/UI
  const getBufferState = useCallback(() => ({
    video: bufferStateRef.current.video,
    audio: bufferStateRef.current.audio,
    lastUpdated: bufferStateRef.current.lastUpdated,
    isGlobalStall: bufferStateRef.current.isGlobalStall,
    stallRecoveryStart: bufferStateRef.current.stallRecoveryStart,
    lowBufferHistory: lowBufferHistoryRef.current,
  }), []);

  return {
    shouldFetchSegment,
    markFetchStart,
    markFetchEnd,
    cancelScheduledFetch,
    scheduleNextFetch,
    getBufferState,
    updateBufferState,
    getBufferVisualization,
    isInStallRecovery,
    triggerStallRecovery,
    clearStallRecovery,
  };
}