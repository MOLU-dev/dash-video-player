import * as jspb from 'google-protobuf'



export class PreviewRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): PreviewRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PreviewRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PreviewRequest): PreviewRequest.AsObject;
  static serializeBinaryToWriter(message: PreviewRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PreviewRequest;
  static deserializeBinaryFromReader(message: PreviewRequest, reader: jspb.BinaryReader): PreviewRequest;
}

export namespace PreviewRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class PreviewResponse extends jspb.Message {
  getPreview(): Uint8Array | string;
  getPreview_asU8(): Uint8Array;
  getPreview_asB64(): string;
  setPreview(value: Uint8Array | string): PreviewResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PreviewResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PreviewResponse): PreviewResponse.AsObject;
  static serializeBinaryToWriter(message: PreviewResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PreviewResponse;
  static deserializeBinaryFromReader(message: PreviewResponse, reader: jspb.BinaryReader): PreviewResponse;
}

export namespace PreviewResponse {
  export type AsObject = {
    preview: Uint8Array | string,
  }
}

