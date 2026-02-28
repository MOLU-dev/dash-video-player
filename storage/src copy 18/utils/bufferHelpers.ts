import type { PendingAppend, Representation } from "../types/player.types";

export function removeBufferRange(
  sb: SourceBuffer,
  start: number,
  end: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sb || sb.buffered.length === 0) {
      console.log("No buffer to remove");
      return resolve();
    }

    const bufferedEnd =
      sb.buffered.length > 0 ? sb.buffered.end(sb.buffered.length - 1) : 0;
    const actualEnd =
      end === Infinity ? bufferedEnd : Math.min(end, bufferedEnd);
    const actualStart = Math.max(start, sb.buffered.start(0));

    if (actualStart >= actualEnd) {
      console.log("No valid buffer range to remove");
      return resolve();
    }

    console.log(
      `Removing buffer range [${actualStart.toFixed(2)}, ${actualEnd.toFixed(
        2
      )}]`
    );

    const onUpdateEnd = () => {
      sb.removeEventListener("updateend", onUpdateEnd);
      sb.removeEventListener("error", onError);
      console.log("Buffer removal completed");
      resolve();
    };

    const onError = (e: Event) => {
      sb.removeEventListener("updateend", onUpdateEnd);
      sb.removeEventListener("error", onError);
      console.error("Buffer removal error:", e);
      reject(e);
    };

    sb.addEventListener("updateend", onUpdateEnd, { once: true });
    sb.addEventListener("error", onError, { once: true });

    try {
      if (sb.updating) {
        console.warn("SourceBuffer busy, will retry removal");
        setTimeout(() => {
          removeBufferRange(sb, start, end).then(resolve).catch(reject);
        }, 100);
        return;
      }

      sb.remove(actualStart, actualEnd);
    } catch (e) {
      console.error("Remove buffer error:", e);
      reject(e);
    }
  });
}

export function appendBufferSafely(
  sb: SourceBuffer,
  data: Uint8Array,
  signal?: AbortSignal,
  segmentNumber?: number,
  mediaType?: "video" | "audio",
  pendingAppends?: { video: PendingAppend[]; audio: PendingAppend[] }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Aborted", "AbortError"));

    if (mediaType && segmentNumber !== undefined && pendingAppends) {
      pendingAppends[mediaType].push({
        segmentNumber,
        duration: 0, // Will be set by caller
      });
    }

    const onUpdateEnd = () => {
      cleanup();

      if (mediaType && segmentNumber !== undefined && pendingAppends) {
        const index = pendingAppends[mediaType].findIndex(
          (item) => item.segmentNumber === segmentNumber
        );
        if (index !== -1) {
          pendingAppends[mediaType].splice(index, 1);
        }
      }

      resolve();
    };

    const onError = (e: Event) => {
      cleanup();

      if (mediaType && segmentNumber !== undefined && pendingAppends) {
        const index = pendingAppends[mediaType].findIndex(
          (item) => item.segmentNumber === segmentNumber
        );
        if (index !== -1) {
          pendingAppends[mediaType].splice(index, 1);
        }
      }

      console.error("SourceBuffer error event:", e);
      resolve();
    };

    const onAbort = () => {
      cleanup();

      if (mediaType && segmentNumber !== undefined && pendingAppends) {
        const index = pendingAppends[mediaType].findIndex(
          (item) => item.segmentNumber === segmentNumber
        );
        if (index !== -1) {
          pendingAppends[mediaType].splice(index, 1);
        }
      }

      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      sb.removeEventListener("updateend", onUpdateEnd);
      sb.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    sb.addEventListener("updateend", onUpdateEnd, { once: true });
    sb.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      if (sb.updating) {
        console.warn("SourceBuffer busy, skipping append");
        return resolve();
      }

      sb.appendBuffer(data.buffer as ArrayBuffer);
    } catch (e) {
      console.error("AppendBuffer error:", e);
      resolve();
    }
  });
}

export function calculateEstimatedBufferEnd(
  videoEl: HTMLVideoElement | null,
  videoRep: Representation | null,
  audioRep: Representation | null,
  pendingAppends: { video: PendingAppend[]; audio: PendingAppend[] }
): number {
  if (!videoEl || !videoEl.buffered || videoEl.buffered.length === 0) {
    return 0;
  }

  let bufferEnd =
    videoEl.buffered.length > 0
      ? videoEl.buffered.end(videoEl.buffered.length - 1)
      : 0;

  if (videoRep) {
    const segmentDuration = videoRep.segmentDur / videoRep.timescale;
    bufferEnd += pendingAppends.video.length * segmentDuration;
  }

  if (audioRep) {
    const segmentDuration = audioRep.segmentDur / audioRep.timescale;
    bufferEnd += pendingAppends.audio.length * segmentDuration;
  }

  return bufferEnd;
}

export function calculateBatchSize(
  bufferGap: number,
  segmentDuration: number,
  isQualitySwitch: boolean,
  TARGET_BUFFER_LEVEL: number,
  MAX_BUFFER_LEVEL: number,
  BUFFER_EMERGENCY_THRESHOLD: number
): number {
  if (isQualitySwitch) {
    return 3;
  }

  if (bufferGap < BUFFER_EMERGENCY_THRESHOLD) {
    return 6;
  }

  const segmentsNeeded = Math.ceil(
    (TARGET_BUFFER_LEVEL - bufferGap) / segmentDuration
  );

  if (bufferGap >= MAX_BUFFER_LEVEL) {
    return 0;
  }

  if (bufferGap >= TARGET_BUFFER_LEVEL) {
    return Math.min(1, segmentsNeeded);
  }

  const bufferRatio = bufferGap / TARGET_BUFFER_LEVEL;
  if (bufferRatio > 0.8) {
    return 1;
  } else if (bufferRatio > 0.6) {
    return Math.min(2, segmentsNeeded);
  } else if (bufferRatio > 0.3) {
    return Math.min(3, segmentsNeeded);
  }

  return Math.min(6, Math.max(1, segmentsNeeded));
}
