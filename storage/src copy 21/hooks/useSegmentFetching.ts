import { useCallback, useRef, useState } from "react";
import type {
  Representation,
  MediaType,
  OperationQueue,
  PendingAppend,
  PrefetchMetadata,
} from "../types/player.types";
import { fetchSegment } from "../services/segmentFetcher";
import { appendBufferSafely } from "../utils/bufferHelpers";
import { getSegmentCache } from "@/lib/segmentCache";

import {
  LiveManifestRequest,
  LiveManifestUpdate,
  StreamVideoRequest,
  StreamVideoChunk,
} from "@/proto/rpc_streamLive_pb";
import { grpcClient } from "@/utils/grpcClient";
import { parseManifest } from "@/services/manifestParser";

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
    isEmergency?: boolean
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

  // Live streaming specific props (optional)
  onManifestUpdate?: (manifest: any) => void;
  onStreamEnded?: () => void;
  setVideoReps?: (reps: Representation[]) => void;
  setAudioReps?: (reps: Representation[]) => void;
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
  onManifestUpdate,
  onStreamEnded,
  setVideoReps,
  setAudioReps,
}: UseSegmentFetchingProps) {
  const segmentCache = getSegmentCache();
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [liveLatestSegments, setLiveLatestSegments] = useState<
    Map<string, number>
  >(new Map());
  const manifestStreamRef = useRef<any>(null);
  const liveVideoStreamRef = useRef<any>(null);
  const pendingLiveSegmentsRef = useRef<
    Map<
      string,
      {
        chunks: Uint8Array[];
        resolve: (data: Uint8Array) => void;
        reject: (err: any) => void;
        segmentNumber: number;
        repId: string;
        mediaType: MediaType;
      }
    >
  >(new Map());

  const { getPrefetchInfo } = usePrefetchAwareSegmentFetching(
    videoId,
    prefetchMetadata
  );

  // ========== LIVE MANIFEST STREAMING ==========
  const connectManifestStream = useCallback(() => {
    if (!isLiveStream) return;

    const req = new LiveManifestRequest();
    req.setVideoId(videoId);
    req.setIncludeInitialManifest(true);

    const stream = grpcClient.streamLiveManifest(req, {});
    manifestStreamRef.current = stream;

    stream.on("data", (update: LiveManifestUpdate) => {
      const updateType = update.getType();

      switch (updateType) {
        case LiveManifestUpdate.UpdateType.FULL_MANIFEST:
          console.log("[LIVE] Received full manifest");
          const mpdXml = update.getMpdXml_asU8();

          if (mpdXml && mpdXml.length > 0) {
            try {
              // Parse the MPD XML to get manifest data
              const mpdText = new TextDecoder().decode(mpdXml);
              const manifest = parseManifest(mpdXml);

              // Update representations
              if (setVideoReps) setVideoReps(manifest.videoReps);
              if (setAudioReps) setAudioReps(manifest.audioReps);
              if (onManifestUpdate) onManifestUpdate(manifest);

              // Check if this is a live stream
              if (manifest.isLive) {
                setIsLiveStream(true);
                console.log("[LIVE] Detected as live stream from manifest");
              }
            } catch (error) {
              console.error("[LIVE] Failed to parse manifest:", error);
            }
          }
          break;

        case LiveManifestUpdate.UpdateType.SEGMENT_AVAILABLE:
          console.log("[LIVE] Segment available update received");

          // Since the proto doesn't have segment details in LiveManifestUpdate,
          // we need to handle this differently. The server might send segment
          // availability through other means or we need to check the MPD.
          // For now, we'll just log it.
          break;

        case LiveManifestUpdate.UpdateType.STREAM_ENDED:
          console.log(
            "[LIVE] 🔴 Stream ended - switching to VOD and stopping playback"
          );
          setIsLiveStream(false);

          // Notify parent that stream ended
          if (onStreamEnded) {
            onStreamEnded();
          }
          break;

        case LiveManifestUpdate.UpdateType.ERROR:
          console.error("[LIVE] Manifest error received");
          break;
      }
    });

    stream.on("error", (err: any) => {
      console.error("[LIVE] Manifest stream error:", err);
      // Reconnect after delay
      setTimeout(() => {
        if (isLiveStream) {
          console.log("[LIVE] Reconnecting manifest stream...");
          connectManifestStream();
        }
      }, 5000);
    });

    stream.on("end", () => {
      console.log("[LIVE] Manifest stream connection ended");
    });
  }, [
    videoId,
    isLiveStream,
    setVideoReps,
    setAudioReps,
    onManifestUpdate,
    onStreamEnded,
  ]);

  // ========== LIVE VIDEO STREAMING ==========
  const initializeLiveVideoStream = useCallback(
    (rep: Representation, startSegment: number) => {
      if (liveVideoStreamRef.current) {
        console.log("[LIVE] Closing existing video stream");
        liveVideoStreamRef.current.cancel();
      }

      console.log(
        `[LIVE] Initializing video stream for rep ${rep.id}, start segment ${startSegment}`
      );

      try {
        const req = new StreamVideoRequest();
        req.setVideoId(videoId);
        req.setRepresentationId(rep.id);
        req.setStartSegment(startSegment);
        req.setStartFromLiveEdge(true);
        req.setSegmentsBehindLive(2); // Start 2 segments behind live edge

        const stream = grpcClient.streamVideoLive(req, {});
        liveVideoStreamRef.current = stream;

        stream.on("data", (chunk: StreamVideoChunk) => {
          const segNum = chunk.getSegmentNumber();
          const key = `${rep.id}:${segNum}`;

          console.log(
            `[LIVE] Received chunk for segment ${segNum}, is_last: ${chunk.getIsLastChunk()}, is_init: ${chunk.getIsInit()}`
          );

          const pending = pendingLiveSegmentsRef.current.get(key);
          if (!pending) {
            console.warn(`[LIVE] No pending promise for segment ${key}`);
            return;
          }

          // Accumulate chunks
          pending.chunks.push(chunk.getData_asU8());

          // If this is the last chunk of the segment, resolve
          if (chunk.getIsLastChunk()) {
            // Combine all chunks
            const totalLength = pending.chunks.reduce(
              (sum: number, arr: Uint8Array) => sum + arr.length,
              0
            );
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            pending.chunks.forEach((arr: Uint8Array) => {
              combined.set(arr, offset);
              offset += arr.length;
            });

            console.log(`[LIVE] Segment ${key} complete, ${totalLength} bytes`);
            pending.resolve(combined);
            pendingLiveSegmentsRef.current.delete(key);
          }

          // Update live edge information
          const currentLiveEdge = chunk.getCurrentLiveEdge();
          if (currentLiveEdge > 0) {
            console.log(
              `[LIVE] Current live edge: ${currentLiveEdge}, segments behind: ${chunk.getSegmentsBehind()}`
            );

            // Update latest segments
            setLiveLatestSegments((prev) => {
              const updated = new Map(prev);
              updated.set(`${rep.id}:video`, currentLiveEdge);
              return updated;
            });
          }
        });

        stream.on("error", (err: any) => {
          console.error("[LIVE] Video stream error:", err);
          // Reject all pending promises
          pendingLiveSegmentsRef.current.forEach((pending, key) => {
            pending.reject(err);
          });
          pendingLiveSegmentsRef.current.clear();
        });

        stream.on("end", () => {
          console.log("[LIVE] Video stream ended");
        });
      } catch (error) {
        console.error("[LIVE] Failed to create video stream:", error);
      }
    },
    [videoId]
  );

  const fetchLiveSegment = useCallback(
    (
      rep: Representation,
      segmentNumber: number,
      mediaType: MediaType
    ): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        const key = `${rep.id}:${segmentNumber}`;

        // Check if already pending
        if (pendingLiveSegmentsRef.current.has(key)) {
          console.warn(`[LIVE] Already requesting segment ${key}`);
          const existing = pendingLiveSegmentsRef.current.get(key);
          if (existing) {
            // Return the existing promise
            const originalResolve = existing.resolve;
            const originalReject = existing.reject;

            // Create a new promise that will resolve/reject when the original does
            const waitForExisting = new Promise<Uint8Array>((res, rej) => {
              // Override the original callbacks to also call our new ones
              existing.resolve = (data: Uint8Array) => {
                originalResolve(data);
                res(data);
              };
              existing.reject = (err: any) => {
                originalReject(err);
                rej(err);
              };
            });

            return waitForExisting.then(resolve).catch(reject);
          }
        }

        console.log(`[LIVE] Requesting segment ${key}`);

        // Store the promise callbacks
        pendingLiveSegmentsRef.current.set(key, {
          resolve,
          reject,
          chunks: [],
          segmentNumber,
          repId: rep.id,
          mediaType,
        });

        // Initialize or restart stream if needed
        // For live streaming, we typically want to start from the latest available segment
        // But we can also request specific segments
        if (!liveVideoStreamRef.current || segmentNumber === 1) {
          // Start a new stream from this segment
          initializeLiveVideoStream(rep, segmentNumber);
        } else {
          // We're already streaming, the server should send us this segment
          // based on the ongoing stream
          console.log(
            `[LIVE] Waiting for segment ${segmentNumber} from existing stream`
          );
        }

        // Set timeout for segment request (10 seconds for live)
        setTimeout(() => {
          if (pendingLiveSegmentsRef.current.has(key)) {
            console.error(`[LIVE] Timeout waiting for segment ${key}`);
            const pending = pendingLiveSegmentsRef.current.get(key);
            if (pending) {
              pending.reject(
                new Error(`Timeout waiting for live segment ${segmentNumber}`)
              );
            }
            pendingLiveSegmentsRef.current.delete(key);
          }
        }, 10000);
      });
    },
    [initializeLiveVideoStream]
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

        // ✅ STEP 3: CACHE MISS - Fetch from network (VOD or Live)
        console.log(
          `[CACHE MISS] Fetching ${mediaType} segment ${segmentNumber} from network (quality: ${rep.id}, live: ${isLiveStream})`
        );

        const startTime = performance.now();

        // Choose fetch method based on stream type
        const fetchPromise =
          isLiveStream && mediaType === "video"
            ? fetchLiveSegment(rep, segmentNumber, mediaType)
            : (async () => {
                const requestController = new AbortController();
                activeSegmentRequestsRef.current.set(requestId, {
                  controller: requestController,
                  mediaType,
                  repId: rep.id,
                });

                try {
                  return await fetchSegment({
                    videoId,
                    rep,
                    segmentNumber,
                    mediaType,
                    signal: requestController.signal,
                  });
                } finally {
                  activeSegmentRequestsRef.current.delete(requestId);
                }
              })();

        fetchPromise
          .then((data) => {
            const durationMs = performance.now() - startTime;

            if (signal?.aborted) {
              pendingSegmentOperationsRef.current.delete(operationId);
              return reject(new DOMException("Aborted", "AbortError"));
            }

            // Cache the fetched data (for VOD only)
            if (!isLiveStream) {
              segmentCache.set(videoId, mediaType, rep.id, segmentNumber, data);
              console.log(
                `[NETWORK FETCH] ${mediaType} segment ${segmentNumber} cached (quality: ${rep.id})`
              );
            }

            // Update throughput
            if (mediaType === "video") {
              updateThroughputMeasurement(
                data.byteLength,
                durationMs,
                mediaType
              );
            }

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

            // Append to buffer
            enqueueOperation(mediaType, () => {
              if (
                !validateSegmentCompatibility(rep.id, mediaType, segmentNumber)
              ) {
                return Promise.resolve();
              }

              return appendBufferSafely(
                sb,
                data,
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
                    `[${
                      isLiveStream ? "LIVE" : "VOD"
                    }] Segment ${segmentNumber} appended`
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
            pendingSegmentOperationsRef.current.delete(operationId);

            if (signal?.aborted) {
              return reject(new DOMException("Aborted", "AbortError"));
            }

            console.error(`Error fetching segment ${segmentNumber}:`, error);

            // For live streams, retry with backoff
            if (
              isLiveStream &&
              mediaType === "video" &&
              error.name !== "AbortError"
            ) {
              console.log(`[LIVE] Retrying segment ${segmentNumber} in 2s...`);
              setTimeout(() => {
                fetchAndAppend(rep, segmentNumber, mediaType, sb, signal)
                  .then(resolve)
                  .catch(reject);
              }, 2000);
            } else {
              resolve(); // Don't fail the whole operation
            }
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
      isLiveStream,
      fetchLiveSegment,
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

      // For live streaming, we never truly "finish" unless stream ends
      if (isLiveStream && mediaType === "video") {
        // Live streams don't have a fixed end
        // We'll keep fetching until explicitly stopped
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
        isQualitySwitch || combinedBufferAhead < 5 // Emergency if combined buffer < 5s
      );

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

      // Mark fetch start for buffer control
      markFetchStart(mediaType);

      if (mediaType === "video") {
        isFetchingVideoRef.current = true;
        isDownloadingRef.current = true;
      } else {
        isFetchingAudioRef.current = true;
      }

      // ✅ Use segmentsToFetch from unified buffer control
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

          // Check if we've reached the end (for VOD only)
          if (
            !isLiveStream &&
            segNum > rep.startNumber + rep.totalSegments - 1
          ) {
            console.log(`[${mediaType}] Reached end of segments: ${segNum}`);
            finishedRef.current = true;
            break;
          }

          // For live streaming, check if we're close to the live edge
          if (isLiveStream && mediaType === "video") {
            const latest = liveLatestSegments.get(`${rep.id}:video`);
            if (latest && segNum > latest) {
              console.log(
                `[LIVE] Segment ${segNum} not available yet, latest is ${latest}`
              );
              // Wait a bit for new segments
              scheduleNextFetch(mediaType, 1000, () => {
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
              break;
            }
          }

          // Create abort controller for this segment (VOD only)
          const controller = new AbortController();
          if (mediaType === "video" && !isLiveStream) {
            abortControllersRef.current.video.push(controller);
          } else if (mediaType === "audio" && !isLiveStream) {
            abortControllersRef.current.audio.push(controller);
          }

          try {
            // Fetch and append the segment
            await fetchAndAppend(
              rep,
              segNum,
              mediaType,
              sb,
              isLiveStream ? undefined : controller.signal
            );

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
            // Clean up abort controller (VOD only)
            if (!isLiveStream) {
              const targetArray =
                mediaType === "video"
                  ? abortControllersRef.current.video
                  : abortControllersRef.current.audio;
              const idx = targetArray.indexOf(controller);
              if (idx !== -1) targetArray.splice(idx, 1);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`[${mediaType}] Error fetching segment:`, err);

          // Retry logic with exponential backoff
          const retryDelay = isLiveStream ? 1000 : 2000; // Shorter delay for live
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
        // For live streaming, always check buffer state quickly
        const checkDelay = isLiveStream ? 100 : 0; // Check more frequently for live

        // Check buffer state again
        const nextBufferCheck = shouldFetchSegment(
          mediaType,
          videoSbRef.current,
          audioSbRef.current,
          videoEl.currentTime,
          false
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
          const delay = Math.max(nextBufferCheck.delay, checkDelay);
          console.log(`[${mediaType}] Scheduling next fetch in ${delay}ms`);
          scheduleNextFetch(mediaType, delay, () => {
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
      isLiveStream,
      liveLatestSegments,
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
            console.log(
              `Cancelled request ${requestId} for ${request.mediaType}`
            );
          } catch (error) {
            console.warn(`Error cancelling request ${requestId}:`, error);
          }
          activeSegmentRequestsRef.current.delete(requestId);
        }
      });

      // Also cancel live streaming if active
      if (isLiveStream && (!mediaType || mediaType === "video")) {
        console.log("[LIVE] Cancelling live stream");
        if (liveVideoStreamRef.current) {
          liveVideoStreamRef.current.cancel();
          liveVideoStreamRef.current = null;
        }
        if (manifestStreamRef.current) {
          manifestStreamRef.current.cancel();
          manifestStreamRef.current = null;
        }

        // Reject all pending live segment promises
        pendingLiveSegmentsRef.current.forEach((pending, key) => {
          if (!specificRepId || key.startsWith(specificRepId)) {
            pending.reject(new Error("Live streaming cancelled"));
          }
        });
        pendingLiveSegmentsRef.current.clear();
      }
    },
    [activeSegmentRequestsRef, isLiveStream]
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
      isLiveStream,
      liveLatestSegments: Array.from(liveLatestSegments.entries()),
    };
  }, [
    videoRef,
    videoSbRef,
    audioSbRef,
    calculateBufferAhead,
    isFetchingVideoRef,
    isFetchingAudioRef,
    isLiveStream,
    liveLatestSegments,
  ]);

  // Live streaming control functions
  const switchToLiveMode = useCallback(() => {
    console.log(`[LIVE] Switching to live mode for video ${videoId}`);
    setIsLiveStream(true);

    // Connect to manifest stream
    connectManifestStream();
  }, [videoId, connectManifestStream]);

  const switchToVodMode = useCallback(() => {
    console.log(`[LIVE] Switching to VOD mode for video ${videoId}`);
    setIsLiveStream(false);

    // Clean up live streaming resources
    if (liveVideoStreamRef.current) {
      liveVideoStreamRef.current.cancel();
      liveVideoStreamRef.current = null;
    }
    if (manifestStreamRef.current) {
      manifestStreamRef.current.cancel();
      manifestStreamRef.current = null;
    }

    // Reject all pending live segment promises
    pendingLiveSegmentsRef.current.forEach((pending) => {
      pending.reject(new Error("Switching to VOD mode"));
    });
    pendingLiveSegmentsRef.current.clear();
  }, [videoId]);

  const cleanupLiveStreaming = useCallback(() => {
    console.log("[LIVE] Cleaning up live streaming resources");

    if (liveVideoStreamRef.current) {
      liveVideoStreamRef.current.cancel();
      liveVideoStreamRef.current = null;
    }
    if (manifestStreamRef.current) {
      manifestStreamRef.current.cancel();
      manifestStreamRef.current = null;
    }

    pendingLiveSegmentsRef.current.forEach((pending) => {
      pending.reject(new Error("Live streaming cleanup"));
    });
    pendingLiveSegmentsRef.current.clear();
  }, []);

  return {
    fetchNextSegment,
    fetchAndAppend,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
    getBufferStats,
    calculateBufferAhead,
    // Live streaming functions
    isLiveStream,
    switchToLiveMode,
    switchToVodMode,
    cleanupLiveStreaming,

    setIsLiveStream,
    liveLatestSegments,
  };
}
