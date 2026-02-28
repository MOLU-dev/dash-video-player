import type { Representation } from "../types/player.types";

export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.\d+)?S)?/);
  const hours = match?.[1] ? parseInt(match[1], 10) : 0;
  const minutes = match?.[2] ? parseInt(match[2], 10) : 0;
  const seconds = match?.[3] ? parseFloat(match[3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export function getBufferEnd(buffered: TimeRanges): number {
  return buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
}

export function getBufferGap(
  buffered: TimeRanges,
  currentTime: number
): number {
  if (!buffered || buffered.length === 0) return 0;

  if (currentTime >= getBufferEnd(buffered)) {
    return 0;
  }

  for (let i = 0; i < buffered.length; i++) {
    if (currentTime >= buffered.start(i) && currentTime < buffered.end(i)) {
      return buffered.end(i) - currentTime;
    }
  }
  return 0;
}

export function getSegmentNumber(rep: Representation, time: number): number {
  if (!rep.segmentDur || !rep.timescale) return rep.startNumber;

  const segmentDuration = rep.segmentDur / rep.timescale;
  const segmentIndex = Math.floor(time / segmentDuration);
  return rep.startNumber + segmentIndex;
}

export function calculatePacing(
  bufferGap: number,
  rep: Representation | null,
  throughputEMA: number,
  TARGET_BUFFER_LEVEL: number,
  BUFFER_EMERGENCY_THRESHOLD: number,
  PACING_FACTOR: number,
  JITTER_FACTOR: number
): number {
  if (!rep) return 100;

  const segmentSizeBits = (rep.segmentDur / rep.timescale) * rep.bandwidth;
  const expectedDownloadTime =
    throughputEMA > 0 ? (segmentSizeBits / throughputEMA) * 1000 : 100;

  let bufferFactor;
  if (bufferGap >= TARGET_BUFFER_LEVEL) {
    bufferFactor = 0.1;
  } else if (bufferGap < BUFFER_EMERGENCY_THRESHOLD) {
    bufferFactor = 2;
  } else {
    bufferFactor = 1 - bufferGap / TARGET_BUFFER_LEVEL;
  }

  const basePacing = expectedDownloadTime * PACING_FACTOR * bufferFactor;
  const jitter = basePacing * JITTER_FACTOR * (Math.random() * 2 - 1);
  const finalPacing = Math.max(0, basePacing + jitter);

  if (bufferGap < BUFFER_EMERGENCY_THRESHOLD) {
    return Math.min(finalPacing, 50);
  }

  return finalPacing;
}
