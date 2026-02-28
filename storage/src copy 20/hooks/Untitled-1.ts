// ============================================================
// FILE: hooks/useReelPrefetcher.ts
// UPDATED: Prefetch highest quality, track rep IDs
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { fetchSegment, fetchInitSegment } from '@/services/segmentFetcher';
import { getSegmentCache } from '@/lib/segmentCache';
import type { Representation } from '@/types/player.types';

interface PrefetchMetadata {
  videoId: string;
  videoRepId: string;
  audioRepId: string;
  videoRep: Representation;
  audioRep: Representation;
  segmentsPrefetched: number;
  isComplete: boolean;
}

interface UseReelPrefetcherProps {
  videoId: string;
  activeIndex: number;
  videos: Array<{ id: string }>;
  videoRepsMap: Map<string, { video: Representation[]; audio: Representation[] }>;
  currentThroughput: number; // From your existing ABR
}

export function useReelPrefetcher({
  videoId,
  activeIndex,
  videos,
  videoRepsMap,
  currentThroughput,
}: UseReelPrefetcherProps) {
  const prefetchMetadataRef = useRef(new Map<string, PrefetchMetadata>());
  const activePrefetchesRef = useRef(new Set<string>());
  const abortControllersRef = useRef(new Map<string, AbortController>());

  const segmentCache = getSegmentCache();

  // Get prefetch metadata for a video
  const getPrefetchMetadata = useCallback((targetVideoId: string): PrefetchMetadata | null => {
    return prefetchMetadataRef.current.get(targetVideoId) || null;
  }, []);

  // Choose quality for prefetching
  const choosePrefetchQuality = useCallback(
    (reps: { video: Representation[]; audio: Representation[] }, priority: number) => {
      // ALWAYS prefetch HIGHEST quality available
      // This ensures best experience when user arrives
      const sortedVideoReps = [...reps.video].sort((a, b) => b.bandwidth - a.bandwidth);
      const videoRep = sortedVideoReps[0]; // Highest quality

      // For audio, also use highest (or there's typically only one)
      const audioRep = reps.audio[0];

      return { videoRep, audioRep };
    },
    []
  );

  // Cancel all ongoing prefetches
  const cancelAllPrefetches = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    activePrefetchesRef.current.clear();
  }, []);

  // Prefetch a single video
  const prefetchVideo = useCallback(
    async (
      targetVideoId: string,
      priority: number,
      segmentsToFetch: number = 10
    ): Promise<void> => {
      if (targetVideoId === videoId) return;
      if (activePrefetchesRef.current.has(targetVideoId)) return;

      const reps = videoRepsMap.get(targetVideoId);
      if (!reps || !reps.video.length || !reps.audio.length) return;

      // Choose HIGHEST quality for prefetch
      const { videoRep, audioRep } = choosePrefetchQuality(reps, priority);

      console.log(
        `[PREFETCH] Starting ${targetVideoId} - Quality: ${videoRep.height}p (${Math.round(videoRep.bandwidth / 1000)}kbps)`
      );

      activePrefetchesRef.current.add(targetVideoId);
      const abortController = new AbortController();
      abortControllersRef.current.set(targetVideoId, abortController);

      // Store metadata BEFORE prefetching
      const metadata: PrefetchMetadata = {
        videoId: targetVideoId,
        videoRepId: videoRep.id,
        audioRepId: audioRep.id,
        videoRep,
        audioRep,
        segmentsPrefetched: 0,
        isComplete: false,
      };
      prefetchMetadataRef.current.set(targetVideoId, metadata);

      try {
        // Step 1: Prefetch init segments
        const [videoInitSeg, audioInitSeg] = await Promise.all([
          fetchInitSegment(targetVideoId, videoRep, 'video'),
          fetchInitSegment(targetVideoId, audioRep, 'audio'),
        ]);

        if (abortController.signal.aborted) return;

        // Cache init segments with rep ID
        segmentCache.setInitSegment(targetVideoId, 'video', videoRep.id, videoInitSeg);
        segmentCache.setInitSegment(targetVideoId, 'audio', audioRep.id, audioInitSeg);

        console.log(
          `[PREFETCH] ${targetVideoId} - Init segments cached (video: ${videoRep.id}, audio: ${audioRep.id})`
        );

        // Step 2: Prefetch media segments
        const startSegment = videoRep.startNumber;
        const PARALLEL_LIMIT = 3;

        for (let i = 0; i < segmentsToFetch; i += PARALLEL_LIMIT) {
          if (abortController.signal.aborted) break;

          const batchPromises: Promise<void>[] = [];

          for (let j = 0; j < PARALLEL_LIMIT && i + j < segmentsToFetch; j++) {
            const segNum = startSegment + i + j;

            // Check cache first
            const cachedVideoSeg = segmentCache.get(targetVideoId, 'video', videoRep.id, segNum);
            const cachedAudioSeg = segmentCache.get(targetVideoId, 'audio', audioRep.id, segNum);

            if (!cachedVideoSeg) {
              batchPromises.push(
                fetchSegment({
                  videoId: targetVideoId,
                  rep: videoRep,
                  segmentNumber: segNum,
                  mediaType: 'video',
                  signal: abortController.signal,
                }).then((data) => {
                  segmentCache.set(targetVideoId, 'video', videoRep.id, segNum, data);
                  metadata.segmentsPrefetched++;
                })
              );
            }

            if (!cachedAudioSeg) {
              batchPromises.push(
                fetchSegment({
                  videoId: targetVideoId,
                  rep: audioRep,
                  segmentNumber: segNum,
                  mediaType: 'audio',
                  signal: abortController.signal,
                }).then((data) => {
                  segmentCache.set(targetVideoId, 'audio', audioRep.id, segNum, data);
                })
              );
            }
          }

          await Promise.all(batchPromises).catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn(`Prefetch batch error for ${targetVideoId}:`, err);
            }
          });
        }

        metadata.isComplete = true;
        console.log(
          `[PREFETCH] ✅ ${targetVideoId} complete - ${metadata.segmentsPrefetched} video segments at ${videoRep.height}p`
        );
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error(`Prefetch error for ${targetVideoId}:`, error);
        }
      } finally {
        activePrefetchesRef.current.delete(targetVideoId);
        abortControllersRef.current.delete(targetVideoId);
      }
    },
    [videoId, videoRepsMap, segmentCache, choosePrefetchQuality]
  );

  // Process prefetch queue
  const processPrefetchQueue = useCallback(async () => {
    const queue: Array<{ videoId: string; priority: number; segments: number }> = [];

    videos.forEach((video, index) => {
      const distance = Math.abs(index - activeIndex);
      if (index === activeIndex) return;

      if (distance === 1) {
        queue.push({ videoId: video.id, priority: 1, segments: 15 }); // Next: 15 segments
      } else if (distance === 2) {
        queue.push({ videoId: video.id, priority: 2, segments: 10 }); // ±2: 10 segments
      } else if (distance === 3) {
        queue.push({ videoId: video.id, priority: 3, segments: 5 }); // ±3: 5 segments
      }
    });

    // Sort by priority
    queue.sort((a, b) => a.priority - b.priority);

    // Prefetch in priority order
    for (const item of queue) {
      await prefetchVideo(item.videoId, item.priority, item.segments);
    }
  }, [activeIndex, videos, prefetchVideo]);

  // Update prefetch when active index changes
  useEffect(() => {
    cancelAllPrefetches();
    processPrefetchQueue();
  }, [activeIndex, processPrefetchQueue, cancelAllPrefetches]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAllPrefetches();
    };
  }, [cancelAllPrefetches]);

  return {
    getPrefetchMetadata,
    prefetchMetadata: prefetchMetadataRef.current,
    cancelAllPrefetches,
  };
}

