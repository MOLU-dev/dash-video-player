import { useCallback, useRef } from "react";
import { grpcClient } from "../../../../src/utils/grpcClient";
import {
  ManifestRequest,
  ManifestResponse,
} from "../../../../src/proto/rpc_stream_pb";
import { parseManifest } from "../../../../src/services/manifestParser";
import { fetchInitSegment } from "../../../../src/services/segmentFetcher";
import { createSourceBufferForMime } from "../../../../src/utils/dashHelpers";
import { appendBufferSafely } from "../../../../src/utils/bufferHelpers";
import {
  initializeBOLA,
  chooseInitialQualityIdx,
} from "../../../../src/utils/qualityHelpers";
import { BUFFER_EVICTION_INTERVAL } from "../../../../src/constants/player.constants";
import type {
  Representation,
  MediaType,
} from "../../../../src/types/player.types";

interface UsePlayerInitializerProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitializedRef: React.RefObject<boolean>;
  shouldInitializeRef: React.RefObject<boolean>;
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
  evictionIntervalRef: React.RefObject<number | null>;
  bolaStateRef: React.RefObject<any>;
  videoInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  audioInitSegmentCache: React.RefObject<Map<string, Uint8Array>>;
  currentVideoInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentAudioInitSegmentRef: React.RefObject<Uint8Array | null>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
  lastProcessedSegmentsRef: React.RefObject<Map<string, number>>;
  throughputEMARef: React.RefObject<number>;
  setVideoReps: (reps: Representation[]) => void;
  setAudioReps: (reps: Representation[]) => void;
  setUiVideoQualityIdx: (idx: number) => void;
  cleanupMediaSource: () => void;
  enqueueOperation: (
    mediaType: MediaType,
    operation: () => Promise<void>
  ) => void;
  fetchNextSegment: (
    videoId: string,
    rep: Representation,
    mediaType: MediaType,
    sb: SourceBuffer,
    nextSegRef: React.RefObject<number>,
    finishedRef: React.RefObject<boolean>,
    isQualitySwitch?: boolean
  ) => Promise<void>;
  getVideoThroughput: () => number;
  evictBuffer: () => void;
  onTimeUpdate: () => void;
  onSeeking: () => void;
  onWaiting: () => void;
  onPause: () => void;
  onPlayResume: () => void;
  abortAllRequests: () => void;
}

export function usePlayerInitializer(props: UsePlayerInitializerProps) {
  const {
    videoId,
    videoRef,
    isInitializedRef,
    shouldInitializeRef,
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
    cleanupMediaSource,
    enqueueOperation,
    fetchNextSegment,
    getVideoThroughput,
    evictBuffer,
    onTimeUpdate,
    onSeeking,
    onWaiting,
    onPause,
    onPlayResume,
    abortAllRequests,
  } = props;

  // Store event listener cleanup functions
  const eventListenersRef = useRef<{
    timeupdate?: () => void;
    seeking?: () => void;
    waiting?: () => void;
    pause?: () => void;
    play?: () => void;
  }>({});

  const initializePlayer = useCallback(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const videoEl = videoRef.current;
    shouldInitializeRef.current = false;
    isInitializedRef.current = true;

    if (!window.MediaSource) {
      console.error("MSE not supported");
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
            console.error("Error fetching MPD:", err);
            return;
          }

          const mpdXml = rsp.getMpdXml_asU8();
          const {
            videoReps: videoRepsArr,
            audioReps: audioRepsArr,
            duration,
            segmentDuration,
          } = parseManifest(mpdXml);

          if (videoRepsArr.length === 0) {
            console.error("No video representations found in MPD");
            return;
          }

          if (audioRepsArr.length === 0) {
            console.error("No audio representations found in MPD");
            return;
          }

          durationRef.current = duration;
          segmentDurationRef.current = segmentDuration;

          initializeBOLA(videoRepsArr);
          bolaStateRef.current = initializeBOLA(videoRepsArr);

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
              console.error("MediaSource is not in open state");
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
              console.error("Failed to create SourceBuffer");
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

          Promise.all([
            fetchInitSegment(videoId, chosenVideo.id, "video").then(
              (initSegment) => {
                videoInitSegmentCache.current.set(chosenVideo.id, initSegment);
                currentVideoInitSegmentRef.current = initSegment;
                currentVideoRepIdRef.current = chosenVideo.id;
                return enqueueOperation("video", () =>
                  appendBufferSafely(videoSb, initSegment)
                );
              }
            ),
            fetchInitSegment(videoId, chosenAudio.id, "audio").then(
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

          // CRITICAL FIX: Store event listeners so they can be cleaned up
          eventListenersRef.current = {
            timeupdate: onTimeUpdate,
            seeking: onSeeking,
            waiting: onWaiting,
            pause: onPause,
            play: onPlayResume,
          };

          // Attach ALL event listeners
          videoEl.addEventListener("timeupdate", onTimeUpdate);
          videoEl.addEventListener("seeking", onSeeking);
          videoEl.addEventListener("waiting", onWaiting);
          videoEl.addEventListener("pause", onPause);
          videoEl.addEventListener("play", onPlayResume);

          const handleSourceClose = () => {
            mediaSourceStateRef.current = "closed";
            videoEl.removeEventListener("timeupdate", onTimeUpdate);
            videoEl.removeEventListener("seeking", onSeeking);
            videoEl.removeEventListener("waiting", onWaiting);
            videoEl.removeEventListener("pause", onPause); // ADD THIS
            videoEl.removeEventListener("play", onPlayResume); // ADD THIS
            abortAllRequests();
          };

          const handleSourceEnded = () => {
            mediaSourceStateRef.current = "ended";
          };

          mediaSource.addEventListener("sourceclose", handleSourceClose);
          mediaSource.addEventListener("sourceended", handleSourceEnded);
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
    evictBuffer,
    onTimeUpdate,
    onSeeking,
    onWaiting,
    onPause,
    onPlayResume,
    abortAllRequests,
  ]);

  return { initializePlayer };
}
