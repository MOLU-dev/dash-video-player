import { useCallback, useState } from "react";
import type {
  Representation,
  BOLAState,
  EnhancedBOLAState,
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
import { useLiveStreamManager } from "../useLiveStreamManager";
import { ManifestMetadata } from "@/types/player.types";


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
  manifestMetadataRef: React.RefObject<ManifestMetadata | null>;
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
  manifestMetadataRef,
}: UsePlayerInitializerProps) {
  const [manifestMetadata, setManifestMetadata] =
    useState<ManifestMetadata | null>(null);

  const {
    calculateLiveEdge,
    getAvailableSegmentRange,
    initializeLiveStream,
    isLive,
  } = useLiveStreamManager({
    videoId,
    metadata: manifestMetadata,
    videoRepRef,
    videoNextSegRef,
    audioNextSegRef,
    onManifestUpdate: () => {
      console.log("[LIVE] Manifest update triggered");
      // Re-initialization logic if needed
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
            generator,
            metadata,
          } = parseManifest(mpdXml);

          setManifestMetadata(metadata);
          manifestMetadataRef.current = metadata;

          console.log(
            `[${metadata.isLive ? "LIVE" : "VOD"}] Using ${generator} generator`
          );
          console.log(
            `Duration: ${duration === Infinity ? "∞ (LIVE)" : `${duration}s`}`
          );
          console.log(`Segment duration: ${segmentDuration}s`);

          if (videoRepsArr.length === 0 || audioRepsArr.length === 0) {
            return;
          }

          durationRef.current = duration;
          segmentDurationRef.current = segmentDuration;

          // For live: Don't try to set MediaSource duration
          if (!metadata.isLive) {
            if (
              videoEl &&
              !isNaN(duration) &&
              duration > 0 &&
              duration !== Infinity
            ) {
              try {
                if (mediaSource.readyState === "open") {
                  mediaSource.duration = duration;
                }
              } catch (e) {
                console.warn("Could not set MediaSource duration:", e);
              }
            }
          } else {
            console.log(
              "[LIVE] Skipping MediaSource.duration (infinite stream)"
            );
          }

          const bolaState = initializeBOLA(videoRepsArr);
          bolaStateRef.current = bolaState;

          setVideoReps(videoRepsArr);
          videoRepsRef.current = videoRepsArr;
          setAudioReps(audioRepsArr);
          audioRepsRef.current = audioRepsArr;

          const initialQualityIdx = chooseInitialQualityIdx(
            videoRepsArr,
            getVideoThroughput(),
            throughputEMARef.current
          );
          const chosenVideo = videoRepsArr[initialQualityIdx];
          const chosenAudio = audioRepsArr[0];

          videoRepRef.current = chosenVideo;
          audioRepRef.current = chosenAudio;
          videoQualityIdxRef.current = initialQualityIdx;
          setUiVideoQualityIdx(initialQualityIdx);

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

          // Initialize live stream if needed
          if (metadata.isLive) {
            initializeLiveStream();
          }

          Promise.all([
            fetchInitSegment(videoId, chosenVideo, "video").then(
              (initSegment) => {
                videoInitSegmentCache.current.set(chosenVideo.id, initSegment);
                currentVideoInitSegmentRef.current = initSegment;
                currentVideoRepIdRef.current = chosenVideo.id;
                return enqueueOperation("video", () =>
                  appendBufferSafely(videoSb, initSegment)
                );
              }
            ),
            fetchInitSegment(videoId, chosenAudio, "audio").then(
              (initSegment) => {
                audioInitSegmentCache.current.set(chosenAudio.id, initSegment);
                currentAudioInitSegmentRef.current = initSegment;
                currentAudioRepIdRef.current = chosenAudio.id;
                return enqueueOperation("audio", () =>
                  appendBufferSafely(audioSb, initSegment)
                );
              }
            ),
          ])
            .then(() => {
              // For VOD: start from segment 1
              // For Live: segments are already set by initializeLiveStream
              if (!metadata.isLive) {
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
              } else {
                // Live stream segments already set by initializeLiveStream
                console.log(
                  `[LIVE] Starting from segment ${videoNextSegRef.current}`
                );
                lastProcessedSegmentsRef.current.set(
                  chosenVideo.id,
                  videoNextSegRef.current - 1
                );
                lastProcessedSegmentsRef.current.set(
                  chosenAudio.id,
                  audioNextSegRef.current - 1
                );
              }

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

            // For live streams, don't check for end
            if (!metadata.isLive) {
              if (!duration || duration <= 0) {
                return;
              }

              const timeToEnd = duration - currentTime;
              const bufferGap =
                videoEl.buffered.length > 0
                  ? videoEl.buffered.end(videoEl.buffered.length - 1) -
                    currentTime
                  : 0;

              if (
                timeToEnd < 2 &&
                videoFinishedRef.current &&
                audioFinishedRef.current
              ) {
                tryEndStream();
              }

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
            } else {
              // Live stream: just monitor buffer health
              const bufferGap =
                videoEl.buffered.length > 0
                  ? videoEl.buffered.end(videoEl.buffered.length - 1) -
                    currentTime
                  : 0;

              if (
                bufferGap < REBUFFER_THRESHOLD &&
                !isStalledRef.current &&
                !isSeekingRef.current
              ) {
                handleStall();
              }

              if (bufferGap > 5 && isStalledRef.current) {
                isStalledRef.current = false;
              }
            }
          };

          const onSeeking = () => {
            // Disable seeking for live streams
            if (metadata.isLive) {
              console.log("[LIVE] Seeking disabled for live stream");
              const currentTime = videoEl.currentTime;
              // Reset to current position
              videoEl.currentTime = currentTime;
              return;
            }

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
    initializeLiveStream,
    manifestMetadataRef,
  ]);

  return { initializePlayer, isLive };
}