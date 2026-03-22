import * as grpcWeb from "grpc-web";
import type {
  Representation,
  MediaType,
  GeneratorType,
} from "../types/player.types";
import { grpcClient } from "@/utils/grpcClient";
import { SegmentRequest, SegmentChunk } from "@/proto/rpc_stream_pb";
import { StreamVideoRequest, StreamVideoChunk } from "@/proto/rpc_streamLive_pb";
import { Generator } from "@/proto/common_pb";

export interface FetchSegmentOptions {
  videoId: string;
  rep: Representation;
  segmentNumber: number;
  mediaType: MediaType;
  signal?: AbortSignal;
  onProgress?: (bytes: number) => void;
  startFromLiveEdge?: boolean;
}

/**
 * Converts TypeScript generator type to protobuf enum
 */
function getGeneratorEnum(generator?: GeneratorType): Generator {
  switch (generator) {
    case "ffmpeg":
      return Generator.GENERATOR_FFMPEG;
    case "gpac":
      return Generator.GENERATOR_GPAC;
    default:
      return Generator.GENERATOR_UNKNOWN;
  }
}

/**
 * Opens a persistent stream to the backend and pushes raw chunks to a callback.
 
 */
export function streamLiveChunks({
  videoId,
  rep,
  segmentNumber,
  mediaType,
  signal,
  onChunkReceived,
  onEnd,
  onError,
}: FetchSegmentOptions & { 
  onChunkReceived: (data: Uint8Array) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): void {
  if (signal?.aborted) return;

  const req = new SegmentRequest();
  req.setVideoId(videoId);
  req.setRepresentationId(rep.id);
  req.setSegmentNumber(segmentNumber);
  req.setInitSegment(false);
  req.setMedia(mediaType);
  req.setGenerator(getGeneratorEnum(rep.generator));

  const call = grpcClient.streamSegment(req, {});

  const onAbort = () => {
    call.cancel();
    signal?.removeEventListener("abort", onAbort);
  };
  signal?.addEventListener("abort", onAbort);

  call.on("data", (chunk: SegmentChunk) => {
    if (signal?.aborted) return;
    
    // Pass the raw data immediately to the callback
    const data = chunk.getData_asU8();
    if (data && data.length > 0) {
      onChunkReceived(data);
    }
  });

  call.on("error", (err: grpcWeb.RpcError) => {
    if (signal?.aborted || err.code === grpcWeb.StatusCode.CANCELLED) return;
    console.error(`Live Chunk Stream Error (${mediaType}):`, err);
    if (onError) onError(err);
  });

  call.on("end", () => {
    signal?.removeEventListener("abort", onAbort);
    if (onEnd) onEnd();
  });
}

/**
 *  Uses the persistent StreamVideoLive RPC which pushes multiple segments
 * over a single connection. 
 */
export function streamLivePersistent({
  videoId,
  rep,
  segmentNumber,
  mediaType,
  signal,
  onChunkReceived,
  onEnd,
  onError,
}: FetchSegmentOptions & { 
  onChunkReceived: (data: Uint8Array, segmentNumber: number, isLastChunk: boolean) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): void {
  if (signal?.aborted) return;

  const req = new StreamVideoRequest();
  req.setVideoId(videoId);
  req.setRepresentationId(rep.id);
  req.setStartSegment(segmentNumber);
  req.setGenerator(getGeneratorEnum(rep.generator));
  req.setWaitForSegments(true); // Key for push architecture
  
  if (options.startFromLiveEdge) {
    req.setStartFromLiveEdge(true);
  } else {
    req.setStartFromLiveEdge(false);
  }

  const call = grpcClient.streamVideoLive(req, {});

  const onAbort = () => {
    call.cancel();
    signal?.removeEventListener("abort", onAbort);
  };
  signal?.addEventListener("abort", onAbort);

  call.on("data", (chunk: StreamVideoChunk) => {
    if (signal?.aborted) return;
    
    const data = chunk.getData_asU8();
    const segNum = chunk.getSegmentNumber();
    const isLast = chunk.getIsLastChunk();
    
    if (data && data.length > 0) {
      onChunkReceived(data, segNum, isLast);
    } else if (isLast) {
      // Even if no data, notify if it was the last chunk of a segment
      onChunkReceived(new Uint8Array(0), segNum, isLast);
    }
  });

  call.on("error", (err: grpcWeb.RpcError) => {
    if (signal?.aborted || err.code === grpcWeb.StatusCode.CANCELLED) return;
    console.error(`Persistent Live Stream Error (${mediaType}):`, err);
    if (onError) onError(err);
  });

  call.on("end", () => {
    signal?.removeEventListener("abort", onAbort);
    if (onEnd) onEnd();
  });
}

export function fetchSegment({
  videoId,
  rep,
  segmentNumber,
  mediaType,
  signal,
  onProgress,
}: FetchSegmentOptions): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }

    const req = new SegmentRequest();
    req.setVideoId(videoId);
    req.setRepresentationId(rep.id);
    req.setSegmentNumber(segmentNumber);
    req.setInitSegment(false);
    req.setMedia(mediaType);
    req.setGenerator(getGeneratorEnum(rep.generator)); // Set generator

    const call = grpcClient.streamSegment(req, {});
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      call.cancel();
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort);

    call.on("data", (chunk: SegmentChunk) => {
      if (signal?.aborted) return;

      const data = chunk.getData_asU8();
      chunks.push(data);
      totalBytes += data.length;

      if (onProgress) {
        onProgress(totalBytes);
      }
    });

    call.on("end", () => {
      cleanup();

      if (signal?.aborted) {
        return reject(new DOMException("Aborted", "AbortError"));
      }

      const total = new Uint8Array(totalBytes);
      let offset = 0;
      chunks.forEach((arr) => {
        total.set(arr, offset);
        offset += arr.length;
      });

      resolve(total);
    });

    call.on("error", (err: grpcWeb.RpcError) => {
      cleanup();

      if (signal?.aborted) {
        return reject(new DOMException("Aborted", "AbortError"));
      }

      if (err.code === grpcWeb.StatusCode.CANCELLED) {
        return reject(new DOMException("Aborted", "AbortError"));
      }

      console.error(`Error fetching segment ${segmentNumber}:`, err);
      reject(err);
    });
  });
}

export function fetchInitSegment(
  videoId: string,
  rep: Representation,
  mediaType: MediaType
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const req = new SegmentRequest();
    req.setVideoId(videoId);
    req.setRepresentationId(rep.id);
    req.setInitSegment(true);
    req.setMedia(mediaType);
    req.setGenerator(getGeneratorEnum(rep.generator)); // Set generator

    const call = grpcClient.streamSegment(req, {});
    const chunks: Uint8Array[] = [];

    call.on("data", (chunk: SegmentChunk) => {
      chunks.push(chunk.getData_asU8());
    });

    call.on("end", () => {
      const totalBytes = chunks.reduce((sum, arr) => sum + arr.length, 0);
      const total = new Uint8Array(totalBytes);
      let offset = 0;
      chunks.forEach((arr) => {
        total.set(arr, offset);
        offset += arr.length;
      });

      resolve(total);
    });

    call.on("error", (err: grpcWeb.RpcError) => {
      reject(err);
    });
  });
}
