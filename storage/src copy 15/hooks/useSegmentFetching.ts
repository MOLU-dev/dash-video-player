// import { useCallback } from "react";
// import type {
//   Representation,
//   MediaType,
//   OperationQueue,
//   PendingAppend,
// } from "../types/player.types";
// import { fetchSegment } from "../services/segmentFetcher";
// import { appendBufferSafely } from "../utils/bufferHelpers";
// import { getSegmentCache } from "@/lib/segmentCache";

// import {
//   TARGET_BUFFER_LEVEL,
//   MAX_BUFFER_LEVEL,
//   BUFFER_EMERGENCY_THRESHOLD,
// } from "../constants/player.constants";

// interface UseSegmentFetchingProps {
//   videoId: string;
//   videoRef: React.RefObject<HTMLVideoElement | null>;
//   mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
//   isOnlineRef: React.RefObject<boolean>;
//   isFetchingVideoRef: React.RefObject<boolean>;
//   isFetchingAudioRef: React.RefObject<boolean>;
//   videoFetchPausedRef: React.RefObject<boolean>;
//   audioFetchPausedRef: React.RefObject<boolean>;
//   isDownloadingRef: React.RefObject<boolean>;
//   isPausedRef: React.RefObject<boolean>;
//   abortControllersRef: React.RefObject<{
//     video: AbortController[];
//     audio: AbortController[];
//   }>;
//   lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
//   currentBufferEndRef: React.RefObject<number>;
//   lastVideoFetchTimeRef: React.RefObject<number>;
//   lastAudioFetchTimeRef: React.RefObject<number>;
//   pendingSegmentOperationsRef: React.RefObject<
//     Map<number, { repId: string; mediaType: string }>
//   >;
//   segmentOperationIdRef: React.RefObject<number>;
//   activeSegmentRequestsRef: React.RefObject<Map<number, any>>;
//   segmentRequestIdRef: React.RefObject<number>;
//   pendingAppendsRef: React.RefObject<{
//     video: PendingAppend[];
//     audio: PendingAppend[];
//   }>;
//   throughputEMARef: React.RefObject<number>;
//   operationQueuesRef: React.RefObject<OperationQueue>;
//   validateSegmentCompatibility: (
//     repId: string,
//     mediaType: string,
//     segmentNumber?: number
//   ) => boolean;
//   enqueueOperation: (
//     mediaType: MediaType,
//     operation: () => Promise<void>
//   ) => void;
//   updateThroughputMeasurement: (
//     bytes: number,
//     durationMs: number,
//     mediaType: MediaType
//   ) => void;
//   calculateEstimatedBufferEnd: () => number;
//   tryEndStream: () => void;
//   shouldStopDownloadingRef: React.RefObject<boolean>;
//   shouldFetchSegment: (
//     mediaType: "video" | "audio",
//     sb: SourceBuffer | null,
//     currentTime: number,
//     isEmergency?: boolean
//   ) => { shouldFetch: boolean; delay: number; reason: string };
//   markFetchStart: (mediaType: MediaType) => void;
//   markFetchEnd: (mediaType: MediaType) => void;
//   scheduleNextFetch: (
//     mediaType: MediaType,
//     delay: number,
//     callback: () => void
//   ) => void;
// }

// export function useSegmentFetching({
//   videoId,
//   videoRef,
//   mediaSourceStateRef,
//   isOnlineRef,
//   isFetchingVideoRef,
//   isFetchingAudioRef,
//   videoFetchPausedRef,
//   audioFetchPausedRef,
//   abortControllersRef,
//   lastProcessedSegmentsRef,
//   currentBufferEndRef,
//   lastVideoFetchTimeRef,
//   lastAudioFetchTimeRef,
//   pendingSegmentOperationsRef,
//   segmentOperationIdRef,
//   activeSegmentRequestsRef,
//   segmentRequestIdRef,
//   pendingAppendsRef,
//   throughputEMARef,
//   operationQueuesRef,
//   validateSegmentCompatibility,
//   enqueueOperation,
//   updateThroughputMeasurement,
//   calculateEstimatedBufferEnd,
//   tryEndStream,
//   isDownloadingRef,
//   isPausedRef,
//   shouldStopDownloadingRef,
//   shouldFetchSegment,
//   markFetchStart,
//   markFetchEnd,
//   scheduleNextFetch,
// }: UseSegmentFetchingProps) {
//   const segmentCache = getSegmentCache();

//   const fetchAndAppend = useCallback(
//     async (
//       rep: Representation,
//       segmentNumber: number,
//       mediaType: MediaType,
//       sb: SourceBuffer,
//       signal?: AbortSignal
//     ): Promise<void> => {
//       return new Promise((resolve, reject) => {
//         if (signal?.aborted) {
//           return reject(new DOMException("Aborted", "AbortError"));
//         }
//         if (!isOnlineRef.current) return resolve();

