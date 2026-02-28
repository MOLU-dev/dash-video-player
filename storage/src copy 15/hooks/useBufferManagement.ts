// import { useEffect, useCallback } from "react";
// import {
//   TARGET_BUFFER_LEVEL,
//   BUFFER_EMERGENCY_THRESHOLD,
//   BUFFER_KEEP_BEHIND,
// } from "../constants/player.constants";
// import { calculateEstimatedBufferEnd } from "../utils/bufferHelpers";
// import { removeBufferRange } from "../utils/bufferHelpers";
// import type {
//   Representation,
//   PendingAppend,
//   MediaType,
// } from "../types/player.types";

// interface UseBufferManagementProps {
//   videoRef: React.RefObject<HTMLVideoElement | null>;
//   videoRepRef: React.RefObject<Representation | null>;
//   audioRepRef: React.RefObject<Representation | null>;
//   videoSbRef: React.RefObject<SourceBuffer | null>;
//   audioSbRef: React.RefObject<SourceBuffer | null>;
//   videoFinishedRef: React.RefObject<boolean>;
//   audioFinishedRef: React.RefObject<boolean>;
//   videoNextSegRef: React.RefObject<number>;
//   audioNextSegRef: React.RefObject<number>;
//   mediaSourceRef: React.RefObject<MediaSource | null>;
//   mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
//   isOnlineRef: React.RefObject<boolean>;
//   isSeekingRef: React.RefObject<boolean>;
//   qualitySwitchInProgressRef: React.RefObject<boolean>;
//   videoFetchPausedRef: React.RefObject<boolean>;
//   audioFetchPausedRef: React.RefObject<boolean>;
//   isFetchingVideoRef: React.RefObject<boolean>;
//   isFetchingAudioRef: React.RefObject<boolean>;
//   videoQualityIdxRef: React.RefObject<number>;
//   pendingAppendsRef: React.RefObject<{
//     video: PendingAppend[];
//     audio: PendingAppend[];
//   }>;
//   setCurrentStats: React.Dispatch<React.SetStateAction<any>>;
//   fetchNextSegment: (
//     videoId: string,
//     rep: Representation,
//     mediaType: MediaType,
//     sb: SourceBuffer,
//     nextSegRef: React.RefObject<number>,
//     finishedRef: React.RefObject<boolean>,
//     isQualitySwitch?: boolean
//   ) => Promise<void>;
//   switchQuality: (newIdx: number) => Promise<void>;
//   enqueueOperation: (
//     mediaType: MediaType,
//     operation: () => Promise<void>
//   ) => void;
//   videoId: string;
//   isPausedRef: React.RefObject<boolean>;
//   shouldAllowQualitySwitch: (context?: string) => boolean;
//   currentQuality: string | number;
//   shouldFetchSegment: (
//     mediaType: "video" | "audio",
//     sb: SourceBuffer | null,
//     currentTime: number,
//     isEmergency?: boolean
//   ) => { shouldFetch: boolean; delay: number; reason: string };
//   scheduleNextFetch: (
//     mediaType: "video" | "audio",
//     delay: number,
//     callback: () => void
//   ) => void;
// }

// export function useBufferManagement({
//   videoRef,
//   videoRepRef,
//   audioRepRef,
//   videoSbRef,
//   audioSbRef,
//   videoFinishedRef,
//   audioFinishedRef,
//   videoNextSegRef,
//   audioNextSegRef,
//   mediaSourceRef,
//   mediaSourceStateRef,
//   isOnlineRef,
//   isSeekingRef,
//   qualitySwitchInProgressRef,
//   videoFetchPausedRef,
//   audioFetchPausedRef,
//   isFetchingVideoRef,
//   isFetchingAudioRef,
//   videoQualityIdxRef,
//   pendingAppendsRef,
//   setCurrentStats,
//   fetchNextSegment,
//   switchQuality,
//   enqueueOperation,
//   videoId,
//   isPausedRef,
//   shouldAllowQualitySwitch,
//   currentQuality,
//   shouldFetchSegment,
//   scheduleNextFetch,
// }: UseBufferManagementProps) {
//   const evictBuffer = useCallback(() => {
//     if (isPausedRef.current) {
//       return;
//     }

//     const videoEl = videoRef.current;
//     if (
//       !videoEl ||
//       !mediaSourceRef.current ||
//       mediaSourceStateRef.current !== "open"
//     )
//       return;

