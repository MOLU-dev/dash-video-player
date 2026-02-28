import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"
import * as rpc_Channel_pb from './rpc_Channel_pb'; // proto import: "rpc_Channel.proto"
import * as google_protobuf_field_mask_pb from 'google-protobuf/google/protobuf/field_mask_pb'; // proto import: "google/protobuf/field_mask.proto"


export class Video extends jspb.Message {
  getId(): string;
  setId(value: string): Video;

  getTitle(): string;
  setTitle(value: string): Video;

  getThumbnail(): Uint8Array | string;
  getThumbnail_asU8(): Uint8Array;
  getThumbnail_asB64(): string;
  setThumbnail(value: Uint8Array | string): Video;

  getViews(): number;
  setViews(value: number): Video;

  getDuration(): string;
  setDuration(value: string): Video;

  getUploadAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUploadAt(value?: google_protobuf_timestamp_pb.Timestamp): Video;
  hasUploadAt(): boolean;
  clearUploadAt(): Video;

  getLastWatchedPosition(): number;
  setLastWatchedPosition(value: number): Video;

  getChannelavatar(): Uint8Array | string;
  getChannelavatar_asU8(): Uint8Array;
  getChannelavatar_asB64(): string;
  setChannelavatar(value: Uint8Array | string): Video;

  getChannelId(): string;
  setChannelId(value: string): Video;

  getChannelName(): string;
  setChannelName(value: string): Video;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Video.AsObject;
  static toObject(includeInstance: boolean, msg: Video): Video.AsObject;
  static serializeBinaryToWriter(message: Video, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Video;
  static deserializeBinaryFromReader(message: Video, reader: jspb.BinaryReader): Video;
}

export namespace Video {
  export type AsObject = {
    id: string,
    title: string,
    thumbnail: Uint8Array | string,
    views: number,
    duration: string,
    uploadAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    lastWatchedPosition: number,
    channelavatar: Uint8Array | string,
    channelId: string,
    channelName: string,
  }
}

export class GetVideosRequest extends jspb.Message {
  getLimit(): number;
  setLimit(value: number): GetVideosRequest;

  getOffset(): number;
  setOffset(value: number): GetVideosRequest;

  getRequestBy(): RequestBy;
  setRequestBy(value: RequestBy): GetVideosRequest;

  getWithKeyword(): string;
  setWithKeyword(value: string): GetVideosRequest;

  getSeed(): string;
  setSeed(value: string): GetVideosRequest;

  getIsWatching(): string;
  setIsWatching(value: string): GetVideosRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetVideosRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetVideosRequest): GetVideosRequest.AsObject;
  static serializeBinaryToWriter(message: GetVideosRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetVideosRequest;
  static deserializeBinaryFromReader(message: GetVideosRequest, reader: jspb.BinaryReader): GetVideosRequest;
}

export namespace GetVideosRequest {
  export type AsObject = {
    limit: number,
    offset: number,
    requestBy: RequestBy,
    withKeyword: string,
    seed: string,
    isWatching: string,
  }
}

export class GetVideosResponse extends jspb.Message {
  getVideosList(): Array<Video>;
  setVideosList(value: Array<Video>): GetVideosResponse;
  clearVideosList(): GetVideosResponse;
  addVideos(value?: Video, index?: number): Video;

  getHasMore(): boolean;
  setHasMore(value: boolean): GetVideosResponse;

  getSeed(): string;
  setSeed(value: string): GetVideosResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetVideosResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetVideosResponse): GetVideosResponse.AsObject;
  static serializeBinaryToWriter(message: GetVideosResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetVideosResponse;
  static deserializeBinaryFromReader(message: GetVideosResponse, reader: jspb.BinaryReader): GetVideosResponse;
}

export namespace GetVideosResponse {
  export type AsObject = {
    videosList: Array<Video.AsObject>,
    hasMore: boolean,
    seed: string,
  }
}

export class VideoContextRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): VideoContextRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoContextRequest.AsObject;
  static toObject(includeInstance: boolean, msg: VideoContextRequest): VideoContextRequest.AsObject;
  static serializeBinaryToWriter(message: VideoContextRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoContextRequest;
  static deserializeBinaryFromReader(message: VideoContextRequest, reader: jspb.BinaryReader): VideoContextRequest;
}