//         const operationId = segmentOperationIdRef.current++;
//         const requestId = segmentRequestIdRef.current++;

//         pendingSegmentOperationsRef.current.set(operationId, {
//           repId: rep.id,
//           mediaType,
//         });

//         // ✅ CHECK CACHE FIRST
//         const cachedData = segmentCache.get(
//           videoId,
//           mediaType,
//           rep.id,
//           segmentNumber
//         );

//         if (cachedData) {
//           // Validate compatibility
//           const operationInfo =
//             pendingSegmentOperationsRef.current.get(operationId);
//           if (
//             !operationInfo ||
//             !validateSegmentCompatibility(
//               operationInfo.repId,
//               operationInfo.mediaType,
//               segmentNumber
//             )
//           ) {
//             pendingSegmentOperationsRef.current.delete(operationId);
//             return resolve();
//           }

//           // Update throughput with cached data (simulate instant fetch)
//           if (mediaType === "video") {
//             updateThroughputMeasurement(cachedData.byteLength, 1, mediaType);
//           }

//           // Append cached data to buffer
//           enqueueOperation(mediaType, () => {
//             if (
//               !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
//             ) {
//               return Promise.resolve();
//             }

//             return appendBufferSafely(
//               sb,
//               cachedData,
//               signal,
//               segmentNumber,
//               mediaType,
//               pendingAppendsRef.current
//             )
//               .then(() => {
//                 lastProcessedSegmentsRef.current.set(rep.id, segmentNumber);

//                 const segmentDuration = rep.segmentDur / rep.timescale;
//                 currentBufferEndRef.current = Math.max(
//                   currentBufferEndRef.current,
//                   (segmentNumber - rep.startNumber + 1) * segmentDuration
//                 );
//               })
//               .catch((error) => {
//                 if (error.name === "AbortError") {
//                   // append aborted
//                 } else {
//                   console.error(
//                     `Error appending cached segment ${segmentNumber}:`,
//                     error
//                   );
//                 }
//               });
//           });

//           pendingSegmentOperationsRef.current.delete(operationId);
//           return resolve();
//         }

//         // ❌ CACHE MISS - Fetch from network
//         const startTime = performance.now();
//         let firstByteTime = 0;

//         const requestController = new AbortController();

//         activeSegmentRequestsRef.current.set(requestId, {
//           controller: requestController,
//           mediaType,
//           repId: rep.id,
//         });

//         const onAbort = () => {
//           activeSegmentRequestsRef.current.delete(requestId);
//           pendingSegmentOperationsRef.current.delete(operationId);
//           reject(new DOMException("Aborted", "AbortError"));
//         };

//         const combinedAbortHandler = () => {
//           onAbort();
//         };

//         if (signal) {
//           signal.addEventListener("abort", combinedAbortHandler);
//         }
//         requestController.signal.addEventListener(
//           "abort",
//           combinedAbortHandler
//         );

//         let totalBytes = 0;

//         fetchSegment({
//           videoId,
//           rep,
//           segmentNumber,
//           mediaType,
//           signal: requestController.signal,
//           onProgress: (bytes) => {
//             if (firstByteTime === 0) {
//               firstByteTime = performance.now();
//             }
//             totalBytes = bytes;
//           },
//         })
//           .then((data) => {
//             const durationMs = performance.now() - startTime;

//             if (signal) {
//               signal.removeEventListener("abort", combinedAbortHandler);
//             }
//             requestController.signal.removeEventListener(
//               "abort",
//               combinedAbortHandler
//             );

//             activeSegmentRequestsRef.current.delete(requestId);

//             if (signal?.aborted || requestController.signal.aborted) {
//               pendingSegmentOperationsRef.current.delete(operationId);
//               return reject(new DOMException("Aborted", "AbortError"));
//             }

//             // ✅ CACHE THE FETCHED DATA
//             segmentCache.set(videoId, mediaType, rep.id, segmentNumber, data);

//             const operationInfo =
//               pendingSegmentOperationsRef.current.get(operationId);
//             if (
//               !operationInfo ||
//               !validateSegmentCompatibility(
//                 operationInfo.repId,
//                 operationInfo.mediaType,
//                 segmentNumber
//               )
//             ) {
//               pendingSegmentOperationsRef.current.delete(operationId);
//               return resolve();
//             }

//             if (mediaType === "video") {
//               updateThroughputMeasurement(
//                 data.byteLength,
//                 durationMs,
//                 mediaType
//               );
//             }

//             enqueueOperation(mediaType, () => {
//               if (
//                 !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
//               ) {
//                 return Promise.resolve();
//               }

//               return appendBufferSafely(
//                 sb,
//                 data,
//                 requestController.signal,
//                 segmentNumber,
//                 mediaType,
//                 pendingAppendsRef.current
//               )
//                 .then(() => {
//                   lastProcessedSegmentsRef.current.set(rep.id, segmentNumber);

