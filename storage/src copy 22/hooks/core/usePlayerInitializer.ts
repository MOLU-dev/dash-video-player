import { useCallback } from "react";
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

  // ADD THIS:
  prefetchMetadata?: Map<string, PrefetchMetadata>;
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
  prefetchMetadata = new Map(), // Default to empty Map
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
              "video",
              chosenVideo.id
            );

            if (videoInit) {
              console.log("[INIT] Using prefetched video init segment");
            } else {
              console.log("[INIT] Fetching video init segment");
              videoInit = await fetchInitSegment(videoId, chosenVideo, "video");
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
              audioInit = await fetchInitSegment(videoId, chosenAudio, "audio");
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
            })
            .catch(console.error);

          const onTimeUpdate = () => {
            if (mediaSource.readyState !== "open") return;
            if (!videoEl.buffered || videoEl.buffered.length === 0) return;
            if (!isOnlineRef.current) return;

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
  ]);

  return { initializePlayer };
}
