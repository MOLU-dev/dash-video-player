// import { useEffect, useRef, useCallback } from "react";
// import { fetchSegment, fetchInitSegment } from "@/services/segmentFetcher";
// import { getSegmentCache } from "@/lib/segmentCache";
// import type { Representation } from "@/types/player.types";

// interface PrefetchMetadata {
//   videoId: string;
//   videoRepId: string;
//   audioRepId: string;
//   videoRep: Representation;
//   audioRep: Representation;
//   segmentsPrefetched: number;
//   isComplete: boolean;
// }

// interface UseReelPrefetcherProps {
//   videoId: string;
//   activeIndex: number;
//   videos: Array<{ id: string }>;
//   videoRepsMap: Map<
//     string,
//     { video: Representation[]; audio: Representation[] }
//   >;
//   currentThroughput: number; // From your existing ABR
// }

// export function useReelPrefetcher({
//   videoId,
//   activeIndex,
//   videos,
//   videoRepsMap,
//   currentThroughput,
// }: UseReelPrefetcherProps) {
//   const prefetchMetadataRef = useRef(new Map<string, PrefetchMetadata>());
//   const activePrefetchesRef = useRef(new Set<string>());
//   const abortControllersRef = useRef(new Map<string, AbortController>());

//   const segmentCache = getSegmentCache();

//   // Get prefetch metadata for a video
//   const getPrefetchMetadata = useCallback(
//     (targetVideoId: string): PrefetchMetadata | null => {
//       return prefetchMetadataRef.current.get(targetVideoId) || null;
//     },
//     []
//   );

//   // Choose quality for prefetching
//   const choosePrefetchQuality = useCallback(
//     (
//       reps: { video: Representation[]; audio: Representation[] },
//       priority: number
//     ) => {
//       // ALWAYS prefetch HIGHEST quality available
//       // This ensures best experience when user arrives
//       const sortedVideoReps = [...reps.video].sort(
//         (a, b) => b.bandwidth - a.bandwidth
//       );
//       const videoRep = sortedVideoReps[0]; // Highest quality

//       // For audio, also use highest (or there's typically only one)
//       const audioRep = reps.audio[0];

//       return { videoRep, audioRep };
//     },
//     []
//   );

//   // Cancel all ongoing prefetches
//   const cancelAllPrefetches = useCallback(() => {
//     abortControllersRef.current.forEach((controller) => {
//       controller.abort();
//     });
//     abortControllersRef.current.clear();
//     activePrefetchesRef.current.clear();
//   }, []);

//   // Prefetch a single video
//   const prefetchVideo = useCallback(
//     async (
//       targetVideoId: string,
//       priority: number,
//       segmentsToFetch: number = 10
//     ): Promise<void> => {
//       if (targetVideoId === videoId) return;
//       if (activePrefetchesRef.current.has(targetVideoId)) return;

//       const reps = videoRepsMap.get(targetVideoId);
//       if (!reps || !reps.video.length || !reps.audio.length) return;

//       // Choose HIGHEST quality for prefetch
//       const { videoRep, audioRep } = choosePrefetchQuality(reps, priority);

//       console.log(
//         `[PREFETCH] Starting ${targetVideoId} - Quality: ${
//           videoRep.height
//         }p (${Math.round(videoRep.bandwidth / 1000)}kbps)`
//       );

//       activePrefetchesRef.current.add(targetVideoId);
//       const abortController = new AbortController();
//       abortControllersRef.current.set(targetVideoId, abortController);

//       // Store metadata BEFORE prefetching
//       const metadata: PrefetchMetadata = {
//         videoId: targetVideoId,
//         videoRepId: videoRep.id,
//         audioRepId: audioRep.id,
//         videoRep,
//         audioRep,
//         segmentsPrefetched: 0,
//         isComplete: false,
//       };
//       prefetchMetadataRef.current.set(targetVideoId, metadata);

//       try {
//         // Step 1: Prefetch init segments
//         const [videoInitSeg, audioInitSeg] = await Promise.all([
//           fetchInitSegment(targetVideoId, videoRep, "video"),
//           fetchInitSegment(targetVideoId, audioRep, "audio"),
//         ]);

//         if (abortController.signal.aborted) return;

//         // Cache init segments with rep ID
//         segmentCache.setInitSegment(
//           targetVideoId,
//           "video",
//           videoRep.id,
//           videoInitSeg
//         );
//         segmentCache.setInitSegment(
//           targetVideoId,
//           "audio",
//           audioRep.id,
//           audioInitSeg
//         );

//         console.log(
//           `[PREFETCH] ${targetVideoId} - Init segments cached (video: ${videoRep.id}, audio: ${audioRep.id})`
//         );

//         // Step 2: Prefetch media segments
//         const startSegment = videoRep.startNumber;
//         const PARALLEL_LIMIT = 3;

//         for (let i = 0; i < segmentsToFetch; i += PARALLEL_LIMIT) {
//           if (abortController.signal.aborted) break;