//                   const segmentDuration = rep.segmentDur / rep.timescale;
//                   currentBufferEndRef.current = Math.max(
//                     currentBufferEndRef.current,
//                     (segmentNumber - rep.startNumber + 1) * segmentDuration
//                   );
//                 })
//                 .catch((error) => {
//                   if (error.name === "AbortError") {
//                     // append aborted
//                   } else {
//                     console.error(
//                       `Error appending segment ${segmentNumber}:`,
//                       error
//                     );
//                   }
//                 });
//             });

//             pendingSegmentOperationsRef.current.delete(operationId);
//             resolve();
//           })
//           .catch((error) => {
//             if (signal) {
//               signal.removeEventListener("abort", combinedAbortHandler);
//             }
//             requestController.signal.removeEventListener(
//               "abort",
//               combinedAbortHandler
//             );

//             activeSegmentRequestsRef.current.delete(requestId);
//             pendingSegmentOperationsRef.current.delete(operationId);

//             if (signal?.aborted || requestController.signal.aborted) {
//               return reject(new DOMException("Aborted", "AbortError"));
//             }

//             console.error(`Error fetching segment ${segmentNumber}:`, error);
//             resolve();
//           });
//       });
//     },
//     [
//       videoId,
//       segmentCache,
//       isOnlineRef,
//       segmentOperationIdRef,
//       segmentRequestIdRef,
//       pendingSegmentOperationsRef,
//       activeSegmentRequestsRef,
//       lastProcessedSegmentsRef,
//       currentBufferEndRef,
//       pendingAppendsRef,
//       validateSegmentCompatibility,
//       enqueueOperation,
//       updateThroughputMeasurement,
//     ]
//   );

//   const fetchNextSegment = useCallback(
//     async (
//       videoId: string,
//       rep: Representation,
//       mediaType: MediaType,
//       sb: SourceBuffer,
//       nextSegRef: React.RefObject<number>,
//       finishedRef: React.RefObject<boolean>,
//       isQualitySwitch: boolean = false
//     ) => {
//       // CRITICAL: Check if we should stop downloading
//       if (finishedRef.current) {
//         return;
//       }

//       if (isPausedRef.current && !isQualitySwitch) {
//         return;
//       }

//       if (!isQualitySwitch && isPausedRef.current) {
//         return;
//       }

//       if (!isOnlineRef.current) {
//         return;
//       }

//       if (
//         (mediaType === "video" && videoFetchPausedRef.current) ||
//         (mediaType === "audio" && audioFetchPausedRef.current)
//       ) {
//         return;
//       }

//       if (mediaSourceStateRef.current !== "open") return;
//       if (mediaType === "video" && isFetchingVideoRef.current) return;
//       if (mediaType === "audio" && isFetchingAudioRef.current) return;

//       const videoEl = videoRef.current;

//       // ✅ CHECK BUFFER CONTROL FIRST (except for quality switches)
//       if (videoEl && !isQualitySwitch) {
//         const bufferCheck = shouldFetchSegment(
//           mediaType,
//           sb,
//           videoEl.currentTime,
//           isQualitySwitch
//         );

//         if (!bufferCheck.shouldFetch) {
//           // Schedule next check if we have a delay
//           if (bufferCheck.delay > 0) {
//             scheduleNextFetch(mediaType, bufferCheck.delay, () => {
//               fetchNextSegment(
//                 videoId,
//                 rep,
//                 mediaType,
//                 sb,
//                 nextSegRef,
//                 finishedRef,
//                 false
//               );
//             });
//           }

//           return;
//         }
//       }

//       // Check max buffer limit
//       if (videoEl) {
//         const estimatedBufferEnd = calculateEstimatedBufferEnd();
//         const bufferGap = estimatedBufferEnd - videoEl.currentTime;

//         const maxBuffer = isQualitySwitch
//           ? MAX_BUFFER_LEVEL * 1.5
//           : MAX_BUFFER_LEVEL;

//         if (bufferGap >= maxBuffer) {
//           if (mediaType === "video") {
//             isFetchingVideoRef.current = false;
//           } else {
//             isFetchingAudioRef.current = false;
//           }
//           return;
//         }
//       }

//       // Mark fetch start for buffer control
//       markFetchStart(mediaType);

//       if (mediaType === "video") {
//         isFetchingVideoRef.current = true;
//         isDownloadingRef.current = true;
//       } else {
//         isFetchingAudioRef.current = true;
//       }

//       const controller = new AbortController();
//       if (mediaType === "video") {
//         abortControllersRef.current.video.push(controller);
//       } else {
//         abortControllersRef.current.audio.push(controller);
//       }

//       try {
//         // ✅ FETCH ONLY ONE SEGMENT AT A TIME
//         const segNum = nextSegRef.current;

