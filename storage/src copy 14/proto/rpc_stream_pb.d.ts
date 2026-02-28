import * as jspb from 'google-protobuf'



export class ManifestRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): ManifestRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManifestRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ManifestRequest): ManifestRequest.AsObject;
  static serializeBinaryToWriter(message: ManifestRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManifestRequest;
  static deserializeBinaryFromReader(message: ManifestRequest, reader: jspb.BinaryReader): ManifestRequest;
}

export namespace ManifestRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class ManifestResponse extends jspb.Message {
  getMpdXml(): Uint8Array | string;
  getMpdXml_asU8(): Uint8Array;
  getMpdXml_asB64(): string;
  setMpdXml(value: Uint8Array | string): ManifestResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManifestResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ManifestResponse): ManifestResponse.AsObject;
  static serializeBinaryToWriter(message: ManifestResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManifestResponse;
  static deserializeBinaryFromReader(message: ManifestResponse, reader: jspb.BinaryReader): ManifestResponse;
}

export namespace ManifestResponse {
  export type AsObject = {
    mpdXml: Uint8Array | string,
  }
}

export class SegmentRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): SegmentRequest;

  getRepresentationId(): string;
  setRepresentationId(value: string): SegmentRequest;

  getSegmentNumber(): number;
  setSegmentNumber(value: number): SegmentRequest;

  getInitSegment(): boolean;
  setInitSegment(value: boolean): SegmentRequest;

  getMedia(): string;
  setMedia(value: string): SegmentRequest;

  getGenerator(): Generator;
  setGenerator(value: Generator): SegmentRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SegmentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SegmentRequest): SegmentRequest.AsObject;
  static serializeBinaryToWriter(message: SegmentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SegmentRequest;
  static deserializeBinaryFromReader(message: SegmentRequest, reader: jspb.BinaryReader): SegmentRequest;
}

export namespace SegmentRequest {
  export type AsObject = {
    videoId: string,
    representationId: string,
    segmentNumber: number,
    initSegment: boolean,
    media: string,
    generator: Generator,
  }
}

export class SegmentChunk extends jspb.Message {
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): SegmentChunk;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SegmentChunk.AsObject;
  static toObject(includeInstance: boolean, msg: SegmentChunk): SegmentChunk.AsObject;
  static serializeBinaryToWriter(message: SegmentChunk, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SegmentChunk;
  static deserializeBinaryFromReader(message: SegmentChunk, reader: jspb.BinaryReader): SegmentChunk;
}

export namespace SegmentChunk {
  export type AsObject = {
    data: Uint8Array | string,
  }
}

export enum Generator { 
  GENERATOR_UNKNOWN = 0,
  GENERATOR_FFMPEG = 1,
  GENERATOR_GPAC = 2,
}
