import * as jspb from 'google-protobuf'

import * as common_pb from './common_pb'; // proto import: "common.proto"


export class StreamVideoRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): StreamVideoRequest;

  getRepresentationId(): string;
  setRepresentationId(value: string): StreamVideoRequest;

  getStartSegment(): number;
  setStartSegment(value: number): StreamVideoRequest;

  getGenerator(): common_pb.Generator;
  setGenerator(value: common_pb.Generator): StreamVideoRequest;

  getWaitForSegments(): boolean;
  setWaitForSegments(value: boolean): StreamVideoRequest;

  getStartFromLiveEdge(): boolean;
  setStartFromLiveEdge(value: boolean): StreamVideoRequest;

  getSegmentsBehindLive(): number;
  setSegmentsBehindLive(value: number): StreamVideoRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamVideoRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StreamVideoRequest): StreamVideoRequest.AsObject;
  static serializeBinaryToWriter(message: StreamVideoRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamVideoRequest;
  static deserializeBinaryFromReader(message: StreamVideoRequest, reader: jspb.BinaryReader): StreamVideoRequest;
}

export namespace StreamVideoRequest {
  export type AsObject = {
    videoId: string,
    representationId: string,
    startSegment: number,
    generator: common_pb.Generator,
    waitForSegments: boolean,
    startFromLiveEdge: boolean,
    segmentsBehindLive: number,
  }
}

export class StreamVideoChunk extends jspb.Message {
  getSegmentNumber(): number;
  setSegmentNumber(value: number): StreamVideoChunk;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): StreamVideoChunk;

  getIsInit(): boolean;
  setIsInit(value: boolean): StreamVideoChunk;

  getIsLastChunk(): boolean;
  setIsLastChunk(value: boolean): StreamVideoChunk;

  getIsFinalSegment(): boolean;
  setIsFinalSegment(value: boolean): StreamVideoChunk;

  getCurrentLiveEdge(): number;
  setCurrentLiveEdge(value: number): StreamVideoChunk;

  getSegmentsBehind(): number;
  setSegmentsBehind(value: number): StreamVideoChunk;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamVideoChunk.AsObject;
  static toObject(includeInstance: boolean, msg: StreamVideoChunk): StreamVideoChunk.AsObject;
  static serializeBinaryToWriter(message: StreamVideoChunk, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamVideoChunk;
  static deserializeBinaryFromReader(message: StreamVideoChunk, reader: jspb.BinaryReader): StreamVideoChunk;
}

export namespace StreamVideoChunk {
  export type AsObject = {
    segmentNumber: number,
    data: Uint8Array | string,
    isInit: boolean,
    isLastChunk: boolean,
    isFinalSegment: boolean,
    currentLiveEdge: number,
    segmentsBehind: number,
  }
}

export class GetLiveEdgeRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): GetLiveEdgeRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetLiveEdgeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetLiveEdgeRequest): GetLiveEdgeRequest.AsObject;
  static serializeBinaryToWriter(message: GetLiveEdgeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetLiveEdgeRequest;
  static deserializeBinaryFromReader(message: GetLiveEdgeRequest, reader: jspb.BinaryReader): GetLiveEdgeRequest;
}

export namespace GetLiveEdgeRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class GetLiveEdgeResponse extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): GetLiveEdgeResponse;

  getLiveEdge(): number;
  setLiveEdge(value: number): GetLiveEdgeResponse;

  getAvailableSegments(): number;
  setAvailableSegments(value: number): GetLiveEdgeResponse;

  getIsLive(): boolean;
  setIsLive(value: boolean): GetLiveEdgeResponse;

  getRecommendedStart(): number;
  setRecommendedStart(value: number): GetLiveEdgeResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetLiveEdgeResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetLiveEdgeResponse): GetLiveEdgeResponse.AsObject;
  static serializeBinaryToWriter(message: GetLiveEdgeResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetLiveEdgeResponse;
  static deserializeBinaryFromReader(message: GetLiveEdgeResponse, reader: jspb.BinaryReader): GetLiveEdgeResponse;
}

export namespace GetLiveEdgeResponse {
  export type AsObject = {
    videoId: string,
    liveEdge: number,
    availableSegments: number,
    isLive: boolean,
    recommendedStart: number,
  }
}

export class LiveManifestRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): LiveManifestRequest;

  getIncludeInitialManifest(): boolean;
  setIncludeInitialManifest(value: boolean): LiveManifestRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LiveManifestRequest.AsObject;
  static toObject(includeInstance: boolean, msg: LiveManifestRequest): LiveManifestRequest.AsObject;
  static serializeBinaryToWriter(message: LiveManifestRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LiveManifestRequest;
  static deserializeBinaryFromReader(message: LiveManifestRequest, reader: jspb.BinaryReader): LiveManifestRequest;
}

export namespace LiveManifestRequest {
  export type AsObject = {
    videoId: string,
    includeInitialManifest: boolean,
  }
}

export class LiveManifestUpdate extends jspb.Message {
  getType(): LiveManifestUpdate.UpdateType;
  setType(value: LiveManifestUpdate.UpdateType): LiveManifestUpdate;

  getMpdXml(): Uint8Array | string;
  getMpdXml_asU8(): Uint8Array;
  getMpdXml_asB64(): string;
  setMpdXml(value: Uint8Array | string): LiveManifestUpdate;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LiveManifestUpdate.AsObject;
  static toObject(includeInstance: boolean, msg: LiveManifestUpdate): LiveManifestUpdate.AsObject;
  static serializeBinaryToWriter(message: LiveManifestUpdate, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LiveManifestUpdate;
  static deserializeBinaryFromReader(message: LiveManifestUpdate, reader: jspb.BinaryReader): LiveManifestUpdate;
}

export namespace LiveManifestUpdate {
  export type AsObject = {
    type: LiveManifestUpdate.UpdateType,
    mpdXml: Uint8Array | string,
  }

  export enum UpdateType { 
    FULL_MANIFEST = 0,
    SEGMENT_AVAILABLE = 1,
    STREAM_ENDED = 2,
    ERROR = 3,
  }
}

