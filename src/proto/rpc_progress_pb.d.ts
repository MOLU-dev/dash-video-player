import * as jspb from 'google-protobuf'



export class VideoProgressRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): VideoProgressRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoProgressRequest.AsObject;
  static toObject(includeInstance: boolean, msg: VideoProgressRequest): VideoProgressRequest.AsObject;
  static serializeBinaryToWriter(message: VideoProgressRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoProgressRequest;
  static deserializeBinaryFromReader(message: VideoProgressRequest, reader: jspb.BinaryReader): VideoProgressRequest;
}

export namespace VideoProgressRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class VideoProgressResponse extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): VideoProgressResponse;

  getProgressPercent(): number;
  setProgressPercent(value: number): VideoProgressResponse;

  getMessage(): string;
  setMessage(value: string): VideoProgressResponse;

  getStage(): string;
  setStage(value: string): VideoProgressResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoProgressResponse.AsObject;
  static toObject(includeInstance: boolean, msg: VideoProgressResponse): VideoProgressResponse.AsObject;
  static serializeBinaryToWriter(message: VideoProgressResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoProgressResponse;
  static deserializeBinaryFromReader(message: VideoProgressResponse, reader: jspb.BinaryReader): VideoProgressResponse;
}

export namespace VideoProgressResponse {
  export type AsObject = {
    videoId: string,
    progressPercent: number,
    message: string,
    stage: string,
  }
}

