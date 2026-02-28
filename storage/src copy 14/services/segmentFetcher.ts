import * as grpcWeb from "grpc-web";
import type { Representation, MediaType } from "../types/player.types";
import { grpcClient } from "../../../src/utils/grpcClient";
import {
  SegmentRequest,
  SegmentChunk,
  Generator,
} from "../../../src/proto/rpc_stream_pb";

export interface FetchSegmentOptions {
  videoId: string;
  rep: Representation;
  segmentNumber: number;
  mediaType: MediaType;
  generator?: "gpac" | "ffmpeg" | "unknown";
  signal?: AbortSignal;
  onProgress?: (bytes: number) => void;
}

function mapGeneratorToProto(
  generator?: "gpac" | "ffmpeg" | "unknown"
): Generator {
  switch (generator) {
    case "gpac":
      return Generator.GENERATOR_GPAC;
    case "ffmpeg":
      return Generator.GENERATOR_FFMPEG;
    default:
      return Generator.GENERATOR_UNKNOWN;
  }
}

export function fetchSegment({
  videoId,
  rep,
  segmentNumber,
  mediaType,
  generator,
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
    req.setGenerator(mapGeneratorToProto(generator));

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
  repId: string,
  mediaType: MediaType,
  generator?: "gpac" | "ffmpeg" | "unknown"
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const req = new SegmentRequest();
    req.setVideoId(videoId);
    req.setRepresentationId(repId);
    req.setInitSegment(true);
    req.setMedia(mediaType);
    req.setGenerator(mapGeneratorToProto(generator));

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
