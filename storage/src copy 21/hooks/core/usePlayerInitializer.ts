import { useCallback, useState, useEffect } from "react";
import type {
  Representation,
  BOLAState,
  EnhancedBOLAState,
  PrefetchMetadata,
  LiveStreamingState,
} from "@/types/player.types";
import { grpcClient } from "@/utils/grpcClient";
import { ManifestRequest, ManifestResponse } from "@/proto/rpc_stream_pb";
import { parseManifest, ParsedManifest } from "@/services/manifestParser"; // Add ParsedManifest import
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
import { useLiveStreaming } from "@/hooks/useLiveStreaming";
import { calculateAvailableSegmentRange } from "@/utils/liveStreamingHelpers";

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

  // Add live streaming specific props
  updateSegmentAvailability?: (lastAvailable: number) => void;

  prefetchMetadata?: Map<string, PrefetchMetadata>;
  savedPosition?: number | null;
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

  updateSegmentAvailability,

  savedPosition = null,
  prefetchMetadata = new Map(),
}: UsePlayerInitializerProps) {
  const [liveState, setLiveState] = useState<LiveStreamingState>({
    isLive: false,
    availabilityStartTime: null,
    suggestedPresentationDelay: 0,
    timeShiftBufferDepth: 0,
    minimumUpdatePeriod: 0,
    lastManifestUpdate: 0,
    currentSegmentAvailability: 0,
  });

  // Use the live streaming hook
  useLiveStreaming({
    videoId,
    isLive: liveState.isLive,
    minimumUpdatePeriod: (liveState.minimumUpdatePeriod || 5) * 1000,
    onManifestUpdate: (updatedManifest: ParsedManifest) => {
      // Fix: Use ParsedManifest type
      // Update representations and segment availability
      setVideoReps(updatedManifest.videoReps);
      setAudioReps(updatedManifest.audioReps);
      videoRepsRef.current = updatedManifest.videoReps;
      audioRepsRef.current = updatedManifest.audioReps;

      // Recalculate available segments
      if (liveState.availabilityStartTime && segmentDurationRef.current) {
        const { lastAvailable } = calculateAvailableSegmentRange(
          liveState.availabilityStartTime,
          segmentDurationRef.current,
          updatedManifest.videoReps[0]?.startNumber || 1
        );

        setLiveState((prev) => ({
          ...prev,
          currentSegmentAvailability: lastAvailable,
          lastManifestUpdate: Date.now(),
        }));

        // Call the prop to update segment availability if provided
        if (updateSegmentAvailability) {
          updateSegmentAvailability(lastAvailable);
        }
      }
    },
  });

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
            isLive, // Add this from parseManifest
            availabilityStartTime, // Add this
            suggestedPresentationDelay, // Add this
            timeShiftBufferDepth, // Add this
            minimumUpdatePeriod, // Add this
          } = parseManifest(mpdXml);

          if (videoRepsArr.length === 0 || audioRepsArr.length === 0) {
            return;
          }

          // Handle live stream setup
          if (isLive) {
            setLiveState({
              isLive: true,
              availabilityStartTime: availabilityStartTime || new Date(),
              suggestedPresentationDelay: suggestedPresentationDelay || 0,
              timeShiftBufferDepth: timeShiftBufferDepth || 0,
              minimumUpdatePeriod: minimumUpdatePeriod || 5,
              lastManifestUpdate: Date.now(),
              currentSegmentAvailability: 0,
            });

            // For live streams, set duration to Infinity
            durationRef.current = Infinity;
          } else {
            durationRef.current = duration;
          }

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

          // ✅ CALCULATE STARTING SEGMENT
          let videoStartSegment = chosenVideo.startNumber;
          let audioStartSegment = chosenAudio.startNumber;

          if (isLive) {
            // For live streams, calculate starting segment based on current time and availability
            const now = new Date();
            const astTime = availabilityStartTime || now; // Use the parsed availabilityStartTime
            const timeSinceStart =
              (now.getTime() - astTime.getTime()) / 1000;
            const currentSegment =
              Math.floor(timeSinceStart / segmentDuration) +
              chosenVideo.startNumber;

            // Start from suggested presentation delay behind live edge
            const suggestedDelay = suggestedPresentationDelay || 0;
            const delaySegments = Math.floor(suggestedDelay / segmentDuration);
            videoStartSegment = Math.max(
              chosenVideo.startNumber,
              currentSegment - delaySegments
            );
            audioStartSegment = Math.max(
              chosenAudio.startNumber,
              currentSegment - delaySegments
            );

            console.log(
              `[INIT] Live stream: starting at segment ${videoStartSegment}`
            );
          } else if (savedPosition && savedPosition > 0) {
            // For VOD, calculate based on saved position
            const segmentIndex = Math.floor(savedPosition / segmentDuration);
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

          // ✅ APPEND INIT SEGMENTS
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
              // Set starting segments
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

              // Set initial playback position if resuming (VOD only)
              if (!isLive && savedPosition && savedPosition > 0) {
                videoEl.currentTime = savedPosition;
              }

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

            // Handle live streams differently
            if (isLive) {
              // For live streams, we don't have a fixed duration
              const bufferGap =
                videoEl.buffered.length > 0
                  ? videoEl.buffered.end(videoEl.buffered.length - 1) -
                    currentTime
                  : 0;

              // Handle rebuffering for live
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

              // For live, always keep fetching segments
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
            } else {
              // Original VOD logic
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
    savedPosition,
    liveState, // Add liveState to dependencies
    updateSegmentAvailability, // Add this to dependencies
  ]);

  return { initializePlayer, liveState, setLiveState }; // Return liveState and setter
}
