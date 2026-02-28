import * as jspb from 'google-protobuf'



export class GetGifRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): GetGifRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGifRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetGifRequest): GetGifRequest.AsObject;
  static serializeBinaryToWriter(message: GetGifRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGifRequest;
  static deserializeBinaryFromReader(message: GetGifRequest, reader: jspb.BinaryReader): GetGifRequest;
}

export namespace GetGifRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class GetGifResponse extends jspb.Message {
  getThumbnailGif(): Uint8Array | string;
  getThumbnailGif_asU8(): Uint8Array;
  getThumbnailGif_asB64(): string;
  setThumbnailGif(value: Uint8Array | string): GetGifResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetGifResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetGifResponse): GetGifResponse.AsObject;
  static serializeBinaryToWriter(message: GetGifResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetGifResponse;
  static deserializeBinaryFromReader(message: GetGifResponse, reader: jspb.BinaryReader): GetGifResponse;
}

export namespace GetGifResponse {
  export type AsObject = {
    thumbnailGif: Uint8Array | string,
  }
}

