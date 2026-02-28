// hooks/useLiveSegmentFetching.ts
import { useCallback, useRef, useMemo } from "react";
import { grpcClient } from "@/utils/grpcClient";
import { 
  StreamVideoRequest, 
  StreamVideoChunk,
  GetLiveEdgeRequest,
  GetLiveEdgeResponse
} from "@/proto/rpc_streamLive_pb";
import type { Representation, MediaType } from "@/types/player.types";

interface PendingSegment {
  chunks: Uint8Array[];
  resolve: (data: Uint8Array) => void;
  reject: (err: any) => void;
}

export function useLiveSegmentFetching() {
  const segmentStreamRef = useRef<any>(null);
  const pendingSegmentsRef = useRef<Map<string, PendingSegment>>(new Map());

  const initializeStream = useCallback(() => {
    if (segmentStreamRef.current) {
      return;
    }

    const request = new StreamVideoRequest();
    const stream = grpcClient.streamVideoLive(request);
    segmentStreamRef.current = stream;

    stream.on("data", (chunk: StreamVideoChunk) => {
      const segNum = chunk.getSegmentNumber();
      // Note: representation_id is tracked via the request, not the response chunk
      // Segments will be matched by the pending request key
      const key = Object.keys(pendingSegmentsRef.current).find(k => k.endsWith(`:${segNum}`));
      if (!key) return;

      const pending = pendingSegmentsRef.current.get(key);
      if (!pending) return;

      // Accumulate chunks
      const data = chunk.getData_asU8();
      if (data) {
        pending.chunks.push(data);
      }

      // If this is the last chunk, resolve
      if (chunk.getIsLastChunk?.() || chunk.getIsLastChunk()) {
        // Combine all chunks
        const totalLength = pending.chunks.reduce(
          (sum, arr) => sum + arr.length,
          0
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        pending.chunks.forEach((arr) => {
          combined.set(arr, offset);
          offset += arr.length;
        });

        pending.resolve(combined);
        pendingSegmentsRef.current.delete(key);

        console.log(
          `[LIVE] Segment complete: ${key}, Live Edge: ${chunk.getCurrentLiveEdge?.() || 'N/A'}, Behind: ${chunk.getSegmentsBehind?.() || 'N/A'}`
        );
      }
    });

    stream.on("error", (err: any) => {
      console.error("[LIVE] Segment stream error:", err);
      // Reject all pending requests
      pendingSegmentsRef.current.forEach((pending) => {
        pending.reject(err);
      });
      pendingSegmentsRef.current.clear();
      segmentStreamRef.current = null;
    });

    stream.on("end", () => {
      console.log("[LIVE] Segment stream ended");
      segmentStreamRef.current = null;
    });

    return () => {
      if (segmentStreamRef.current) {
        segmentStreamRef.current.cancel();
        segmentStreamRef.current = null;
      }
    };
  }, []);

  const fetchLiveSegment = useCallback(
    (
      videoId: string,
      rep: Representation,
      segmentNumber: number,
      mediaType: MediaType
    ): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        // Initialize stream if not already done
        if (!segmentStreamRef.current) {
          initializeStream();
        }

        const key = `${rep.id}:${segmentNumber}`;

        // Register this request
        pendingSegmentsRef.current.set(key, {
          chunks: [],
          resolve,
          reject,
        });

        // Send request
        try {
          const req = new StreamVideoRequest();
          req.setVideoId(videoId);
          req.setRepresentationId(rep.id);
        //  req.setSegmentNumber(segmentNumber);
          req.setWaitForSegments(true);
          // For live streaming, you might want to start from live edge
          req.setStartFromLiveEdge(false); // Set to true if you want to start from current live edge
          req.setSegmentsBehindLive(2); // Start 2 segments behind live edge

          // If you have a mediaType to set, you might need to map it
          // This depends on your proto definition
          // req.setMedia(mediaType);
          
          // Note: generator field is deprecated, but if you need it:
          // if (rep.generator) {
          //   req.setGenerator(getGeneratorEnum(rep.generator));
          // }

          if (segmentStreamRef.current) {
            segmentStreamRef.current.write(req);
          } else {
            reject(new Error("Stream not initialized"));
          }
        } catch (err) {
          pendingSegmentsRef.current.delete(key);
          reject(err);
        }
      });
    },
    [initializeStream]
  );

  const getLiveEdgeInfo = useCallback(async (
    videoId: string
  ): Promise<GetLiveEdgeResponse> => {
    return new Promise((resolve, reject) => {
      const req = new GetLiveEdgeRequest();
      req.setVideoId(videoId);

      grpcClient.getLiveEdgeInfo(req, {}, (err: any, response: GetLiveEdgeResponse) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  const closeStream = useCallback(() => {
    if (segmentStreamRef.current) {
      segmentStreamRef.current.end();
      segmentStreamRef.current = null;
    }
    pendingSegmentsRef.current.clear();
  }, []);

  return useMemo(() => ({
    fetchLiveSegment,
    getLiveEdgeInfo,
    closeStream,
  }), [fetchLiveSegment, getLiveEdgeInfo, closeStream]);
}

// Helper function if you still need it
// function getGeneratorEnum(generator?: string): any {
//   const generatorMap: Record<string, any> = {
//     'dash': 0,
//     'hls': 1,
//   };
//   return generatorMap[generator?.toLowerCase() || 'dash'] || 0;
// }