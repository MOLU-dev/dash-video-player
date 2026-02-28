// hooks/useLiveStreaming.ts
import { useCallback, useEffect, useRef } from "react";
import { grpcClient } from "@/utils/grpcClient";
import { ManifestRequest } from "@/proto/rpc_stream_pb";
import { parseManifest } from "@/services/manifestParser";

interface UseLiveStreamingProps {
  videoId: string;
  isLive: boolean;
  minimumUpdatePeriod?: number;
  onManifestUpdate: (manifest: any) => void;
}

export function useLiveStreaming({
  videoId,
  isLive,
  minimumUpdatePeriod = 5000, // Default 5 seconds
  onManifestUpdate,
}: UseLiveStreamingProps) {
  const updateIntervalRef = useRef<number | null>(null);

  const refreshManifest = useCallback(async () => {
    if (!isLive) return;

    try {
      const manifestReq = new ManifestRequest();
      manifestReq.setVideoId(videoId);

      grpcClient.getManifest(manifestReq, {}, (err: any, rsp: any) => {
        if (err) {
          console.error("Failed to refresh manifest:", err);
          return;
        }

        const mpdXml = rsp.getMpdXml_asU8();
        const manifest = parseManifest(mpdXml);
        onManifestUpdate(manifest);
      });
    } catch (error) {
      console.error("Manifest refresh error:", error);
    }
  }, [videoId, isLive, onManifestUpdate]);

  // Set up periodic manifest refresh for live streams
  useEffect(() => {
    if (!isLive) return;

    // Refresh immediately
    refreshManifest();

    // Then set up interval
    updateIntervalRef.current = window.setInterval(
      refreshManifest,
      minimumUpdatePeriod
    );

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isLive, minimumUpdatePeriod, refreshManifest]);

  return { refreshManifest };
}
