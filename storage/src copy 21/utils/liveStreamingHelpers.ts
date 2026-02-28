// utils/liveStreamingHelpers.ts
export function calculateAvailableSegmentRange(
  availabilityStartTime: Date,
  segmentDuration: number,
  startNumber: number,
  timeShiftBufferDepth?: number,
  availabilityTimeOffset: number = 0
): { firstAvailable: number; lastAvailable: number } {
  const now = Date.now();
  const ast = availabilityStartTime.getTime();
  const elapsedMs = now - ast;
  const elapsedSec = elapsedMs / 1000;

  // Calculate last available segment
  const lastAvailable =
    Math.floor((elapsedSec + availabilityTimeOffset) / segmentDuration) +
    startNumber;

  // Calculate first available segment (considering timeshift)
  let firstAvailable = startNumber;
  if (timeShiftBufferDepth && timeShiftBufferDepth > 0) {
    const timeShiftSegments = Math.floor(
      timeShiftBufferDepth / segmentDuration
    );
    firstAvailable = Math.max(startNumber, lastAvailable - timeShiftSegments);
  }

  return { firstAvailable, lastAvailable };
}

export function isSegmentAvailable(
  segmentNumber: number,
  availabilityStartTime: Date,
  segmentDuration: number,
  startNumber: number,
  availabilityTimeOffset: number = 0
): boolean {
  const { firstAvailable, lastAvailable } = calculateAvailableSegmentRange(
    availabilityStartTime,
    segmentDuration,
    startNumber,
    undefined,
    availabilityTimeOffset
  );

  return segmentNumber >= firstAvailable && segmentNumber <= lastAvailable;
}
