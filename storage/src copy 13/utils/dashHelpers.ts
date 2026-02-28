// src/utils/dashHelpers.ts


/**
 * Safely creates a SourceBuffer for the given MIME type.
 * Throws an error if the MIME type is not supported by the MediaSource.
 */
export function createSourceBufferForMime(
  mediaSource: MediaSource,
  mimeType: string
): SourceBuffer {
  // Check if the browser supports this MIME type
  if (!MediaSource.isTypeSupported(mimeType)) {
    throw new Error(`MIME type "${mimeType}" is not supported by MediaSource.`);
  }
  // Create and return a new SourceBuffer
  return mediaSource.addSourceBuffer(mimeType);
}

/**
 * Keeps track of segment counters per representation (repId).
 * Each time you call nextSegmentNumber("video_720p"), you'll get 1, then 2, then 3, ...
 */
const segmentCounters: Record<string, number> = {};

/**
 * Returns the next segment number for a given representation ID.
 * - If never called for this repId, it returns 1.
 * - Otherwise, it increments the previous value by 1.
 */
// export function nextSegmentNumber(repId: string): number {
//   if (!segmentCounters[repId]) {
//     segmentCounters[repId] = 1;
//   } else {
//     segmentCounters[repId] += 1;
//   }
//   return segmentCounters[repId];
// }
