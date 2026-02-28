import { useCallback, useRef, useEffect } from "react";
import type { ManifestMetadata, Representation } from "@/types/player.types";

interface UseLiveStreamManagerProps {
  videoId: string;
  metadata: ManifestMetadata | null;
  videoRepRef: React.RefObject<Representation | null>;
  videoNextSegRef: React.RefObject<number>;
  audioNextSegRef: React.RefObject<number>;
  onManifestUpdate: () => void;
}

export function useLiveStreamManager({
  videoId,
  metadata,
  videoRepRef,
  videoNextSegRef,
  audioNextSegRef,
  onManifestUpdate,
}: UseLiveStreamManagerProps) {
  const manifestUpdateIntervalRef = useRef<number | null>(null);
  const lastManifestUpdateRef = useRef<number>(Date.now());

  const calculateLiveEdge = useCallback((): number => {
    if (
      !metadata?.isLive ||
      !metadata.availabilityStartTime ||
      !videoRepRef.current
    ) {
      return 0;
    }

    const now = Date.now();
    const startTime = metadata.availabilityStartTime.getTime();
    const elapsed = (now - startTime) / 1000;

    const delay = metadata.suggestedPresentationDelay || 3;
    return Math.max(0, elapsed - delay);
  }, [metadata, videoRepRef]);

  const calculateCurrentLiveSegment = useCallback((): number => {
    if (
      !metadata?.isLive ||
      !metadata.availabilityStartTime ||
      !videoRepRef.current
    ) {
      return 1;
    }

    const now = Date.now();
    const startTime = metadata.availabilityStartTime.getTime();
    const elapsedMs = now - startTime;

    const segmentDurationSec =
      videoRepRef.current.segmentDur / videoRepRef.current.timescale;
    const segmentDurationMs = segmentDurationSec * 1000;

    const segmentsSinceStart = Math.floor(elapsedMs / segmentDurationMs);
    const currentSegment = videoRepRef.current.startNumber + segmentsSinceStart;

    const presentationDelay = metadata.suggestedPresentationDelay || 3;
    const delaySegments = Math.ceil(presentationDelay / segmentDurationSec);

    const targetSegment = Math.max(
      videoRepRef.current.startNumber,
      currentSegment - delaySegments
    );

    console.log(
      `[LIVE] Current segment: ${currentSegment}, Target: ${targetSegment}`
    );

    return targetSegment;
  }, [metadata, videoRepRef]);

  const getAvailableSegmentRange = useCallback(
    (
      startNumber: number,
      segmentDuration: number,
      timescale: number
    ): { start: number; end: number } => {
      if (!metadata?.isLive) {
        return { start: startNumber, end: startNumber };
      }

      const now = Date.now();
      const startTime = metadata.availabilityStartTime?.getTime() || now;
      const elapsed = (now - startTime) / 1000;

      const segmentDurationSec = segmentDuration / timescale;

      const segmentsSinceStart = Math.floor(elapsed / segmentDurationSec);
      const currentSegmentNumber = startNumber + segmentsSinceStart;

      const timeShiftDepth = metadata.timeShiftBufferDepth || 60;
      const segmentsInDVRWindow = Math.floor(
        timeShiftDepth / segmentDurationSec
      );
      const earliestSegment = Math.max(
        startNumber,
        currentSegmentNumber - segmentsInDVRWindow
      );

      return {
        start: earliestSegment,
        end: currentSegmentNumber,
      };
    },
    [metadata]
  );

  const startManifestRefresh = useCallback(() => {
    if (!metadata?.isLive || !metadata.minimumUpdatePeriod) {
      return;
    }

    if (manifestUpdateIntervalRef.current) {
      clearInterval(manifestUpdateIntervalRef.current);
    }

    const mpdUpdatePeriod = metadata.minimumUpdatePeriod * 1000;
    const refreshInterval = Math.min(mpdUpdatePeriod, 60000);

    console.log(
      `[LIVE] Starting manifest refresh every ${refreshInterval / 1000}s ` +
        `(MPD specifies ${metadata.minimumUpdatePeriod}s)`
    );

    manifestUpdateIntervalRef.current = window.setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastManifestUpdateRef.current;
      console.log(
        `[LIVE] Refreshing manifest... (${
          timeSinceLastUpdate / 1000
        }s since last update)`
      );
      lastManifestUpdateRef.current = Date.now();
      onManifestUpdate();
    }, refreshInterval);
  }, [metadata, onManifestUpdate]);

  const stopManifestRefresh = useCallback(() => {
    if (manifestUpdateIntervalRef.current) {
      clearInterval(manifestUpdateIntervalRef.current);
      manifestUpdateIntervalRef.current = null;
      console.log("[LIVE] Manifest refresh stopped");
    }
  }, []);

  const initializeLiveStream = useCallback(() => {
    if (!metadata?.isLive) return;

    console.log("[LIVE] Initializing live stream...");

    const initialSegment = calculateCurrentLiveSegment();

    videoNextSegRef.current = initialSegment;
    audioNextSegRef.current = initialSegment;

    startManifestRefresh();

    console.log(
      `[LIVE] Stream initialized. Starting from segment ${initialSegment}`
    );
  }, [
    metadata,
    calculateCurrentLiveSegment,
    videoNextSegRef,
    audioNextSegRef,
    startManifestRefresh,
  ]);

  useEffect(() => {
    if (metadata?.isLive) {
      startManifestRefresh();
    }

    return () => {
      stopManifestRefresh();
    };
  }, [metadata, startManifestRefresh, stopManifestRefresh]);

  return {
    calculateLiveEdge,
    calculateCurrentLiveSegment,
    getAvailableSegmentRange,
    startManifestRefresh,
    stopManifestRefresh,
    initializeLiveStream,
    isLive: metadata?.isLive || false,
  };
}