//           const batchPromises: Promise<void>[] = [];

//           for (let j = 0; j < PARALLEL_LIMIT && i + j < segmentsToFetch; j++) {
//             const segNum = startSegment + i + j;

//             // Check cache first
//             const cachedVideoSeg = segmentCache.get(
//               targetVideoId,
//               "video",
//               videoRep.id,
//               segNum
//             );
//             const cachedAudioSeg = segmentCache.get(
//               targetVideoId,
//               "audio",
//               audioRep.id,
//               segNum
//             );

//             if (!cachedVideoSeg) {
//               batchPromises.push(
//                 fetchSegment({
//                   videoId: targetVideoId,
//                   rep: videoRep,
//                   segmentNumber: segNum,
//                   mediaType: "video",
//                   signal: abortController.signal,
//                 }).then((data) => {
//                   segmentCache.set(
//                     targetVideoId,
//                     "video",
//                     videoRep.id,
//                     segNum,
//                     data
//                   );
//                   metadata.segmentsPrefetched++;
//                 })
//               );
//             }

//             if (!cachedAudioSeg) {
//               batchPromises.push(
//                 fetchSegment({
//                   videoId: targetVideoId,
//                   rep: audioRep,
//                   segmentNumber: segNum,
//                   mediaType: "audio",
//                   signal: abortController.signal,
//                 }).then((data) => {
//                   segmentCache.set(
//                     targetVideoId,
//                     "audio",
//                     audioRep.id,
//                     segNum,
//                     data
//                   );
//                 })
//               );
//             }
//           }

//           await Promise.all(batchPromises).catch((err) => {
//             if (err.name !== "AbortError") {
//               console.warn(`Prefetch batch error for ${targetVideoId}:`, err);
//             }
//           });
//         }

//         metadata.isComplete = true;
//         console.log(
//           `[PREFETCH] ✅ ${targetVideoId} complete - ${metadata.segmentsPrefetched} video segments at ${videoRep.height}p`
//         );
//       } catch (error: any) {
//         if (error.name !== "AbortError") {
//           console.error(`Prefetch error for ${targetVideoId}:`, error);
//         }
//       } finally {
//         activePrefetchesRef.current.delete(targetVideoId);
//         abortControllersRef.current.delete(targetVideoId);
//       }
//     },
//     [videoId, videoRepsMap, segmentCache, choosePrefetchQuality]
//   );

//   // Process prefetch queue
//   const processPrefetchQueue = useCallback(async () => {
//     const queue: Array<{
//       videoId: string;
//       priority: number;
//       segments: number;
//     }> = [];

//     videos.forEach((video, index) => {
//       const distance = Math.abs(index - activeIndex);
//       if (index === activeIndex) return;

//       if (distance === 1) {
//         queue.push({ videoId: video.id, priority: 1, segments: 15 }); // Next: 15 segments
//       } else if (distance === 2) {
//         queue.push({ videoId: video.id, priority: 2, segments: 10 }); // ±2: 10 segments
//       } else if (distance === 3) {
//         queue.push({ videoId: video.id, priority: 3, segments: 5 }); // ±3: 5 segments
//       }
//     });

//     // Sort by priority
//     queue.sort((a, b) => a.priority - b.priority);

//     // Prefetch in priority order
//     for (const item of queue) {
//       await prefetchVideo(item.videoId, item.priority, item.segments);
//     }
//   }, [activeIndex, videos, prefetchVideo]);

//   // Update prefetch when active index changes
//   useEffect(() => {
//     cancelAllPrefetches();
//     processPrefetchQueue();
//   }, [activeIndex, processPrefetchQueue, cancelAllPrefetches]);

//   // Cleanup
//   useEffect(() => {
//     return () => {
//       cancelAllPrefetches();
//     };
//   }, [cancelAllPrefetches]);

//   return {
//     getPrefetchMetadata,
//     prefetchMetadata: prefetchMetadataRef.current,
//     cancelAllPrefetches,
//   };
// }



import { useEffect, useRef, useCallback } from "react";
import { fetchSegment, fetchInitSegment } from "@/services/segmentFetcher";
import { getSegmentCache } from "@/lib/segmentCache";
import type { Representation } from "@/types/player.types";

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
  videoRepsMap: Map<
    string,
    { video: Representation[]; audio: Representation[] }
  >;
  // Make currentThroughput optional
  currentThroughput?: number;
}