//         if (segNum > rep.startNumber + rep.totalSegments - 1) {
//           finishedRef.current = true;
//           // No need to continue if we've finished
//           return;
//         }

//         // Fetch and append the single segment
//         await fetchAndAppend(rep, segNum, mediaType, sb, controller.signal);

//         // Increment to next segment
//         nextSegRef.current++;
//         lastProcessedSegmentsRef.current.set(rep.id, segNum);

//         if (isQualitySwitch) {
//           await new Promise((resolve) => setTimeout(resolve, 30));
//         }

//         if (mediaType === "video") {
//           lastVideoFetchTimeRef.current = Date.now();
//         } else {
//           lastAudioFetchTimeRef.current = Date.now();
//         }

//         // ✅ Schedule next fetch using buffer control
//         if (
//           !finishedRef.current &&
//           !videoFetchPausedRef.current &&
//           !audioFetchPausedRef.current &&
//           !isPausedRef.current &&
//           isOnlineRef.current &&
//           videoEl
//         ) {
//           const bufferCheck = shouldFetchSegment(
//             mediaType,
//             sb,
//             videoEl.currentTime,
//             false
//           );

//           if (bufferCheck.shouldFetch && bufferCheck.delay === 0) {
//             // If we can fetch immediately, do it right away
//             fetchNextSegment(
//               videoId,
//               rep,
//               mediaType,
//               sb,
//               nextSegRef,
//               finishedRef,
//               false
//             );
//           } else if (bufferCheck.delay > 0) {
//             // Schedule based on buffer control delay
//             scheduleNextFetch(mediaType, bufferCheck.delay, () => {
//               fetchNextSegment(
//                 videoId,
//                 rep,
//                 mediaType,
//                 sb,
//                 nextSegRef,
//                 finishedRef,
//                 false
//               );
//             });
//           }
//           // If delay is 0 and shouldn't fetch, we do nothing
//         }
//       } catch (err: any) {
//         if (err.name !== "AbortError") {
//           // Retry logic - but respect pause/offline state
//           setTimeout(() => {
//             if (
//               !operationQueuesRef.current[`${mediaType}Processing`] &&
//               !finishedRef.current &&
//               !isPausedRef.current &&
//               isOnlineRef.current
//             ) {
//               fetchNextSegment(
//                 videoId,
//                 rep,
//                 mediaType,
//                 sb,
//                 nextSegRef,
//                 finishedRef,
//                 isQualitySwitch
//               );
//             }
//           }, 1000);
//         }
//       } finally {
//         const targetArray =
//           mediaType === "video"
//             ? abortControllersRef.current.video
//             : abortControllersRef.current.audio;

//         const idx = targetArray.indexOf(controller);
//         if (idx !== -1) targetArray.splice(idx, 1);

//         if (mediaType === "video") {
//           isFetchingVideoRef.current = false;
//           isDownloadingRef.current = false;
//         } else {
//           isFetchingAudioRef.current = false;
//         }

//         // Mark fetch end for buffer control
//         markFetchEnd(mediaType);
//       }

//       if (nextSegRef.current > rep.startNumber + rep.totalSegments - 1) {
//         finishedRef.current = true;
//       }
//     },
//     [
//       videoRef,
//       mediaSourceStateRef,
//       isOnlineRef,
//       isFetchingVideoRef,
//       isFetchingAudioRef,
//       videoFetchPausedRef,
//       audioFetchPausedRef,
//       abortControllersRef,
//       lastProcessedSegmentsRef,
//       lastVideoFetchTimeRef,
//       lastAudioFetchTimeRef,
//       operationQueuesRef,
//       fetchAndAppend,
//       calculateEstimatedBufferEnd,
//       shouldFetchSegment,
//       scheduleNextFetch,
//       markFetchStart,
//       markFetchEnd,
//       isPausedRef,
//       shouldStopDownloadingRef,
//     ]
//   );

//   const cancelAllSegmentRequests = useCallback(
//     (mediaType?: MediaType, specificRepId?: string) => {
//       const requestsToCancel: number[] = [];

//       activeSegmentRequestsRef.current.forEach(
//         (request: any, requestId: number) => {
//           const shouldCancel =
//             (!mediaType || request.mediaType === mediaType) &&
//             (!specificRepId || request.repId === specificRepId);

//           if (shouldCancel) {
//             requestsToCancel.push(requestId);
//           }
//         }
//       );

//       requestsToCancel.forEach((requestId) => {
//         const request = activeSegmentRequestsRef.current.get(requestId);
//         if (request) {
//           try {
//             request.controller.abort();
//             if (request.call) {
//               request.call.cancel();
//             }
//           } catch (error) {
//             // Error canceling request
//           }
//           activeSegmentRequestsRef.current.delete(requestId);
//         }
//       });
//     },
//     [activeSegmentRequestsRef]
//   );

