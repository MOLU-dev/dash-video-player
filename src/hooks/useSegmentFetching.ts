import { useCallback } from "react";
import type {
  Representation,
  MediaType,
  OperationQueue,
  PendingAppend,
  PrefetchMetadata,
} from "../types/player.types";
import {
  fetchSegment,
  fetchInitSegment,
  streamLivePersistent,
} from "../services/segmentFetcher";
import { appendBufferSafely } from "../utils/bufferHelpers";
import { getSegmentCache } from "@/lib/segmentCache";

// Helper function for prefetch-aware segment fetching
const usePrefetchAwareSegmentFetching = (
  videoId: string,
  prefetchMetadata: Map<string, PrefetchMetadata>
) => {
  // Get prefetch info for current video
  const getPrefetchInfo = useCallback(() => {
    return prefetchMetadata.get(videoId) || null;
  }, [videoId, prefetchMetadata]);

  return { getPrefetchInfo };
};

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
    videoSb: SourceBuffer | null,
    audioSb: SourceBuffer | null,
    currentTime: number,
    isEmergency?: boolean,
    isLive?: boolean
  ) => {
    shouldFetch: boolean;
    delay: number;
    reason: string;
    segmentsToFetch?: number;
  };
  markFetchStart: (mediaType: MediaType) => void;
  markFetchEnd: (mediaType: MediaType) => void;
  scheduleNextFetch: (
    mediaType: MediaType,
    delay: number,
    callback: () => void
  ) => void;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  logBufferState?: (
    mediaType: string,
    shouldFetch: boolean,
    delay: number,
    reason: string,
    videoBufferAhead: number,
    audioBufferAhead: number
  ) => void;

  prefetchMetadata?: Map<string, PrefetchMetadata>;
  isLiveRef?: React.RefObject<boolean>;
  qualitySwitchInProgressRef: React.RefObject<boolean>;
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
  videoSbRef,
  audioSbRef,
  logBufferState,

  prefetchMetadata = new Map(),
  isLiveRef = { current: false },
  qualitySwitchInProgressRef,
}: UseSegmentFetchingProps) {
  const segmentCache = getSegmentCache();
  const { getPrefetchInfo } = usePrefetchAwareSegmentFetching(
    videoId,
    prefetchMetadata
  );

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

        // ✅ STEP 1: CHECK PREFETCH CACHE FIRST (with matching rep)
        const prefetchInfo = getPrefetchInfo();
        if (prefetchInfo) {
          const prefetchedRepId =
            mediaType === "video"
              ? prefetchInfo.videoRepId
              : prefetchInfo.audioRepId;

          // Only use prefetched cache if we're using the same representation
          if (rep.id === prefetchedRepId) {
            const cachedData = segmentCache.get(
              videoId,
              mediaType,
              prefetchedRepId,
              segmentNumber
            );

            if (cachedData) {
              console.log(
                `[CACHE HIT - PREFETCHED] ${mediaType} segment ${segmentNumber} (quality: ${prefetchedRepId})`
              );

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

              // Update throughput (instant from cache)
              if (mediaType === "video") {
                updateThroughputMeasurement(
                  cachedData.byteLength,
                  1,
                  mediaType
                );
              }

              // Append cached prefetched data
              enqueueOperation(mediaType, () => {
                if (
                  !validateSegmentCompatibility(
                    rep.id,
                    mediaType,
                    segmentNumber
                  )
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

                    console.log(
                      `[PREFETCH USED] Segment ${segmentNumber} appended from prefetch cache`
                    );
                  })
                  .catch((error) => {
                    if (error.name !== "AbortError") {
                      console.error(
                        `Error appending prefetched segment ${segmentNumber}:`,
                        error
                      );
                    }
                  });
              });

              pendingSegmentOperationsRef.current.delete(operationId);
              return resolve();
            }
          }
        }

        // ✅ STEP 2: CHECK REGULAR CACHE (current quality)
        const cachedData = segmentCache.get(
          videoId,
          mediaType,
          rep.id,
          segmentNumber
        );

        if (cachedData) {
          console.log(
            `[CACHE HIT - REGULAR] ${mediaType} segment ${segmentNumber} (quality: ${rep.id})`
          );

          // Same append logic as above
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
            updateThroughputMeasurement(cachedData.byteLength, 1, mediaType);
          }

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
                if (error.name !== "AbortError") {
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

        // ✅ STEP 3: CACHE MISS - Fetch from network (using current ABR quality)
        console.log(
          `[CACHE MISS] Fetching ${mediaType} segment ${segmentNumber} from network (quality: ${rep.id})`
        );

        const startTime = performance.now();
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

        // Fetch segment using ABR-selected quality
        fetchSegment({
          videoId,
          rep,
          segmentNumber,
          mediaType,
          signal: requestController.signal,
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

            // Cache the fetched data
            segmentCache.set(videoId, mediaType, rep.id, segmentNumber, data);
            console.log(
              `[NETWORK FETCH] ${mediaType} segment ${segmentNumber} cached (quality: ${rep.id})`
            );

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
                  if (error.name !== "AbortError") {
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
      getPrefetchInfo,
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

  // Helper function to calculate buffer ahead for a specific SourceBuffer
  const calculateBufferAhead = useCallback(
    (sb: SourceBuffer | null, currentTime: number): number => {
      if (!sb || sb.buffered.length === 0) return 0;

      for (let i = 0; i < sb.buffered.length; i++) {
        const start = sb.buffered.start(i);
        const end = sb.buffered.end(i);

        if (currentTime >= start && currentTime <= end) {
          return end - currentTime;
        } else if (currentTime < start) {
          // Current time is before this buffer range
          return 0;
        }
      }

      return 0;
    },
    []
  );

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
        console.log(`[${mediaType}] Finished downloading, stopping.`);
        return;
      }

      if (isPausedRef.current && !isQualitySwitch) {
        console.log(`[${mediaType}] Player is paused, stopping fetch.`);
        return;
      }

      if (!isQualitySwitch && isPausedRef.current) {
        return;
      }

      if (!isOnlineRef.current) {
        console.log(`[${mediaType}] Offline, stopping fetch.`);
        return;
      }

      if (
        (mediaType === "video" && videoFetchPausedRef.current) ||
        (mediaType === "audio" && audioFetchPausedRef.current)
      ) {
        console.log(`[${mediaType}] Fetch paused by buffer management.`);
        return;
      }

      if (mediaSourceStateRef.current !== "open") {
        console.log(`[${mediaType}] MediaSource not open.`);
        return;
      }

      if (mediaType === "video" && isFetchingVideoRef.current) {
        console.log(`[${mediaType}] Already fetching video.`);
        return;
      }

      if (mediaType === "audio" && isFetchingAudioRef.current) {
        console.log(`[${mediaType}] Already fetching audio.`);
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) {
        console.log(`[${mediaType}] Video element not found.`);
        return;
      }

      const currentTime = videoEl.currentTime;

      // ✅ Get both SourceBuffers for unified buffer control
      const videoSb = videoSbRef.current;
      const audioSb = audioSbRef.current;

      // ✅ Calculate buffer levels for logging
      const videoBufferAhead = calculateBufferAhead(videoSb, currentTime);
      const audioBufferAhead = calculateBufferAhead(audioSb, currentTime);
      const combinedBufferAhead = Math.min(videoBufferAhead, audioBufferAhead);

      // ✅ USE UNIFIED BUFFER CONTROL WITH AGGRESSIVE SLOWDOWN
      const bufferCheck = shouldFetchSegment(
        mediaType,
        videoSb,
        audioSb,
        currentTime,
        isQualitySwitch || combinedBufferAhead < 5,
        isLiveRef.current
      );

      // Prevent VOD from fetching when paused, UNLESS it's a quality switch
      if (isPausedRef.current && !isLiveRef.current && !isQualitySwitch) {
        console.log(`[${mediaType}] Paused (VOD) - skipping fetch`);
        return;
      }

      // Debug logging
      if (process.env.NODE_ENV === "development" && logBufferState) {
        logBufferState(
          mediaType,
          bufferCheck.shouldFetch,
          bufferCheck.delay,
          bufferCheck.reason,
          videoBufferAhead,
          audioBufferAhead
        );
      } else if (bufferCheck.reason) {
        console.log(`[${mediaType}] ${bufferCheck.reason}`);
      }

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
          console.log(
            `[${mediaType}] Scheduled next fetch in ${bufferCheck.delay}ms: ${bufferCheck.reason}`
          );
        }
        return; // Don't fetch now
      }

      // 🔴 LIVE REACTIVE STREAMING: Open once, let push handle everything
      if (isLiveRef.current) {
        markFetchStart(mediaType);
        if (mediaType === "video") {
          isFetchingVideoRef.current = true;
          isDownloadingRef.current = true;
        } else {
          isFetchingAudioRef.current = true;
        }

        const controller = new AbortController();
        if (mediaType === "video") {
          abortControllersRef.current.video.push(controller);
        } else {
          abortControllersRef.current.audio.push(controller);
        }

        let hasTriggeredNext = false;

        streamLivePersistent({
          videoId,
          rep,
          segmentNumber: nextSegRef.current,
          mediaType,
          signal: controller.signal,
          onChunkReceived: (data: Uint8Array, segNum: number, isLast: boolean) => {
            // 1. Append the data chunk
            if (data && data.length > 0) {
              enqueueOperation(mediaType, () => {
                return appendBufferSafely(
                  sb,
                  data,
                  controller.signal,
                  undefined, 
                  mediaType,
                  pendingAppendsRef.current
                );
              });
            }

            // 2. If this was the last chunk of a segment, update state
            if (isLast) {
              console.log(`[${mediaType}] Finished pushed segment ${segNum}`);
              nextSegRef.current = segNum + 1;
              
              // We could trigger a manifest refresh here if needed, 
              // but the persistent stream will keep pushing anyway.
            }
          },
          onEnd: () => {
             if (hasTriggeredNext) return;
             hasTriggeredNext = true;

             console.log(`[${mediaType}] Persistent live stream closed. Restarting...`);
             markFetchEnd(mediaType);
             if (mediaType === "video") {
               isFetchingVideoRef.current = false;
               isDownloadingRef.current = false;
             } else {
               isFetchingAudioRef.current = false;
             }
             
             // Restart the persistent stream if still live and not switching quality
             if (isLiveRef.current && !qualitySwitchInProgressRef.current) {
                fetchNextSegment(videoId, rep, mediaType, sb, nextSegRef, finishedRef, false);
             }
          },
          onError: (err: any) => {
             if (hasTriggeredNext) return;
             hasTriggeredNext = true;

             console.error(`[${mediaType}] Persistent live stream error:`, err);
             markFetchEnd(mediaType);
             if (mediaType === "video") {
               isFetchingVideoRef.current = false;
               isDownloadingRef.current = false;
             } else {
               isFetchingAudioRef.current = false;
             }

             // Retry after delay if not switching quality
             if (isLiveRef.current && !controller.signal.aborted && !qualitySwitchInProgressRef.current) {
                console.log(`[${mediaType}] Retrying persistent stream from ${nextSegRef.current}...`);
                setTimeout(() => {
                   if (!qualitySwitchInProgressRef.current) {
                      fetchNextSegment(videoId, rep, mediaType, sb, nextSegRef, finishedRef, false);
                   }
                }, 2000); 
             }
          }
        });

        // We exit early because streamLiveChunks is persistent. 
        // No loop or 'fetch again' needed.
        return;
      }

      // Mark fetch start for buffer control
      markFetchStart(mediaType);

      if (mediaType === "video") {
        isFetchingVideoRef.current = true;
        isDownloadingRef.current = true;
      } else {
        isFetchingAudioRef.current = true;
      }

      //  Use segmentsToFetch from unified buffer control
      const segmentsToFetch = bufferCheck.segmentsToFetch || 1;

      console.log(
        `[${mediaType}] Fetching ${segmentsToFetch} segment(s) - ${bufferCheck.reason}`
      );

      try {
        // ✅ FETCH MULTIPLE SEGMENTS BASED ON BUFFER CONTROL
        for (let i = 0; i < segmentsToFetch; i++) {
          if (finishedRef.current || isPausedRef.current) {
            console.log(
              `[${mediaType}] Stopping fetch loop: finished=${finishedRef.current}, paused=${isPausedRef.current}`
            );
            break;
          }

          const segNum = nextSegRef.current;

          // Check if we've reached the end (only for VOD)
          if (!isLiveRef.current && segNum > rep.startNumber + rep.totalSegments - 1) {
            console.log(`[${mediaType}] Reached end of segments: ${segNum}`);
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

            // Small delay between segments to prevent overwhelming network
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
          console.error(`[${mediaType}] Error fetching segment:`, err);

          // Standard Retry logic with exponential backoff
          const retryDelay = 1000; 
          setTimeout(() => {
            if (
              !operationQueuesRef.current[`${mediaType}Processing`] &&
              !finishedRef.current &&
              !isPausedRef.current &&
              isOnlineRef.current
            ) {
              console.log(`[${mediaType}] Retrying after error...`);
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
          }, retryDelay);
        } else {
          console.log(`[${mediaType}] Fetch aborted: ${err.message}`);
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

      // ✅ Schedule next fetch using unified buffer control
      if (
        !finishedRef.current &&
        !videoFetchPausedRef.current &&
        !audioFetchPausedRef.current &&
        !isPausedRef.current &&
        isOnlineRef.current &&
        videoEl
      ) {
        // Check buffer state again
        const nextBufferCheck = shouldFetchSegment(
          mediaType,
          videoSbRef.current,
          audioSbRef.current,
          videoEl.currentTime,
          false,
          isLiveRef.current
        );

        if (nextBufferCheck.shouldFetch && nextBufferCheck.delay === 0) {
          // If we can fetch immediately, do it right away
          console.log(`[${mediaType}] Fetching next segment immediately`);
          fetchNextSegment(
            videoId,
            rep,
            mediaType,
            sb,
            nextSegRef,
            finishedRef,
            false
          );
        } else if (nextBufferCheck.delay > 0) {
          // Schedule based on buffer control delay
          console.log(
            `[${mediaType}] Scheduling next fetch in ${nextBufferCheck.delay}ms`
          );
          scheduleNextFetch(mediaType, nextBufferCheck.delay, () => {
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
        } else {
          console.log(`[${mediaType}] Not fetching: ${nextBufferCheck.reason}`);
        }
      }
    },
    [
      videoRef,
      videoSbRef,
      audioSbRef,
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
      calculateBufferAhead,
      logBufferState,
      isLiveRef,
    ]
  );

  const cancelAllSegmentRequests = useCallback(
    (mediaType?: MediaType, specificRepId?: string) => {
      console.log(
        `Cancelling segment requests: mediaType=${mediaType}, repId=${specificRepId}`
      );

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
            console.log(
              `Cancelled request ${requestId} for ${request.mediaType}`
            );
          } catch (error) {
            console.warn(`Error cancelling request ${requestId}:`, error);
          }
          activeSegmentRequestsRef.current.delete(requestId);
        }
      });
    },
    [activeSegmentRequestsRef]
  );

  const completeOngoingSegmentOperations = useCallback(
    async (mediaType: MediaType): Promise<void> => {
      console.log(`Completing ongoing ${mediaType} segment operations...`);

      return new Promise((resolve) => {
        const queue = operationQueuesRef.current;
        const targetQueue = mediaType === "video" ? queue.video : queue.audio;

        if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
          console.log(`No ongoing ${mediaType} operations to complete`);
          resolve();
          return;
        }

        console.log(
          `Waiting for ${targetQueue.length} ${mediaType} operations to complete...`
        );

        const checkInterval = setInterval(() => {
          if (targetQueue.length === 0 && !queue[`${mediaType}Processing`]) {
            clearInterval(checkInterval);
            console.log(`All ${mediaType} operations completed`);
            resolve();
          }
        }, 50);
      });
    },
    [operationQueuesRef]
  );

  // Helper function to get current buffer stats for debugging
  const getBufferStats = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return null;

    const currentTime = videoEl.currentTime;
    const videoSb = videoSbRef.current;
    const audioSb = audioSbRef.current;

    const videoBufferAhead = calculateBufferAhead(videoSb, currentTime);
    const audioBufferAhead = calculateBufferAhead(audioSb, currentTime);
    const combinedBufferAhead = Math.min(videoBufferAhead, audioBufferAhead);

    return {
      video: videoBufferAhead,
      audio: audioBufferAhead,
      combined: combinedBufferAhead,
      currentTime,
      isFetchingVideo: isFetchingVideoRef.current,
      isFetchingAudio: isFetchingAudioRef.current,
    };
  }, [
    videoRef,
    videoSbRef,
    audioSbRef,
    calculateBufferAhead,
    isFetchingVideoRef,
    isFetchingAudioRef,
  ]);

  return {
    fetchNextSegment,
    fetchAndAppend,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
    getBufferStats,
    calculateBufferAhead,
  };
}
