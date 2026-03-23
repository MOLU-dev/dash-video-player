
import { useEffect, useRef, useState } from 'react';
import { grpcClient } from '@/utils/grpcClient';
import { ManifestRequest, ManifestResponse } from '@/proto/rpc_stream_pb';
import { parseManifest } from '@/services/manifestParser';
import type { Representation } from '@/types/player.types';

interface UseReelManifestLoaderProps {
  videoIds: string[];
}

export function useReelManifestLoader({ videoIds }: UseReelManifestLoaderProps) {
  const [manifestsLoaded, setManifestsLoaded] = useState(false);
  const videoRepsMapRef = useRef(
    new Map<string, { video: Representation[]; audio: Representation[]; isLive: boolean }>()
  );

  useEffect(() => {
    let cancelled = false;

    const loadManifests = async () => {
      console.log('[MANIFEST] Loading manifests for', videoIds.length, 'videos');

      const promises = videoIds.map(async (videoId) => {
        const manifestReq = new ManifestRequest();
        manifestReq.setVideoId(videoId);

        return new Promise<void>((resolve) => {
          grpcClient.getManifest(
            manifestReq,
            {},
            (err: any, rsp: ManifestResponse) => {
              if (err || cancelled) {
                resolve();
                return;
              }

              const mpdXml = rsp.getMpdXml_asU8();
              const { videoReps, audioReps, isLive } = parseManifest(mpdXml);

              videoRepsMapRef.current.set(videoId, {
                video: videoReps,
                audio: audioReps,
                isLive,
              });

              resolve();
            }
          );
        });
      });

      await Promise.all(promises);

      if (!cancelled) {
        console.log('[MANIFEST] ✅ All manifests loaded');
        setManifestsLoaded(true);
      }
    };

    loadManifests();

    return () => {
      cancelled = true;
    };
  }, [videoIds]);

  return {
    manifestsLoaded,
    videoRepsMap: videoRepsMapRef.current,
  };
}