//     const currentTime = videoEl.currentTime;

//     const evictForMediaType = (
//       sb: SourceBuffer | null,
//       mediaType: MediaType
//     ) => {
//       if (!sb || sb.buffered.length === 0) return;

//       // Calculate the safe eviction point (keep BUFFER_KEEP_BEHIND seconds behind)
//       const keepBehindTime = Math.max(0, currentTime - BUFFER_KEEP_BEHIND);

//       // Find the earliest buffered range that needs eviction
//       let evictionStart = 0;
//       let evictionEnd = -1;

//       for (let i = 0; i < sb.buffered.length; i++) {
//         const rangeStart = sb.buffered.start(i);
//         const rangeEnd = sb.buffered.end(i);

//         // If this range ends before our keep-behind point, it can be removed entirely
//         if (rangeEnd < keepBehindTime) {
//           if (evictionEnd === -1) {
//             evictionStart = rangeStart;
//           }
//           evictionEnd = rangeEnd;
//         }
//         // If this range starts before keep-behind but extends past it,
//         // only remove the part before keep-behind
//         else if (rangeStart < keepBehindTime && rangeEnd >= keepBehindTime) {
//           if (evictionEnd === -1) {
//             evictionStart = rangeStart;
//           }
//           evictionEnd = keepBehindTime - 0.5; // Add small buffer for safety
//           break; // Don't check further ranges
//         }
//         // If range starts after keep-behind, we're done
//         else if (rangeStart >= keepBehindTime) {
//           break;
//         }
//       }

//       // Only evict if we found a valid range
//       if (evictionEnd > evictionStart) {
//         enqueueOperation(mediaType, async () => {
//           await removeBufferRange(sb, evictionStart, evictionEnd);
//         });
//       }
//     };

//     evictForMediaType(videoSbRef.current, "video");
//     evictForMediaType(audioSbRef.current, "audio");
//   }, [
//     videoRef,
//     videoSbRef,
//     audioSbRef,
//     mediaSourceRef,
//     mediaSourceStateRef,
//     enqueueOperation,
//     isPausedRef,
//   ]);

//   useEffect(() => {
//     const bufferMonitor = setInterval(() => {
//       if (isPausedRef.current) {
//         return;
//       }

//       if (!isOnlineRef.current || isSeekingRef.current) return;
//       if (qualitySwitchInProgressRef.current) return;

//       const videoEl = videoRef.current;
//       if (!videoEl || !videoEl.buffered || videoEl.buffered.length === 0)
//         return;

//       const currentTime = videoEl.currentTime;
//       const estimatedBufferEnd = calculateEstimatedBufferEnd(
//         videoEl,
//         videoRepRef.current,
//         audioRepRef.current,
//         pendingAppendsRef.current
//       );
//       const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

//       if (
//         currentQuality === "auto" &&
//         bufferGap < BUFFER_EMERGENCY_THRESHOLD &&
//         !qualitySwitchInProgressRef.current &&
//         !shouldAllowQualitySwitch
//       ) {
//         if (videoQualityIdxRef.current !== 0) {
//           switchQuality(0);
//         }
//       }

//       setCurrentStats((prev: any) => ({
//         ...prev,
//         buffer: Math.round(bufferGap * 10) / 10,
//       }));

//       // ✅ USE BUFFER CONTROL to check if we should fetch
//       const videoCheck = shouldFetchSegment(
//         "video",
//         videoSbRef.current,
//         currentTime
//       );
//       const audioCheck = shouldFetchSegment(
//         "audio",
//         audioSbRef.current,
//         currentTime
//       );

//       // Only fetch ONE segment at a time if buffer control allows it
//       if (
//         videoCheck.shouldFetch &&
//         !videoFinishedRef.current &&
//         videoRepRef.current &&
//         videoSbRef.current
//       ) {
//         if (videoCheck.delay === 0) {
//           fetchNextSegment(
//             videoId,
//             videoRepRef.current,
//             "video",
//             videoSbRef.current,
//             videoNextSegRef,
//             videoFinishedRef,
//             false
//           );
//         } else {
//           // Schedule the next fetch based on the delay
//           scheduleNextFetch("video", videoCheck.delay, () => {
//             if (!videoFinishedRef.current && videoRepRef.current && videoSbRef.current) {
//               fetchNextSegment(
//                 videoId,
//                 videoRepRef.current,
//                 "video",
//                 videoSbRef.current,
//                 videoNextSegRef,
//                 videoFinishedRef,
//                 false
//               );
//             }
//           });
//         }
//       }