export namespace VideoContextRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class RecommendedKeywords extends jspb.Message {
  getKeyword(): string;
  setKeyword(value: string): RecommendedKeywords;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RecommendedKeywords.AsObject;
  static toObject(includeInstance: boolean, msg: RecommendedKeywords): RecommendedKeywords.AsObject;
  static serializeBinaryToWriter(message: RecommendedKeywords, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RecommendedKeywords;
  static deserializeBinaryFromReader(message: RecommendedKeywords, reader: jspb.BinaryReader): RecommendedKeywords;
}

export namespace RecommendedKeywords {
  export type AsObject = {
    keyword: string,
  }
}

export class RecommendedKeywordsResponse extends jspb.Message {
  getKeywordsList(): Array<RecommendedKeywords>;
  setKeywordsList(value: Array<RecommendedKeywords>): RecommendedKeywordsResponse;
  clearKeywordsList(): RecommendedKeywordsResponse;
  addKeywords(value?: RecommendedKeywords, index?: number): RecommendedKeywords;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RecommendedKeywordsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: RecommendedKeywordsResponse): RecommendedKeywordsResponse.AsObject;
  static serializeBinaryToWriter(message: RecommendedKeywordsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RecommendedKeywordsResponse;
  static deserializeBinaryFromReader(message: RecommendedKeywordsResponse, reader: jspb.BinaryReader): RecommendedKeywordsResponse;
}

export namespace RecommendedKeywordsResponse {
  export type AsObject = {
    keywordsList: Array<RecommendedKeywords.AsObject>,
  }
}

export class VideoDetailsRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): VideoDetailsRequest;

  getMaskField(): google_protobuf_field_mask_pb.FieldMask | undefined;
  setMaskField(value?: google_protobuf_field_mask_pb.FieldMask): VideoDetailsRequest;
  hasMaskField(): boolean;
  clearMaskField(): VideoDetailsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoDetailsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: VideoDetailsRequest): VideoDetailsRequest.AsObject;
  static serializeBinaryToWriter(message: VideoDetailsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoDetailsRequest;
  static deserializeBinaryFromReader(message: VideoDetailsRequest, reader: jspb.BinaryReader): VideoDetailsRequest;
}

export namespace VideoDetailsRequest {
  export type AsObject = {
    videoId: string,
    maskField?: google_protobuf_field_mask_pb.FieldMask.AsObject,
  }
}

export class MetadataResponse extends jspb.Message {
  getVideo(): Video | undefined;
  setVideo(value?: Video): MetadataResponse;
  hasVideo(): boolean;
  clearVideo(): MetadataResponse;

  getChannel(): rpc_Channel_pb.Channel | undefined;
  setChannel(value?: rpc_Channel_pb.Channel): MetadataResponse;
  hasChannel(): boolean;
  clearChannel(): MetadataResponse;

  getDescription(): string;
  setDescription(value: string): MetadataResponse;

  getLikes(): number;
  setLikes(value: number): MetadataResponse;

  getDislikes(): number;
  setDislikes(value: number): MetadataResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MetadataResponse.AsObject;
  static toObject(includeInstance: boolean, msg: MetadataResponse): MetadataResponse.AsObject;
  static serializeBinaryToWriter(message: MetadataResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MetadataResponse;
  static deserializeBinaryFromReader(message: MetadataResponse, reader: jspb.BinaryReader): MetadataResponse;
}

export namespace MetadataResponse {
  export type AsObject = {
    video?: Video.AsObject,
    channel?: rpc_Channel_pb.Channel.AsObject,
    description: string,
    likes: number,
    dislikes: number,
  }
}

export enum RequestBy { 
  HOME = 0,
  CHANNELS_VIDEO = 1,
  SUBSCRIBED_CHANNELS_VIDEO = 2,
  PLAYLIST_VIDEO = 3,
  EDITING = 4,
}
