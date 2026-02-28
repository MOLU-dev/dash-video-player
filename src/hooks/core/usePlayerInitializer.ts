import { useCallback, useEffect } from "react";
import type {
  Representation,
  BOLAState,
  EnhancedBOLAState,
  PrefetchMetadata,
} from "@/types/player.types";
import { grpcClient } from "@/utils/grpcClient";
import { ManifestRequest, ManifestResponse } from "@/proto/rpc_stream_pb";
import { parseManifest } from "@/services/manifestParser";
import { fetchInitSegment } from "@/services/segmentFetcher";
import { createSourceBufferForMime } from "@/utils/dashHelpers";
import { appendBufferSafely } from "@/utils/bufferHelpers";
import {
  initializeBOLA,
  chooseInitialQualityIdx,
} from "@/utils/qualityHelpers";
import {
  REBUFFER_THRESHOLD,
  BUFFER_EVICTION_INTERVAL,
} from "@/constants/player.constants";

import { getSegmentCache } from "@/lib/segmentCache";

interface UsePlayerInitializerProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitializedRef: React.RefObject<boolean>;
  shouldInitializeRef: React.RefObject<boolean>;
  cleanupMediaSource: () => void;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  mediaSourceStateRef: React.RefObject<"closed" | "open" | "ended">;
  videoSbRef: React.RefObject<SourceBuffer | null>;
  audioSbRef: React.RefObject<SourceBuffer | null>;
  videoRepsRef: React.RefObject<Representation[]>;
  audioRepsRef: React.RefObject<Representation[]>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  durationRef: React.RefObject<number>;
  segmentDurationRef: React.RefObject<number>;
  videoQualityIdxRef: React.RefObject<number>;
  lastTimeUpdateRef: React.RefObject<number>;
  lastBufferGapRef: React.RefObject<number>;
  isStalledRef: React.RefObject<boolean>;
  isSeekingRef: React.RefObject<boolean>;
  isInOnlineRecoveryRef: React.RefObject<boolean>;
  isOnlineRef: React.RefObject<boolean>;
  evictionIntervalRef: React.RefObject<number | null>;
  bolaStateRef: React.RefObject<BOLAState | EnhancedBOLAState | null>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  audioInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  throughputEMARef: React.RefObject<number>;
  setVideoReps: React.Dispatch<React.SetStateAction<Representation[]>>;
  setAudioReps: React.Dispatch<React.SetStateAction<Representation[]>>;
  setUiVideoQualityIdx: React.Dispatch<React.SetStateAction<number>>;
  getVideoThroughput: () => number;
  enqueueOperation: (
    mediaType: "video" | "audio",
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: "video" | "audio",
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  handleStall: () => Promise<void>;
  resetStreamForSeek: (time: number) => Promise<void>;
  switchQuality: (newIdx: number) => Promise<void>;
  evictBuffer: () => void;
  abortAllRequests: () => void;
  tryEndStream: () => void;
  setShowReplay: React.Dispatch<React.SetStateAction<boolean>>;
  onPause: () => void;
  onPlayResume: () => void;

  savedPosition?: number | null;
  prefetchMetadata?: Map<string, PrefetchMetadata>;
  isLiveRef: React.RefObject<boolean>;
  setIsLive: React.Dispatch<React.SetStateAction<boolean>>;
  hasPlaybackStarted: boolean;
  setHasPlaybackStarted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePlayerInitializer({
  videoId,
  videoRef,
  isInitializedRef,
  shouldInitializeRef,
  cleanupMediaSource,
  mediaSourceRef,
  mediaSourceStateRef,
  videoSbRef,
  audioSbRef,
  videoRepsRef,
  audioRepsRef,
  videoRepRef,
  audioRepRef,
  videoNextSegRef,
  audioNextSegRef,
  videoFinishedRef,
  audioFinishedRef,
  durationRef,
  segmentDurationRef,
  videoQualityIdxRef,
  lastTimeUpdateRef,
  lastBufferGapRef,
  isStalledRef,
  isSeekingRef,
  isInOnlineRecoveryRef,
  isOnlineRef,
  evictionIntervalRef,
  bolaStateRef,
  videoInitSegmentCache,
  audioInitSegmentCache,
  currentVideoInitSegmentRef,
  currentAudioInitSegmentRef,
  currentVideoRepIdRef,
  currentAudioRepIdRef,
  lastProcessedSegmentsRef,
  throughputEMARef,
  setVideoReps,
  setAudioReps,
  setUiVideoQualityIdx,
  getVideoThroughput,
  enqueueOperation,
  fetchNextSegment,
  handleStall,
  resetStreamForSeek,
  switchQuality,
  evictBuffer,
  abortAllRequests,
  tryEndStream,
  setShowReplay,
  onPause,
  onPlayResume,
  prefetchMetadata = new Map(),
  savedPosition = null,
  isLiveRef,
  setIsLive,
  hasPlaybackStarted,
  setHasPlaybackStarted,
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

     mediaSource.addEventListener("sourceopen", () => {
       mediaSourceStateRef.current = "open";
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
             isLive,
           } = parseManifest(mpdXml);

           if (videoRepsArr.length === 0 || audioRepsArr.length === 0) {
             return;
           }

           durationRef.current = duration;
           segmentDurationRef.current = segmentDuration;
           isLiveRef.current = isLive;
           setIsLive(isLive);
           if (isLive) setHasPlaybackStarted(true);

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
             console.log("[INIT] No prefetch available, using ABR");
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

             if (!mediaSource || mediaSource.readyState !== "open") {
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

             if (duration > 0 || duration === Infinity) {
               mediaSource.duration = duration;
             }
           } catch (e) {
             return;
           }

           videoFinishedRef.current = false;
           audioFinishedRef.current = false;

           evictionIntervalRef.current = window.setInterval(() => {
             evictBuffer();
           }, BUFFER_EVICTION_INTERVAL);

           //  CALCULATE STARTING SEGMENT BASED ON SAVED POSITION
           let videoStartSegment = chosenVideo.startNumber;
           let audioStartSegment = chosenAudio.startNumber;
           let initialSeekTime = savedPosition && savedPosition > 0 ? savedPosition : 0;

           // If live and no saved position, start at live edge
           if (isLive) {
              if (initialSeekTime === 0) {
                // Calculate live edge based on latest available segment
                const vidMaxSeg = chosenVideo.startNumber + chosenVideo.totalSegments - 1;
                // Recalculate segment duration just in case
                const segDur = chosenVideo.segmentDur / chosenVideo.timescale;
                const liveTime = vidMaxSeg * segDur;
                
                // Start 3 segments back from live edge
                initialSeekTime = Math.max(0, liveTime - (segDur * 3));
                videoStartSegment = Math.max(chosenVideo.startNumber, vidMaxSeg - 2);
                audioStartSegment = Math.max(chosenAudio.startNumber, (chosenAudio.startNumber + chosenAudio.totalSegments - 1) - 2);
                
                console.log(`[INIT] Live stream: edge ${liveTime}s, starting at ${initialSeekTime}s`);
              }
           } else if (initialSeekTime > 0) {
             console.log(`[INIT] Seeking to position: ${initialSeekTime}s`);
           }

           if (initialSeekTime > 0) {
             // Calculate which segment contains the starting position
             const segmentIndex = Math.floor(initialSeekTime / segmentDuration);
             videoStartSegment = chosenVideo.startNumber + segmentIndex;
             audioStartSegment = chosenAudio.startNumber + segmentIndex;

             // Clamp to valid segment range
             const videoMaxSegment =
               chosenVideo.startNumber + chosenVideo.totalSegments - 1;
             const audioMaxSegment =
               chosenAudio.startNumber + chosenAudio.totalSegments - 1;
             videoStartSegment = Math.min(videoStartSegment, videoMaxSegment);
             audioStartSegment = Math.min(audioStartSegment, audioMaxSegment);

             console.log(
               `[INIT] Resuming from saved position: ${savedPosition}s`
             );
             console.log(
               `[INIT] Starting at segment ${videoStartSegment} for video`
             );
             console.log(
               `[INIT] Starting at segment ${audioStartSegment} for audio`
             );
           } else {
             console.log("[INIT] Starting from beginning");
           }

           //  APPEND INIT SEGMENTS
           const videoInitPromise = (async () => {
             let videoInit = segmentCache.getInitSegment(
               videoId,
               "video",
               chosenVideo.id
             );

             if (videoInit) {
               console.log("[INIT] Using prefetched video init segment");
             } else {
               console.log("[INIT] Fetching video init segment");
               videoInit = await fetchInitSegment(
                 videoId,
                 chosenVideo,
                 "video"
               );
               segmentCache.setInitSegment(
                 videoId,
                 "video",
                 chosenVideo.id,
                 videoInit
               );
             }

             videoInitSegmentCache.current.set(chosenVideo.id, videoInit);
             currentVideoInitSegmentRef.current = videoInit;
             currentVideoRepIdRef.current = chosenVideo.id;

             return enqueueOperation("video", () =>
               appendBufferSafely(videoSb, videoInit)
             );
           })();

           const audioInitPromise = (async () => {
             let audioInit = segmentCache.getInitSegment(
               videoId,
               "audio",
               chosenAudio.id
             );

             if (audioInit) {
               console.log("[INIT] Using prefetched audio init segment");
             } else {
               console.log("[INIT] Fetching audio init segment");
               audioInit = await fetchInitSegment(
                 videoId,
                 chosenAudio,
                 "audio"
               );
               segmentCache.setInitSegment(
                 videoId,
                 "audio",
                 chosenAudio.id,
                 audioInit
               );
             }

             audioInitSegmentCache.current.set(chosenAudio.id, audioInit);
             currentAudioInitSegmentRef.current = audioInit;
             currentAudioRepIdRef.current = chosenAudio.id;

             return enqueueOperation("audio", () =>
               appendBufferSafely(audioSb, audioInit)
             );
           })();

           Promise.all([videoInitPromise, audioInitPromise])
             .then(() => {
               // Set starting segments based on saved position
               videoNextSegRef.current = videoStartSegment;
               audioNextSegRef.current = audioStartSegment;

               lastProcessedSegmentsRef.current.set(
                 chosenVideo.id,
                 videoStartSegment - 1
               );
               lastProcessedSegmentsRef.current.set(
                 chosenAudio.id,
                 audioStartSegment - 1
               );

               // Set initial playback position if resuming
               if (initialSeekTime > 0) {
                 videoEl.currentTime = initialSeekTime;
               }


               // Handle auto-play for Live streams ONLY
               if (isLive && !hasPlaybackStarted) {
                  setHasPlaybackStarted(true);
                  // Must happen after user interaction usually, but if allowed:
                  videoEl.play().catch(e => {
                      console.warn("Auto-play failed (Live):", e);
                      setHasPlaybackStarted(false);
                  });
               }

               if (isLive || hasPlaybackStarted) {
               // Start fetching segments from calculated position
               fetchNextSegment(
                 videoId,
                 chosenVideo,
                 "video",
                 videoSb,
                 videoNextSegRef,
                 videoFinishedRef,
                 false
               );
               fetchNextSegment(
                 videoId,
                 chosenAudio,
                 "audio",
                 audioSb,
                 audioNextSegRef,
                 audioFinishedRef,
                 false
               );
                } else if (!isLive && savedPosition && savedPosition > 0) {
                   console.log("[INIT] VOD with saved position: Deferring data fetch until user clicks play");
                } else {
                   console.log("[INIT] VOD: Deferring data fetch until user clicks play");
                }
             })
             .catch(console.error);

           const onTimeUpdate = () => {
             if (mediaSource.readyState !== "open") return;
             if (!videoEl.buffered || videoEl.buffered.length === 0) return;
             if (!isOnlineRef.current) return;

             // Prevent VOD auto-fetch loops if paused
             if (videoEl.paused && !isLive) return;

             const now = Date.now();
             if (now - lastTimeUpdateRef.current < 500) return;
             lastTimeUpdateRef.current = now;

             const currentTime = videoEl.currentTime;
             const duration = durationRef.current;

             // Validate duration
             if (!duration || duration <= 0) {
               return;
             }

             const timeToEnd = duration - currentTime;
             const bufferGap =
               videoEl.buffered.length > 0
                 ? videoEl.buffered.end(videoEl.buffered.length - 1) -
                   currentTime
                 : 0;

             // Check if we're near the end
             if (
               timeToEnd < 2 &&
               videoFinishedRef.current &&
               audioFinishedRef.current
             ) {
               tryEndStream();
             }

             // Handle rebuffering
             if (
               bufferGap < REBUFFER_THRESHOLD &&
               !isStalledRef.current &&
               !isSeekingRef.current &&
               !isInOnlineRecoveryRef.current
             ) {
               handleStall();
             }

             if (bufferGap > 5 && isStalledRef.current) {
               isStalledRef.current = false;
             }

             // Handle quality switching based on buffer loss
             const bufferLoss = lastBufferGapRef.current - bufferGap;
             if (
               bufferLoss > 1.5 &&
               bufferGap < 5 &&
               !isSeekingRef.current &&
               !isInOnlineRecoveryRef.current
             ) {
               const newQuality = Math.max(0, videoQualityIdxRef.current - 1);
               switchQuality(newQuality);
             }
             lastBufferGapRef.current = bufferGap;

             const isNearEnd = timeToEnd < 5;

             // Aggressively fetch near end
             if (isNearEnd) {
               if (
                 !videoFinishedRef.current &&
                 videoRepRef.current &&
                 videoSbRef.current
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
               if (
                 !audioFinishedRef.current &&
                 audioRepRef.current &&
                 audioSbRef.current
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
            }
          };

           const onSeeking = () => {
             const targetTime = videoEl.currentTime;

             if (setShowReplay) {
               setShowReplay(false);
             }

             resetStreamForSeek(targetTime);
           };

           const onWaiting = () => {
             if (mediaSource.readyState !== "open") return;

             if (isInOnlineRecoveryRef.current) {
               return;
             }

             if (isSeekingRef.current) {
               return;
             }

             // Prevent VOD auto-fetch from waiting event
             if (videoEl.paused && !isLive) return;

             handleStall();
           };

           videoEl.addEventListener("timeupdate", onTimeUpdate);
           videoEl.addEventListener("seeking", onSeeking);
           videoEl.addEventListener("waiting", onWaiting);

           mediaSource.addEventListener("sourceclose", () => {
             mediaSourceStateRef.current = "closed";
             videoEl.removeEventListener("timeupdate", onTimeUpdate);
             videoEl.removeEventListener("seeking", onSeeking);
             videoEl.removeEventListener("waiting", onWaiting);
             abortAllRequests();
           });

           mediaSource.addEventListener("sourceended", () => {
             mediaSourceStateRef.current = "ended";
           });
         }
       );
     });
   }, [
     videoId,
     videoRef,
     isInitializedRef,
     shouldInitializeRef,
     cleanupMediaSource,
     mediaSourceRef,
     mediaSourceStateRef,
     videoSbRef,
     audioSbRef,
     videoRepsRef,
     audioRepsRef,
     videoRepRef,
     audioRepRef,
     videoNextSegRef,
     audioNextSegRef,
     videoFinishedRef,
     audioFinishedRef,
     durationRef,
     segmentDurationRef,
     videoQualityIdxRef,
     lastTimeUpdateRef,
     lastBufferGapRef,
     isStalledRef,
     isSeekingRef,
     isInOnlineRecoveryRef,
     isOnlineRef,
     evictionIntervalRef,
     bolaStateRef,
     videoInitSegmentCache,
     audioInitSegmentCache,
     currentVideoInitSegmentRef,
     currentAudioInitSegmentRef,
     currentVideoRepIdRef,
     currentAudioRepIdRef,
     lastProcessedSegmentsRef,
     throughputEMARef,
     savedPosition,
     setVideoReps,
     setAudioReps,
     setUiVideoQualityIdx,
     getVideoThroughput,
     enqueueOperation,
     fetchNextSegment,
     handleStall,
     resetStreamForSeek,
     switchQuality,
     evictBuffer,
     abortAllRequests,
     tryEndStream,
     setShowReplay,
     prefetchMetadata,
     hasPlaybackStarted,
     setHasPlaybackStarted,
   ]);

  // ✅ LIVE MANIFEST REFRESH: Full metadata synchronization
  useEffect(() => {
    if (!isLiveRef.current || !videoId || mediaSourceStateRef.current !== "open") return;

    const refreshInterval = setInterval(() => {
      if (mediaSourceStateRef.current !== "open") return;

      const manifestReq = new ManifestRequest();
      manifestReq.setVideoId(videoId);

      grpcClient.getManifest(manifestReq, {}, (err, rsp) => {
        if (err || !rsp) return;
        
        const { 
          duration, 
          isLive: updatedIsLive, 
          videoReps: newVideoReps,
          audioReps: newAudioReps 
        } = parseManifest(rsp.getMpdXml_asU8());
        
        // 1. Update durations (MSE + Ref)
        if (duration > durationRef.current) {
          durationRef.current = duration;
          if (mediaSourceRef.current && mediaSourceRef.current.readyState === "open") {
            try {
              mediaSourceRef.current.duration = duration;
            } catch (e) {
              // Ignore transition errors
            }
          }
        }

        // 2. Synchronize Qualities/Representations (always update for live to get new totalSegments)
        if (newVideoReps.length > 0) {
          setVideoReps(newVideoReps);
          videoRepsRef.current = newVideoReps;
          
          // Update active rep ref to point to the new instance with updated metadata
          const currentVidId = videoRepRef.current?.id;
          if (currentVidId) {
            const updated = newVideoReps.find(r => r.id === currentVidId);
            if (updated) videoRepRef.current = updated;
          }
        }
        if (newAudioReps.length > 0) {
          setAudioReps(newAudioReps);
          audioRepsRef.current = newAudioReps;
          
          // Update active audio rep ref
          const currentAudId = audioRepRef.current?.id;
          if (currentAudId) {
            const updated = newAudioReps.find(r => r.id === currentAudId);
            if (updated) audioRepRef.current = updated;
          }
        }

        // 3. Handle Stream Transition (Live -> Static/Ended)
        if (!updatedIsLive && isLiveRef.current) {
          console.log("[LIVE] Stream transitioned to static. Finalizing stream.");
          isLiveRef.current = false;
          setIsLive(false);
          
          // Mark as finished to trigger UI end-state
          videoFinishedRef.current = true;
          audioFinishedRef.current = true;
          tryEndStream();
        }
      });
    }, 10000); // 10s is standard for DASH live polling

    return () => clearInterval(refreshInterval);
  }, [
    videoId, 
    setIsLive, 
    isLiveRef, 
    mediaSourceStateRef, 
    durationRef, 
    mediaSourceRef, 
    setVideoReps, 
    videoRepsRef, 
    tryEndStream, 
    videoFinishedRef, 
    audioFinishedRef
  ]);

  return { initializePlayer };
}