//       if (
//         audioCheck.shouldFetch &&
//         !audioFinishedRef.current &&
//         audioRepRef.current &&
//         audioSbRef.current
//       ) {
//         if (audioCheck.delay === 0) {
//           fetchNextSegment(
//             videoId,
//             audioRepRef.current,
//             "audio",
//             audioSbRef.current,
//             audioNextSegRef,
//             audioFinishedRef,
//             false
//           );
//         } else {
//           scheduleNextFetch("audio", audioCheck.delay, () => {
//             if (!audioFinishedRef.current && audioRepRef.current && audioSbRef.current) {
//               fetchNextSegment(
//                 videoId,
//                 audioRepRef.current,
//                 "audio",
//                 audioSbRef.current,
//                 audioNextSegRef,
//                 audioFinishedRef,
//                 false
//               );
//             }
//           });
//         }
//       }
//     }, 2000); // Run less frequently - every 2s

//     return () => clearInterval(bufferMonitor);
//   }, [
//     videoId,
//     videoRef,
//     videoRepRef,
//     audioRepRef,
//     videoSbRef,
//     audioSbRef,
//     videoFinishedRef,
//     audioFinishedRef,
//     videoNextSegRef,
//     audioNextSegRef,
//     isOnlineRef,
//     isSeekingRef,
//     qualitySwitchInProgressRef,
//     videoFetchPausedRef,
//     audioFetchPausedRef,
//     isFetchingVideoRef,
//     isFetchingAudioRef,
//     videoQualityIdxRef,
//     pendingAppendsRef,
//     setCurrentStats,
//     fetchNextSegment,
//     switchQuality,
//     isPausedRef,
//     shouldAllowQualitySwitch,
//     currentQuality,
//     shouldFetchSegment,
//     scheduleNextFetch,
//   ]);

//   return { evictBuffer };
// }



// hooks/useBufferManagement.ts
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
  shouldFetchSegment: (
    mediaType: "video" | "audio",
    sb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean
  ) => { shouldFetch: boolean; delay: number; reason: string };
  scheduleNextFetch: (
    mediaType: "video" | "audio",
    delay: number,
    callback: () => void
  ) => void;
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

      // Handle quality switching based on buffer gap
      if (
        currentQuality === "auto" &&
        bufferGap < BUFFER_EMERGENCY_THRESHOLD &&
        !qualitySwitchInProgressRef.current &&
        shouldAllowQualitySwitch("buffer-low")
      ) {
        if (videoQualityIdxRef.current !== 0) {
          switchQuality(0);
        }
      }

      setCurrentStats((prev: any) => ({
        ...prev,
        buffer: Math.round(bufferGap * 10) / 10,
      }));

      // ✅ CRITICAL: We still need to trigger fetching when buffer is low
      // This ensures we don't stall when buffer control might be delayed
      const bufferCheckVideo = shouldFetchSegment(
        "video",
        videoSbRef.current,
        currentTime,
        bufferGap < BUFFER_EMERGENCY_THRESHOLD
      );

      const bufferCheckAudio = shouldFetchSegment(
        "audio",
        audioSbRef.current,
        currentTime,
        bufferGap < BUFFER_EMERGENCY_THRESHOLD
      );

      // Trigger immediate fetch if buffer is low and we're not already fetching
      if (
        bufferCheckVideo.shouldFetch &&
        bufferCheckVideo.delay === 0 &&
        !videoFinishedRef.current &&
        videoRepRef.current &&
        videoSbRef.current &&
        !isFetchingVideoRef.current
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
      } else if (bufferCheckVideo.delay > 0) {
        // Schedule next fetch based on buffer control delay
        scheduleNextFetch("video", bufferCheckVideo.delay, () => {
          if (
            !videoFinishedRef.current &&
            videoRepRef.current &&
            videoSbRef.current &&
            !isFetchingVideoRef.current
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
      } else if (bufferCheckAudio.delay > 0) {
        scheduleNextFetch("audio", bufferCheckAudio.delay, () => {
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
        });
      }
    }, 2500); // Check every second for buffer level

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
  ]);

  return { evictBuffer };
}