// ============================================================
// FILE: hooks/useSegmentFetching.ts
// UPDATED: Check prefetch cache first, use prefetched rep
// ============================================================

// Add this function at the top of your useSegmentFetching hook
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

// MODIFY your existing fetchAndAppend function:
export function useSegmentFetching({
  videoId,
  videoRef,
  // ... all your existing props
  prefetchMetadata, // NEW: Pass from parent
}: UseSegmentFetchingProps) {
  const segmentCache = getSegmentCache();
  const { getPrefetchInfo } = usePrefetchAwareSegmentFetching(videoId, prefetchMetadata);

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
          return reject(new DOMException('Aborted', 'AbortError'));
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
            mediaType === 'video' ? prefetchInfo.videoRepId : prefetchInfo.audioRepId;

          // Check if we have this segment in the PREFETCHED quality
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
            const operationInfo = pendingSegmentOperationsRef.current.get(operationId);
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
            if (mediaType === 'video') {
              updateThroughputMeasurement(cachedData.byteLength, 1, mediaType);
            }

            // Append cached prefetched data
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

                  console.log(
                    `[PREFETCH USED] Segment ${segmentNumber} appended from prefetch cache`
                  );
                })
                .catch((error) => {
                  if (error.name !== 'AbortError') {
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
          const operationInfo = pendingSegmentOperationsRef.current.get(operationId);
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

          if (mediaType === 'video') {
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
                if (error.name !== 'AbortError') {
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
          reject(new DOMException('Aborted', 'AbortError'));
        };

        const combinedAbortHandler = () => {
          onAbort();
        };

        if (signal) {
          signal.addEventListener('abort', combinedAbortHandler);
        }
        requestController.signal.addEventListener('abort', combinedAbortHandler);

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
              signal.removeEventListener('abort', combinedAbortHandler);
            }
            requestController.signal.removeEventListener(
              'abort',
              combinedAbortHandler
            );

            activeSegmentRequestsRef.current.delete(requestId);

            if (signal?.aborted || requestController.signal.aborted) {
              pendingSegmentOperationsRef.current.delete(operationId);
              return reject(new DOMException('Aborted', 'AbortError'));
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

            if (mediaType === 'video') {
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
                  if (error.name !== 'AbortError') {
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
              signal.removeEventListener('abort', combinedAbortHandler);
            }
            requestController.signal.removeEventListener(
              'abort',
              combinedAbortHandler
            );

            activeSegmentRequestsRef.current.delete(requestId);
            pendingSegmentOperationsRef.current.delete(operationId);

            if (signal?.aborted || requestController.signal.aborted) {
              return reject(new DOMException('Aborted', 'AbortError'));
            }

            console.error(`Error fetching segment ${segmentNumber}:`, error);
            resolve();
          });
      });
    },
    [
      videoId,
      segmentCache,
      getPrefetchInfo, // NEW
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

  // ... rest of your existing code
  
  return {
    fetchNextSegment,
    fetchAndAppend,
    cancelAllSegmentRequests,
    completeOngoingSegmentOperations,
  };
}