//   const completeOngoingSegmentOperations = useCallback(
//     async (mediaType: MediaType): Promise<void> => {
//       return new Promise((resolve) => {
//         const queue = operationQueuesRef.current;
//         const targetQueue = mediaType === "video" ? queue.video : queue.audio;

//         if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
//           resolve();
//           return;
//         }

//         const checkInterval = setInterval(() => {
//           if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
//             clearInterval(checkInterval);
//             resolve();
//           }
//         }, 50);
//       });
//     },
//     [operationQueuesRef]
//   );

//   return {
//     fetchNextSegment,
//     fetchAndAppend,
//     cancelAllSegmentRequests,
//     completeOngoingSegmentOperations,
//   };
// }


// hooks/useSegmentFetching.ts
import { useCallback } from "react";
import type {
  Representation,
  MediaType,
  OperationQueue,
  PendingAppend,
} from "../types/player.types";
import { fetchSegment } from "../services/segmentFetcher";
import { appendBufferSafely } from "../utils/bufferHelpers";
import { getSegmentCache } from "@/lib/segmentCache";
import {
  TARGET_BUFFER_LEVEL,
  MAX_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
} from "../constants/player.constants";

interface UseSegmentFetchingProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  isOnlineRef: React.RefObject<boolean>;
  isFetchingVideoRef: React.RefObject<boolean>;
  isFetchingAudioRef: React.RefObject<boolean>;
  videoFetchPausedRef: React.RefObject<boolean>;
  audioFetchPausedRef: React.RefObject<boolean>;
  isDownloadingRef: React.RefObject<boolean>;
  isPausedRef: React.RefObject<boolean>;
  abortControllersRef: React.RefObject<{
    video: AbortController[];
    audio: AbortController[];
  }>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  currentBufferEndRef: React.RefObject<number>;
  lastVideoFetchTimeRef: React.RefObject<number>;
  lastAudioFetchTimeRef: React.RefObject<number>;
  pendingSegmentOperationsRef: React.RefObject<
    Map<number, { repId: string; mediaType: string }>
  >;
  segmentOperationIdRef: React.RefObject<number>;
  activeSegmentRequestsRef: React.RefObject<Map<number, any>>;
  segmentRequestIdRef: React.RefObject<number>;
  pendingAppendsRef: React.RefObject<{
    video: PendingAppend[];
    audio: PendingAppend[];
  }>;
  throughputEMARef: React.RefObject<number>;
  operationQueuesRef: React.RefObject<OperationQueue>;
  validateSegmentCompatibility: (
    repId: string,
    mediaType: string,
    segmentNumber?: number
  ) => boolean;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  updateThroughputMeasurement: (
    bytes: number,
    durationMs: number,
    mediaType: MediaType
  ) => void;
  calculateEstimatedBufferEnd: () => number;
  tryEndStream: () => void;
  shouldStopDownloadingRef: React.RefObject<boolean>;
  shouldFetchSegment: (
    mediaType: "video" | "audio",
    sb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean
  ) => { shouldFetch: boolean; delay: number; reason: string };
  markFetchStart: (mediaType: MediaType) => void;
  markFetchEnd: (mediaType: MediaType) => void;
  scheduleNextFetch: (
    mediaType: MediaType,
    delay: number,
    callback: () => void
  ) => void;
}