export function useReelPrefetcher({
  videoId,
  activeIndex,
  videos,
  videoRepsMap,
  currentThroughput = 5000000, // Default to 5 Mbps if not provided
}: UseReelPrefetcherProps) {
  const prefetchMetadataRef = useRef(new Map<string, PrefetchMetadata>());
  const activePrefetchesRef = useRef(new Set<string>());
  const abortControllersRef = useRef(new Map<string, AbortController>());

  const segmentCache = getSegmentCache();

  // Get prefetch metadata for a video
  const getPrefetchMetadata = useCallback(
    (targetVideoId: string): PrefetchMetadata | null => {
      return prefetchMetadataRef.current.get(targetVideoId) || null;
    },
    []
  );

  // Choose quality for prefetching
  const choosePrefetchQuality = useCallback(
    (
      reps: { video: Representation[]; audio: Representation[] },
      priority: number
    ) => {
      // ALWAYS prefetch HIGHEST quality available
      const sortedVideoReps = [...reps.video].sort(
        (a, b) => b.bandwidth - a.bandwidth
      );

      // If we have throughput info, choose a quality that matches it
      let videoRep;
      if (currentThroughput) {
        // Find the highest quality that doesn't exceed throughput
        for (const rep of sortedVideoReps) {
          if (rep.bandwidth <= currentThroughput * 0.8) {
            // 80% safety margin
            videoRep = rep;
            break;
          }
        }
      }

      // Fallback to highest quality
      if (!videoRep) {
        videoRep = sortedVideoReps[0];
      }

      // For audio, use the first one (usually only one)
      const audioRep = reps.audio[0];

      return { videoRep, audioRep };
    },
    [currentThroughput]
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

      // Choose quality for prefetch
      const { videoRep, audioRep } = choosePrefetchQuality(reps, priority);

      console.log(
        `[PREFETCH] Starting ${targetVideoId} - Quality: ${
          videoRep.height || "N/A"
        }p (${Math.round(videoRep.bandwidth / 1000)}kbps)`
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
          fetchInitSegment(targetVideoId, videoRep, "video"),
          fetchInitSegment(targetVideoId, audioRep, "audio"),
        ]);

        if (abortController.signal.aborted) return;

        // Cache init segments with rep ID
        segmentCache.setInitSegment(
          targetVideoId,
          "video",
          videoRep.id,
          videoInitSeg
        );
        segmentCache.setInitSegment(
          targetVideoId,
          "audio",
          audioRep.id,
          audioInitSeg
        );

        console.log(
          `[PREFETCH] ${targetVideoId} - Init segments cached (video: ${videoRep.id}, audio: ${audioRep.id})`
        );

        // Step 2: Prefetch media segments
        const startSegment = videoRep.startNumber;
        const PARALLEL_LIMIT = 2; // Reduced to avoid overwhelming

        for (let i = 0; i < segmentsToFetch; i += PARALLEL_LIMIT) {
          if (abortController.signal.aborted) break;

          const batchPromises: Promise<void>[] = [];

          for (let j = 0; j < PARALLEL_LIMIT && i + j < segmentsToFetch; j++) {
            const segNum = startSegment + i + j;

            // Check cache first
            const cachedVideoSeg = segmentCache.get(
              targetVideoId,
              "video",
              videoRep.id,
              segNum
            );
            const cachedAudioSeg = segmentCache.get(
              targetVideoId,
              "audio",
              audioRep.id,
              segNum
            );

            if (!cachedVideoSeg) {
              batchPromises.push(
                fetchSegment({
                  videoId: targetVideoId,
                  rep: videoRep,
                  segmentNumber: segNum,
                  mediaType: "video",
                  signal: abortController.signal,
                }).then((data) => {
                  segmentCache.set(
                    targetVideoId,
                    "video",
                    videoRep.id,
                    segNum,
                    data
                  );
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
                  mediaType: "audio",
                  signal: abortController.signal,
                }).then((data) => {
                  segmentCache.set(
                    targetVideoId,
                    "audio",
                    audioRep.id,
                    segNum,
                    data
                  );
                })
              );
            }
          }

          await Promise.all(batchPromises).catch((err) => {
            if (err.name !== "AbortError") {
              console.warn(`Prefetch batch error for ${targetVideoId}:`, err);
            }
          });
        }

        metadata.isComplete = true;
        console.log(
          `[PREFETCH] ✅ ${targetVideoId} complete - ${
            metadata.segmentsPrefetched
          } video segments at ${videoRep.height || "N/A"}p`
        );
      } catch (error: any) {
        if (error.name !== "AbortError") {
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
    const queue: Array<{
      videoId: string;
      priority: number;
      segments: number;
    }> = [];

    videos.forEach((video, index) => {
      const distance = Math.abs(index - activeIndex);
      if (index === activeIndex) return;

      if (distance === 1) {
        queue.push({ videoId: video.id, priority: 1, segments: 8 }); // Next: 8 segments
      } else if (distance === 2) {
        queue.push({ videoId: video.id, priority: 2, segments: 4 }); // ±2: 4 segments
      } else if (distance === 3) {
        queue.push({ videoId: video.id, priority: 3, segments: 2 }); // ±3: 2 segments
      }
    });

    // Sort by priority
    queue.sort((a, b) => a.priority - b.priority);

    // Prefetch in priority order (limit concurrent)
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