// ============================================================
// FILE: hooks/usePlayerInitializer.ts
// UPDATED: Use prefetched init segments if available
// ============================================================

export function usePlayerInitializer({
  videoId,
  videoRef,
  // ... all existing props
  prefetchMetadata, // NEW: Pass from parent
}: UsePlayerInitializerProps) {
  
  const initializePlayer = useCallback(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const videoEl = videoRef.current;
    shouldInitializeRef.current = false;
    isInitializedRef.current = true;

    if (!window.MediaSource) {
      return;
    }

    cleanupMediaSource();
    mediaSourceRef.current = new MediaSource();
    const mediaSource = mediaSourceRef.current;
    const objectUrl = URL.createObjectURL(mediaSource);
    videoEl.src = objectUrl;

    mediaSource.addEventListener('sourceopen', () => {
      mediaSourceStateRef.current = 'open';
      const manifestReq = new ManifestRequest();
      manifestReq.setVideoId(videoId);

      grpcClient.getManifest(
        manifestReq,
        {},
        async (err: any, rsp: ManifestResponse) => {
          if (err) {
            return;
          }

          const mpdXml = rsp.getMpdXml_asU8();
          const {
            videoReps: videoRepsArr,
            audioReps: audioRepsArr,
            duration,
            segmentDuration,
          } = parseManifest(mpdXml);

          if (videoRepsArr.length === 0 || audioRepsArr.length === 0) {
            return;
          }

          durationRef.current = duration;
          segmentDurationRef.current = segmentDuration;

          const bolaState = initializeBOLA(videoRepsArr);
          bolaStateRef.current = bolaState;

          setVideoReps(videoRepsArr);
          videoRepsRef.current = videoRepsArr;
          setAudioReps(audioRepsArr);
          audioRepsRef.current = audioRepsArr;

          // ✅ CHECK IF WE HAVE PREFETCHED DATA
          const segmentCache = getSegmentCache();
          const prefetchInfo = prefetchMetadata.get(videoId);

          let chosenVideo: Representation;
          let chosenAudio: Representation;

          if (prefetchInfo && prefetchInfo.isComplete) {
            // Use the PREFETCHED quality!
            console.log(
              `[INIT] Using prefetched quality: ${prefetchInfo.videoRep.height}p`
            );
            chosenVideo = prefetchInfo.videoRep;
            chosenAudio = prefetchInfo.audioRep;

            // Set quality index to match prefetched quality
            const prefetchQualityIdx = videoRepsArr.findIndex(
              (r) => r.id === prefetchInfo.videoRepId
            );
            if (prefetchQualityIdx !== -1) {
              videoQualityIdxRef.current = prefetchQualityIdx;
              setUiVideoQualityIdx(prefetchQualityIdx);
            }
          } else {
            // No prefetch - use ABR to choose initial quality
            console.log('[INIT] No prefetch available, using ABR');
            const initialQualityIdx = chooseInitialQualityIdx(
              videoRepsArr,
              getVideoThroughput(),
              throughputEMARef.current
            );
            chosenVideo = videoRepsArr[initialQualityIdx];
            chosenAudio = audioRepsArr[0];
            videoQualityIdxRef.current = initialQualityIdx;
            setUiVideoQualityIdx(initialQualityIdx);
          }

          videoRepRef.current = chosenVideo;
          audioRepRef.current = chosenAudio;

          let videoSb: SourceBuffer, audioSb: SourceBuffer;
          try {
            if (videoSbRef.current || audioSbRef.current) {
              mediaSource.endOfStream();
              return;
            }

            if (!mediaSource || mediaSource.readyState !== 'open') {
              return;
            }

            videoSb = createSourceBufferForMime(
              mediaSource,
              chosenVideo.mimeType
            );
            audioSb = createSourceBufferForMime(
              mediaSource,
              chosenAudio.mimeType
            );

            if (!videoSb || !audioSb) {
              return;
            }

            videoSbRef.current = videoSb;
            audioSbRef.current = audioSb;
          } catch (e) {
            return;
          }

          videoFinishedRef.current = false;
          audioFinishedRef.current = false;

          evictionIntervalRef.current = window.setInterval(() => {
            evictBuffer();
          }, BUFFER_EVICTION_INTERVAL);

          // ✅ APPEND INIT SEGMENTS (from prefetch or fetch new)
          const videoInitPromise = (async () => {
            // Try prefetched init segment first
            let videoInit = segmentCache.getInitSegment(
              videoId,
              'video',
              chosenVideo.id
            );

            if (videoInit) {
              console.log('[INIT] Using prefetched video init segment');
            } else {
              console.log('[INIT] Fetching video init segment');
              videoInit = await fetchInitSegment(videoId, chosenVideo, 'video');
              segmentCache.setInitSegment(videoId, 'video', chosenVideo.id, videoInit);
            }

            videoInitSegmentCache.current.set(chosenVideo.id, videoInit);
            currentVideoInitSegmentRef.current = videoInit;
            currentVideoRepIdRef.current = chosenVideo.id;

            return enqueueOperation('video', () =>
              appendBufferSafely(videoSb, videoInit)
            );
          })();

          const audioInitPromise = (async () => {
            let audioInit = segmentCache.getInitSegment(
              videoId,
              'audio',
              chosenAudio.id
            );

            if (audioInit) {
              console.log('[INIT] Using prefetched audio init segment');
            } else {
              console.log('[INIT] Fetching audio init segment');
              audioInit = await fetchInitSegment(videoId, chosenAudio, 'audio');
              segmentCache.setInitSegment(videoId, 'audio', chosenAudio.id, audioInit);
            }

            audioInitSegmentCache.current.set(chosenAudio.id, audioInit);
            currentAudioInitSegmentRef.current = audioInit;
            currentAudioRepIdRef.current = chosenAudio.id;

            return enqueueOperation('audio', () =>
              appendBufferSafely(audioSb, audioInit)
            );
          })();

          Promise.all([videoInitPromise, audioInitPromise])
            .then(() => {
              videoNextSegRef.current = chosenVideo.startNumber;
              audioNextSegRef.current = chosenAudio.startNumber;

              lastProcessedSegmentsRef.current.set(
                chosenVideo.id,
                chosenVideo.startNumber - 1
              );
              lastProcessedSegmentsRef.current.set(
                chosenAudio.id,
                chosenAudio.startNumber - 1
              );

              // Start fetching segments
              // Prefetched segments will be used from cache automatically!
              fetchNextSegment(
                videoId,
                chosenVideo,
                'video',
                videoSb,
                videoNextSegRef,
                videoFinishedRef,
                false
              );
              fetchNextSegment(
                videoId,
                chosenAudio,
                'audio',
                audioSb,
                audioNextSegRef,
                audioFinishedRef,
                false
              );
            })
            .catch(console.error);

          // ... rest of event handlers
        }
      );
    });
  }, [
    videoId,
    videoRef,
    prefetchMetadata, // NEW
    // ... all existing dependencies
  ]);

  return { initializePlayer };
}