export function useSegmentFetching({
  videoId,
  videoRef,
  mediaSourceStateRef,
  isOnlineRef,
  isFetchingVideoRef,
  isFetchingAudioRef,
  videoFetchPausedRef,
  audioFetchPausedRef,
  abortControllersRef,
  lastProcessedSegmentsRef,
  currentBufferEndRef,
  lastVideoFetchTimeRef,
  lastAudioFetchTimeRef,
  pendingSegmentOperationsRef,
  segmentOperationIdRef,
  activeSegmentRequestsRef,
  segmentRequestIdRef,
  pendingAppendsRef,
  throughputEMARef,
  operationQueuesRef,
  validateSegmentCompatibility,
  enqueueOperation,
  updateThroughputMeasurement,
  calculateEstimatedBufferEnd,
  tryEndStream,
  isDownloadingRef,
  isPausedRef,
  shouldStopDownloadingRef,
  shouldFetchSegment,
  markFetchStart,
  markFetchEnd,
  scheduleNextFetch,
}: UseSegmentFetchingProps) {
  const segmentCache = getSegmentCache();

  const fetchAndAppend = useCallback(
    async (
      rep: Representation,
      segmentNumber: number,
      mediaType: MediaType,
      sb: SourceBuffer,
      signal?: AbortSignal
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          return reject(new DOMException("Aborted", "AbortError"));
        }
        if (!isOnlineRef.current) return resolve();

        const operationId = segmentOperationIdRef.current++;
        const requestId = segmentRequestIdRef.current++;

        pendingSegmentOperationsRef.current.set(operationId, {
          repId: rep.id,
          mediaType,
        });

        // ✅ CHECK CACHE FIRST
        const cachedData = segmentCache.get(
          videoId,
          mediaType,
          rep.id,
          segmentNumber
        );

        if (cachedData) {
          // Validate compatibility
          const operationInfo =
            pendingSegmentOperationsRef.current.get(operationId);
          if (
            !operationInfo ||
            !validateSegmentCompatibility(
              operationInfo.repId,
              operationInfo.mediaType,
              segmentNumber
            )
          ) {
            pendingSegmentOperationsRef.current.delete(operationId);
            return resolve();
          }

          // Update throughput with cached data (simulate instant fetch)
          if (mediaType === "video") {
            updateThroughputMeasurement(cachedData.byteLength, 1, mediaType);
          }

          // Append cached data to buffer
          enqueueOperation(mediaType, () => {
            if (
              !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
            ) {
              return Promise.resolve();
            }

            return appendBufferSafely(
              sb,
              cachedData,
              signal,
              segmentNumber,
              mediaType,
              pendingAppendsRef.current
            )
              .then(() => {
                lastProcessedSegmentsRef.current.set(rep.id, segmentNumber);

                const segmentDuration = rep.segmentDur / rep.timescale;
                currentBufferEndRef.current = Math.max(
                  currentBufferEndRef.current,
                  (segmentNumber - rep.startNumber + 1) * segmentDuration
                );
              })
              .catch((error) => {
                if (error.name === "AbortError") {
                  // append aborted
                } else {
                  console.error(
                    `Error appending cached segment ${segmentNumber}:`,
                    error
                  );
                }
              });
          });

          pendingSegmentOperationsRef.current.delete(operationId);
          return resolve();
        }

        // ❌ CACHE MISS - Fetch from network
        const startTime = performance.now();
        let firstByteTime = 0;

        const requestController = new AbortController();

        activeSegmentRequestsRef.current.set(requestId, {
          controller: requestController,
          mediaType,
          repId: rep.id,
        });

        const onAbort = () => {
          activeSegmentRequestsRef.current.delete(requestId);
          pendingSegmentOperationsRef.current.delete(operationId);
          reject(new DOMException("Aborted", "AbortError"));
        };

        const combinedAbortHandler = () => {
          onAbort();
        };

        if (signal) {
          signal.addEventListener("abort", combinedAbortHandler);
        }
        requestController.signal.addEventListener(
          "abort",
          combinedAbortHandler
        );

        let totalBytes = 0;

        fetchSegment({
          videoId,
          rep,
          segmentNumber,
          mediaType,
          signal: requestController.signal,
          onProgress: (bytes) => {
            if (firstByteTime === 0) {
              firstByteTime = performance.now();
            }
            totalBytes = bytes;
          },
        })
          .then((data) => {
            const durationMs = performance.now() - startTime;

            if (signal) {
              signal.removeEventListener("abort", combinedAbortHandler);
            }
            requestController.signal.removeEventListener(
              "abort",
              combinedAbortHandler
            );

            activeSegmentRequestsRef.current.delete(requestId);

            if (signal?.aborted || requestController.signal.aborted) {
              pendingSegmentOperationsRef.current.delete(operationId);
              return reject(new DOMException("Aborted", "AbortError"));
            }

            // ✅ CACHE THE FETCHED DATA
            segmentCache.set(videoId, mediaType, rep.id, segmentNumber, data);

            const operationInfo =
              pendingSegmentOperationsRef.current.get(operationId);
            if (
              !operationInfo ||
              !validateSegmentCompatibility(
                operationInfo.repId,
                operationInfo.mediaType,
                segmentNumber
              )
            ) {
              pendingSegmentOperationsRef.current.delete(operationId);
              return resolve();
            }

            if (mediaType === "video") {
              updateThroughputMeasurement(
                data.byteLength,
                durationMs,
                mediaType
              );
            }

            enqueueOperation(mediaType, () => {
              if (
                !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
              ) {
                return Promise.resolve();
              }

              return appendBufferSafely(
                sb,
                data,
                requestController.signal,
                segmentNumber,
                mediaType,
                pendingAppendsRef.current
              )
                .then(() => {
                  lastProcessedSegmentsRef.current.set(rep.id, segmentNumber);

                  const segmentDuration = rep.segmentDur / rep.timescale;
                  currentBufferEndRef.current = Math.max(
                    currentBufferEndRef.current,
                    (segmentNumber - rep.startNumber + 1) * segmentDuration
                  );
                })
                .catch((error) => {
                  if (error.name === "AbortError") {
                    // append aborted
                  } else {
                    console.error(
                      `Error appending segment ${segmentNumber}:`,
                      error
                    );
                  }
                });
            });

            pendingSegmentOperationsRef.current.delete(operationId);
            resolve();
          })
          .catch((error) => {
            if (signal) {
              signal.removeEventListener("abort", combinedAbortHandler);
            }
            requestController.signal.removeEventListener(
              "abort",
              combinedAbortHandler
            );

            activeSegmentRequestsRef.current.delete(requestId);
            pendingSegmentOperationsRef.current.delete(operationId);

            if (signal?.aborted || requestController.signal.aborted) {
              return reject(new DOMException("Aborted", "AbortError"));
            }

            console.error(`Error fetching segment ${segmentNumber}:`, error);
            resolve();
          });
      });
    },
    [
      videoId,
      segmentCache,
      isOnlineRef,
      segmentOperationIdRef,
      segmentRequestIdRef,
      pendingSegmentOperationsRef,
      activeSegmentRequestsRef,
      lastProcessedSegmentsRef,
      currentBufferEndRef,
      pendingAppendsRef,
      validateSegmentCompatibility,
      enqueueOperation,
      updateThroughputMeasurement,
    ]
  );

  // hooks/useSegmentFetching.ts - Updated fetchNextSegment function
  const fetchNextSegment = useCallback(
    async (
      videoId: string,
      rep: Representation,
      mediaType: MediaType,
      sb: SourceBuffer,
      nextSegRef: React.RefObject<number>,
      finishedRef: React.RefObject<boolean>,
      isQualitySwitch: boolean = false
    ) => {
      // CRITICAL: Check if we should stop downloading
      if (finishedRef.current) {
        return;
      }

      if (isPausedRef.current && !isQualitySwitch) {
        return;
      }

      if (!isQualitySwitch && isPausedRef.current) {
        return;
      }

      if (!isOnlineRef.current) {
        return;
      }

      if (
        (mediaType === "video" && videoFetchPausedRef.current) ||
        (mediaType === "audio" && audioFetchPausedRef.current)
      ) {
        return;
      }

      if (mediaSourceStateRef.current !== "open") return;
      if (mediaType === "video" && isFetchingVideoRef.current) return;
      if (mediaType === "audio" && isFetchingAudioRef.current) return;

      const videoEl = videoRef.current;
      if (!videoEl) return;

      // ✅ Calculate buffer gap to decide how many segments to fetch
      const estimatedBufferEnd = calculateEstimatedBufferEnd();
      const currentTime = videoEl.currentTime;
      const bufferGap = Math.max(0, estimatedBufferEnd - currentTime);

      // Determine how many segments to fetch based on buffer gap
      let segmentsToFetch = 1; // Default: 1 segment at a time

      if (bufferGap < BUFFER_EMERGENCY_THRESHOLD) {
        // Emergency: fetch aggressively (3-4 segments)
        segmentsToFetch = mediaType === "video" ? 3 : 2;
      } else if (bufferGap < 10) {
        // Low buffer: fetch moderately (2 segments)
        segmentsToFetch = mediaType === "video" ? 2 : 1;
      } else if (bufferGap < TARGET_BUFFER_LEVEL * 0.5) {
        // Medium buffer: fetch normally (2 segments for video)
        segmentsToFetch = mediaType === "video" ? 2 : 1;
      } else if (bufferGap >= MAX_BUFFER_LEVEL) {
        // Max buffer: don't fetch
        return;
      }
      // High buffer: fetch 1 segment (default)

      // ✅ USE BUFFER CONTROL to check if we should fetch
      if (!isQualitySwitch) {
        const bufferCheck = shouldFetchSegment(
          mediaType,
          sb,
          currentTime,
          bufferGap < BUFFER_EMERGENCY_THRESHOLD
        );

        if (!bufferCheck.shouldFetch) {
          // Schedule next check if we have a delay
          if (bufferCheck.delay > 0) {
            scheduleNextFetch(mediaType, bufferCheck.delay, () => {
              fetchNextSegment(
                videoId,
                rep,
                mediaType,
                sb,
                nextSegRef,
                finishedRef,
                false
              );
            });
          }
          return; // Don't fetch now
        }
      }

      // Mark fetch start for buffer control
      markFetchStart(mediaType);

      if (mediaType === "video") {
        isFetchingVideoRef.current = true;
        isDownloadingRef.current = true;
      } else {
        isFetchingAudioRef.current = true;
      }

      try {
        // ✅ FETCH MULTIPLE SEGMENTS IN SEQUENCE (not parallel to avoid network congestion)
        for (let i = 0; i < segmentsToFetch; i++) {
          if (finishedRef.current || isPausedRef.current) {
            break;
          }

          const segNum = nextSegRef.current;

          // Check if we've reached the end
          if (segNum > rep.startNumber + rep.totalSegments - 1) {
            finishedRef.current = true;
            break;
          }

          // Create abort controller for this segment
          const controller = new AbortController();
          if (mediaType === "video") {
            abortControllersRef.current.video.push(controller);
          } else {
            abortControllersRef.current.audio.push(controller);
          }

          try {
            // Fetch and append the segment
            await fetchAndAppend(rep, segNum, mediaType, sb, controller.signal);

            // Increment segment counter
            nextSegRef.current++;
            lastProcessedSegmentsRef.current.set(rep.id, segNum);

            // Update timing
            if (mediaType === "video") {
              lastVideoFetchTimeRef.current = Date.now();
            } else {
              lastAudioFetchTimeRef.current = Date.now();
            }

            // Small delay between segments to prevent overwhelming
            if (i < segmentsToFetch - 1) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } finally {
            // Clean up abort controller
            const targetArray =
              mediaType === "video"
                ? abortControllersRef.current.video
                : abortControllersRef.current.audio;
            const idx = targetArray.indexOf(controller);
            if (idx !== -1) targetArray.splice(idx, 1);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`Error fetching ${mediaType} segment:`, err);

          // Retry logic with backoff
          setTimeout(() => {
            if (
              !operationQueuesRef.current[`${mediaType}Processing`] &&
              !finishedRef.current &&
              !isPausedRef.current &&
              isOnlineRef.current
            ) {
              fetchNextSegment(
                videoId,
                rep,
                mediaType,
                sb,
                nextSegRef,
                finishedRef,
                isQualitySwitch
              );
            }
          }, 1000);
        }
      } finally {
        if (mediaType === "video") {
          isFetchingVideoRef.current = false;
          isDownloadingRef.current = false;
        } else {
          isFetchingAudioRef.current = false;
        }

        // Mark fetch end for buffer control
        markFetchEnd(mediaType);
      }

      // ✅ Schedule next fetch using buffer control
      if (
        !finishedRef.current &&
        !videoFetchPausedRef.current &&
        !audioFetchPausedRef.current &&
        !isPausedRef.current &&
        isOnlineRef.current &&
        videoEl
      ) {
        const bufferCheck = shouldFetchSegment(
          mediaType,
          sb,
          videoEl.currentTime,
          false
        );

        if (bufferCheck.shouldFetch && bufferCheck.delay === 0) {
          // If we can fetch immediately, do it right away
          fetchNextSegment(
            videoId,
            rep,
            mediaType,
            sb,
            nextSegRef,
            finishedRef,
            false
          );
        } else if (bufferCheck.delay > 0) {
          // Schedule based on buffer control delay
          scheduleNextFetch(mediaType, bufferCheck.delay, () => {
            fetchNextSegment(
              videoId,
              rep,
              mediaType,
              sb,
              nextSegRef,
              finishedRef,
              false
            );
          });
        }
        // If delay is 0 and shouldn't fetch, we do nothing
      }
    },
    [
      videoRef,
      mediaSourceStateRef,
      isOnlineRef,
      isFetchingVideoRef,
      isFetchingAudioRef,
      videoFetchPausedRef,
      audioFetchPausedRef,
      abortControllersRef,
      lastProcessedSegmentsRef,
      lastVideoFetchTimeRef,
      lastAudioFetchTimeRef,
      operationQueuesRef,
      fetchAndAppend,
      calculateEstimatedBufferEnd,
      shouldFetchSegment,
      scheduleNextFetch,
      markFetchStart,
      markFetchEnd,
      isPausedRef,
      shouldStopDownloadingRef,
    ]
  );

  const cancelAllSegmentRequests = useCallback(
    (mediaType?: MediaType, specificRepId?: string) => {
      const requestsToCancel: number[] = [];

      activeSegmentRequestsRef.current.forEach(
        (request: any, requestId: number) => {
          const shouldCancel =
            (!mediaType || request.mediaType === mediaType) &&
            (!specificRepId || request.repId === specificRepId);

          if (shouldCancel) {
            requestsToCancel.push(requestId);
          }
        }
      );

      requestsToCancel.forEach((requestId) => {
        const request = activeSegmentRequestsRef.current.get(requestId);
        if (request) {
          try {
            request.controller.abort();
            if (request.call) {
              request.call.cancel();
            }
          } catch (error) {
            // Error canceling request
          }
          activeSegmentRequestsRef.current.delete(requestId);
        }
      });
    },
    [activeSegmentRequestsRef]
  );

  const completeOngoingSegmentOperations = useCallback(
    async (mediaType: MediaType): Promise<void> => {
      return new Promise((resolve) => {
        const queue = operationQueuesRef.current;
        const targetQueue = mediaType === "video" ? queue.video : queue.audio;

        if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
          resolve();
          return;
        }

        const checkInterval = setInterval(() => {
          if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    },
    [operationQueuesRef]
  );

  return {
    fetchNextSegment,
    fetchAndAppend,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
  };
}