import { useCallback } from "react";
import type {
  MediaType,
  OperationQueue,
  Representation,
  PendingAppend,
} from "../../../../src/types/player.types";
import { calculateEstimatedBufferEnd } from "../../../../src/utils/bufferHelpers";

interface UsePlayerCallbacksProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoRepRef: React.RefObject<Representation | null>;
  audioRepRef: React.RefObject<Representation | null>;
  videoFinishedRef: React.RefObject<boolean>;
  audioFinishedRef: React.RefObject<boolean>;
  operationQueuesRef: React.RefObject<OperationQueue>;
  mediaSourceRef: React.RefObject<MediaSource | null>;
  durationRef: React.RefObject<number>;
  pendingAppendsRef: React.RefObject<{
    video: PendingAppend[];
    audio: PendingAppend[];
  }>;
  currentVideoRepIdRef: React.RefObject<string | null>;
  currentAudioRepIdRef: React.RefObject<string | null>;
  qualitySwitchInProgressRef: React.RefObject<boolean>;
}

export function usePlayerCallbacks({
  videoRef,
  videoRepRef,
  audioRepRef,
  videoFinishedRef,
  audioFinishedRef,
  operationQueuesRef,
  mediaSourceRef,
  durationRef,
  pendingAppendsRef,
  currentVideoRepIdRef,
  currentAudioRepIdRef,
  qualitySwitchInProgressRef,
}: UsePlayerCallbacksProps) {
  const tryEndStream = useCallback(() => {
    const queue = operationQueuesRef.current;
    const videoEl = videoRef.current;

    if (
      !videoFinishedRef.current ||
      !audioFinishedRef.current ||
      queue.video.length !== 0 ||
      queue.audio.length !== 0 ||
      queue.videoProcessing ||
      queue.audioProcessing ||
      !mediaSourceRef.current ||
      mediaSourceRef.current.readyState !== "open"
    ) {
      return;
    }

    if (videoEl && durationRef.current > 0) {
      const timeUntilEnd = durationRef.current - videoEl.currentTime;
      if (timeUntilEnd > 2) {
        // console.log(
        //   `Not ending stream yet - ${timeUntilEnd.toFixed(1)}s remaining`
        // );
        return;
      }
    }

    //console.log("Ending MediaSource stream");
    mediaSourceRef.current.endOfStream();
  }, [
    videoFinishedRef,
    audioFinishedRef,
    operationQueuesRef,
    mediaSourceRef,
    videoRef,
    durationRef,
  ]);

  const processQueue = useCallback(
    async (mediaType: MediaType, tryEndStreamCallback: () => void) => {
      const queue = operationQueuesRef.current;
      let targetQueue: (() => Promise<void>)[];
      let processingFlag: keyof OperationQueue;

      if (mediaType === "video") {
        targetQueue = queue.video;
        processingFlag = "videoProcessing";
      } else {
        targetQueue = queue.audio;
        processingFlag = "audioProcessing";
      }

      if (queue[processingFlag] || targetQueue.length === 0) return;

      queue[processingFlag] = true;
      const operation = targetQueue.shift()!;

      try {
        await operation();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // console.error(`Error processing ${mediaType} operation:`, err);
        }
      } finally {
        queue[processingFlag] = false;
        if (targetQueue.length > 0) {
          processQueue(mediaType, tryEndStreamCallback);
        }
        tryEndStreamCallback();
      }
    },
    [operationQueuesRef]
  );

  const enqueueOperation = useCallback(
    (
      mediaType: MediaType,
      operation: () => Promise<void>,
      processQueueCallback: (
        mediaType: MediaType,
        tryEndStreamCallback: () => void
      ) => void,
      tryEndStreamCallback: () => void
    ) => {
      const queue = operationQueuesRef.current;
      if (mediaType === "video") {
        queue.video.push(operation);
      } else {
        queue.audio.push(operation);
      }
      processQueueCallback(mediaType, tryEndStreamCallback);
    },
    [operationQueuesRef]
  );

  const validateSegmentCompatibility = useCallback(
    (repId: string, mediaType: string, segmentNumber?: number): boolean => {
      if (mediaType === "video") {
        const currentRepId = currentVideoRepIdRef.current;

        if (qualitySwitchInProgressRef.current) {
          const isOldRep = repId === currentRepId;
          const isNewRep = videoRepRef.current
            ? repId === videoRepRef.current.id
            : false;

          if (!isOldRep && !isNewRep) {
            // console.log(
            //   `Blocking segment from unrelated rep ${repId} during switch`
            // );
            return false;
          }

          return true;
        }

        const isValid = repId === currentRepId;

        if (!isValid) {
          // console.log(
          //   `Segment validation failed: expected ${currentRepId}, got ${repId}`
          // );
          return false;
        }

        return true;
      } else {
        return repId === currentAudioRepIdRef.current;
      }
    },
    [
      currentVideoRepIdRef,
      currentAudioRepIdRef,
      qualitySwitchInProgressRef,
      videoRepRef,
    ]
  );

  const calculateEstimatedBufferEndWrapper = useCallback(() => {
    return calculateEstimatedBufferEnd(
      videoRef.current,
      videoRepRef.current,
      audioRepRef.current,
      pendingAppendsRef.current
    );
  }, [videoRef, videoRepRef, audioRepRef, pendingAppendsRef]);

  return {
    tryEndStream,
    processQueue,
    enqueueOperation,
    validateSegmentCompatibility,
    calculateEstimatedBufferEndWrapper,
  };
}