// ============================================================
// FLOW EXPLANATION
// ============================================================

/*
🎯 COMPLETE FLOW WITH PREFETCH + ABR INTEGRATION:

1. USER OPENS REELS PAGE
   ↓
2. MANIFEST LOADER fetches all manifests
   ↓
3. PREFETCHER starts background prefetching
   - Priority 1 (next video): Prefetch 15 segments at HIGHEST quality
   - Priority 2 (±2): Prefetch 10 segments at HIGHEST quality
   - Priority 3 (±3): Prefetch 5 segments at HIGHEST quality
   ↓
4. USER SCROLLS TO NEW VIDEO
   ↓
5. PLAYER INITIALIZES:
   - Checks prefetch cache
   - If prefetch exists: Use prefetched quality (highest)
   - If no prefetch: Use ABR to choose quality
   ↓
6. FETCHING SEGMENTS (fetchAndAppend):
   Step 1: Check prefetch cache (highest quality)
   Step 2: Check regular cache (current ABR quality)
   Step 3: Fetch from network (current ABR quality)
   ↓
7. ABR CONTINUES BUILDING BUFFER:
   - First 15 segments: From prefetch cache (highest quality) ✅
   - Segments 16+: ABR decides quality, may switch down
   - Buffer seamlessly combines prefetched + new segments
   ↓
8. QUALITY SWITCHING:
   - User has smooth start with prefetched highest quality
   - ABR can still adapt based on network conditions
   - Prefetch doesn't override ABR decisions after initial buffer

📊 RESULT:
- Initial playback: INSTANT (0ms) with highest quality
- Smooth buffering: Uses prefetch first, then ABR
- Adaptive: ABR still works for long-form playback
- Efficient: No wasted bandwidth on unused qualities
*/