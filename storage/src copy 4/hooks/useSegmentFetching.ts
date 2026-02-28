import { useCallback, useRef } from "react";
import type {
  Representation,
  MediaType,
  OperationQueue,
  PendingAppend,
} from "../types/player.types";
import { fetchSegment } from "../services/segmentFetcher";
import { appendBufferSafely } from "../utils/bufferHelpers";
import { calculatePacing } from "../utils/playerHelpers";
import { calculateBatchSize } from "../../../src/utils/bufferHelpers";

import {
  TARGET_BUFFER_LEVEL,
  MAX_BUFFER_LEVEL,
  BUFFER_EMERGENCY_THRESHOLD,
  PACING_FACTOR,
  JITTER_FACTOR,
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
}: UseSegmentFetchingProps) {
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
              console.log(
                `Discarding segment ${segmentNumber} due to quality switch or invalid state`
              );
              pendingSegmentOperationsRef.current.delete(operationId);
              return resolve();
            }

            if (mediaType === "video") {
              updateThroughputMeasurement(data.length, durationMs, mediaType);
            }

            enqueueOperation(mediaType, () => {
              if (
                !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
              ) {
                console.log(
                  `Discarding segment ${segmentNumber} during append due to quality switch`
                );
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

                  console.log(
                    `Segment ${segmentNumber} appended successfully for rep ${rep.id}`
                  );
                })
                .catch((error) => {
                  if (error.name === "AbortError") {
                    console.log(`Segment ${segmentNumber} append aborted`);
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

  const fetchNextSegment = useCallback(
    async (
      videoId: string,
      rep: Representation,
      mediaType: MediaType,
      sb: SourceBuffer,
      nextSegRef: React.MutableRefObject<number>,
      finishedRef: React.MutableRefObject<boolean>,
      isQualitySwitch: boolean = false
    ) => {
      // CRITICAL: Check if we should stop downloading
      if (finishedRef.current) {
        console.log(`${mediaType} fetching complete - all segments downloaded`);
        return;
      }

      if (isPausedRef.current && !isQualitySwitch) {
        console.log(`${mediaType} fetch blocked - video is paused`);
        return;
      }

      // NEW: Stop if paused (unless it's a quality switch)
      if (!isQualitySwitch && isPausedRef.current) {
        console.log(`${mediaType} fetching paused - video is paused`);
        return;
      }

      // NEW: Stop if offline
      if (!isOnlineRef.current) {
        console.log(`${mediaType} fetching stopped - offline`);
        return;
      }

      if (
        (mediaType === "video" && videoFetchPausedRef.current) ||
        (mediaType === "audio" && audioFetchPausedRef.current)
      ) {
        console.log(`Fetching paused for ${mediaType}, skipping`);
        return;
      }

      if (mediaSourceStateRef.current !== "open") return;
      if (mediaType === "video" && isFetchingVideoRef.current) return;
      if (mediaType === "audio" && isFetchingAudioRef.current) return;

      const videoEl = videoRef.current;
      if (videoEl) {
        const estimatedBufferEnd = calculateEstimatedBufferEnd();
        const bufferGap = estimatedBufferEnd - videoEl.currentTime;

        const maxBuffer = isQualitySwitch
          ? MAX_BUFFER_LEVEL * 1.5
          : MAX_BUFFER_LEVEL;

        if (bufferGap >= maxBuffer) {
          if (mediaType === "video") {
            isFetchingVideoRef.current = false;
          } else {
            isFetchingAudioRef.current = false;
          }
          console.log(
            `${mediaType} buffer full (${bufferGap.toFixed(
              1
            )}s) - stopping fetch`
          );
          return;
        }
      }

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

      try {
        const batchSize = isQualitySwitch
          ? 1
          : calculateBatchSize(
              videoEl ? calculateEstimatedBufferEnd() - videoEl.currentTime : 0,
              rep.segmentDur / rep.timescale,
              isQualitySwitch,
              TARGET_BUFFER_LEVEL,
              MAX_BUFFER_LEVEL,
              BUFFER_EMERGENCY_THRESHOLD
            );

        console.log(`Fetching ${batchSize} segments for ${mediaType}`, {
          isQualitySwitch,
          segment: nextSegRef.current,
          paused: isPausedRef.current,
          online: isOnlineRef.current,
        });

        for (let i = 0; i < batchSize; i++) {
          // Check abort conditions during batch
          if (
            shouldStopDownloadingRef.current ||
            (!isQualitySwitch && isPausedRef.current) ||
            !isOnlineRef.current
          ) {
            console.log(
              `Aborting ${mediaType} batch fetch - conditions changed`
            );
            break;
          }

          if (
            (mediaType === "video" && videoFetchPausedRef.current) ||
            (mediaType === "audio" && audioFetchPausedRef.current)
          ) {
            console.log(`Fetching paused during batch for ${mediaType}`);
            break;
          }

          const segNum = nextSegRef.current;

          if (segNum > rep.startNumber + rep.totalSegments - 1) {
            console.log(
              `${mediaType} reached last segment - marking as finished`
            );
            finishedRef.current = true;
            break;
          }

          await fetchAndAppend(rep, segNum, mediaType, sb, controller.signal);

          nextSegRef.current++;
          lastProcessedSegmentsRef.current.set(rep.id, segNum);

          if (isQualitySwitch) {
            await new Promise((resolve) => setTimeout(resolve, 30));
          }
        }

        if (mediaType === "video") {
          lastVideoFetchTimeRef.current = Date.now();
        } else {
          lastAudioFetchTimeRef.current = Date.now();
        }

        // Schedule next fetch ONLY if conditions allow
        if (
          !finishedRef.current &&
          !videoFetchPausedRef.current &&
          !audioFetchPausedRef.current &&
          !isPausedRef.current && // NEW: Don't schedule if paused
          isOnlineRef.current
        ) {
          // NEW: Don't schedule if offline

          const estimatedBufferEnd = calculateEstimatedBufferEnd();
          const bufferGap = videoEl
            ? estimatedBufferEnd - videoEl.currentTime
            : 0;
          const pacing = calculatePacing(
            bufferGap,
            rep,
            throughputEMARef.current,
            TARGET_BUFFER_LEVEL,
            BUFFER_EMERGENCY_THRESHOLD,
            PACING_FACTOR,
            JITTER_FACTOR
          );

          setTimeout(() => {
            fetchNextSegment(
              videoId,
              rep,
              mediaType,
              sb,
              nextSegRef,
              finishedRef,
              false
            );
          }, pacing);
        } else if (finishedRef.current) {
          console.log(`${mediaType} fetching complete - stopping scheduler`);
        } else if (isPausedRef.current) {
          console.log(`${mediaType} scheduler stopped - video paused`);
        } else if (!isOnlineRef.current) {
          console.log(`${mediaType} scheduler stopped - offline`);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`Error fetching ${mediaType} segment:`, err);

          // Retry logic - but respect pause/offline state
          setTimeout(() => {
            if (
              !operationQueuesRef.current[`${mediaType}Processing`] &&
              !finishedRef.current &&
              !isPausedRef.current && // NEW
              isOnlineRef.current
            ) {
              // NEW
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
        const targetArray =
          mediaType === "video"
            ? abortControllersRef.current.video
            : abortControllersRef.current.audio;

        const idx = targetArray.indexOf(controller);
        if (idx !== -1) targetArray.splice(idx, 1);

        if (mediaType === "video") {
          isFetchingVideoRef.current = false;
          isDownloadingRef.current = false;
        } else {
          isFetchingAudioRef.current = false;
        }
      }

      if (nextSegRef.current > rep.startNumber + rep.totalSegments - 1) {
        finishedRef.current = true;
        console.log(
          `${mediaType} all segments fetched - finishedRef set to true`
        );
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
      throughputEMARef,
      operationQueuesRef,
      fetchAndAppend,
      calculateEstimatedBufferEnd,
      tryEndStream,
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
            console.log("Error canceling request:", error);
          }
          activeSegmentRequestsRef.current.delete(requestId);
        }
      });

      console.log(`Cancelled ${requestsToCancel.length} segment requests`, {
        mediaType,
        specificRepId,
        remainingRequests: activeSegmentRequestsRef.current.size,
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
