import * as jspb from 'google-protobuf'

import * as google_protobuf_field_mask_pb from 'google-protobuf/google/protobuf/field_mask_pb'; // proto import: "google/protobuf/field_mask.proto"


export class VideoDetails extends jspb.Message {
  getTitle(): string;
  setTitle(value: string): VideoDetails;

  getDescription(): string;
  setDescription(value: string): VideoDetails;

  getVisibility(): Visibility;
  setVisibility(value: Visibility): VideoDetails;

  getTagsList(): Array<string>;
  setTagsList(value: Array<string>): VideoDetails;
  clearTagsList(): VideoDetails;
  addTags(value: string, index?: number): VideoDetails;

  getCategoryName(): string;
  setCategoryName(value: string): VideoDetails;

  getSubcategoriesName(): string;
  setSubcategoriesName(value: string): VideoDetails;

  getThumbnail(): Uint8Array | string;
  getThumbnail_asU8(): Uint8Array;
  getThumbnail_asB64(): string;
  setThumbnail(value: Uint8Array | string): VideoDetails;

  getIsMadeForKids(): boolean;
  setIsMadeForKids(value: boolean): VideoDetails;

  getIsAlteredContent(): boolean;
  setIsAlteredContent(value: boolean): VideoDetails;

  getHasPaidPromotion(): boolean;
  setHasPaidPromotion(value: boolean): VideoDetails;

  getLicenseType(): string;
  setLicenseType(value: string): VideoDetails;

  getCommentSettings(): CommentSettings | undefined;
  setCommentSettings(value?: CommentSettings): VideoDetails;
  hasCommentSettings(): boolean;
  clearCommentSettings(): VideoDetails;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoDetails.AsObject;
  static toObject(includeInstance: boolean, msg: VideoDetails): VideoDetails.AsObject;
  static serializeBinaryToWriter(message: VideoDetails, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoDetails;
  static deserializeBinaryFromReader(message: VideoDetails, reader: jspb.BinaryReader): VideoDetails;
}

export namespace VideoDetails {
  export type AsObject = {
    title: string,
    description: string,
    visibility: Visibility,
    tagsList: Array<string>,
    categoryName: string,
    subcategoriesName: string,
    thumbnail: Uint8Array | string,
    isMadeForKids: boolean,
    isAlteredContent: boolean,
    hasPaidPromotion: boolean,
    licenseType: string,
    commentSettings?: CommentSettings.AsObject,
  }
}

export class CommentSettings extends jspb.Message {
  getEnabled(): boolean;
  setEnabled(value: boolean): CommentSettings;

  getModeration(): string;
  setModeration(value: string): CommentSettings;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CommentSettings.AsObject;
  static toObject(includeInstance: boolean, msg: CommentSettings): CommentSettings.AsObject;
  static serializeBinaryToWriter(message: CommentSettings, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CommentSettings;
  static deserializeBinaryFromReader(message: CommentSettings, reader: jspb.BinaryReader): CommentSettings;
}

export namespace CommentSettings {
  export type AsObject = {
    enabled: boolean,
    moderation: string,
  }
}

export class EditeVideoDetailsRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): EditeVideoDetailsRequest;

  getVideoDetails(): VideoDetails | undefined;
  setVideoDetails(value?: VideoDetails): EditeVideoDetailsRequest;
  hasVideoDetails(): boolean;
  clearVideoDetails(): EditeVideoDetailsRequest;

  getUpdateMask(): google_protobuf_field_mask_pb.FieldMask | undefined;
  setUpdateMask(value?: google_protobuf_field_mask_pb.FieldMask): EditeVideoDetailsRequest;
  hasUpdateMask(): boolean;
  clearUpdateMask(): EditeVideoDetailsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditeVideoDetailsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditeVideoDetailsRequest): EditeVideoDetailsRequest.AsObject;
  static serializeBinaryToWriter(message: EditeVideoDetailsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditeVideoDetailsRequest;
  static deserializeBinaryFromReader(message: EditeVideoDetailsRequest, reader: jspb.BinaryReader): EditeVideoDetailsRequest;
}

export namespace EditeVideoDetailsRequest {
  export type AsObject = {
    videoId: string,
    videoDetails?: VideoDetails.AsObject,
    updateMask?: google_protobuf_field_mask_pb.FieldMask.AsObject,
  }
}

export class VideoDetailsResponse extends jspb.Message {
  getVideoDetails(): VideoDetails | undefined;
  setVideoDetails(value?: VideoDetails): VideoDetailsResponse;
  hasVideoDetails(): boolean;
  clearVideoDetails(): VideoDetailsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoDetailsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: VideoDetailsResponse): VideoDetailsResponse.AsObject;
  static serializeBinaryToWriter(message: VideoDetailsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoDetailsResponse;
  static deserializeBinaryFromReader(message: VideoDetailsResponse, reader: jspb.BinaryReader): VideoDetailsResponse;
}

export namespace VideoDetailsResponse {
  export type AsObject = {
    videoDetails?: VideoDetails.AsObject,
  }
}

export class GetVideoDetailRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): GetVideoDetailRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetVideoDetailRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetVideoDetailRequest): GetVideoDetailRequest.AsObject;
  static serializeBinaryToWriter(message: GetVideoDetailRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetVideoDetailRequest;
  static deserializeBinaryFromReader(message: GetVideoDetailRequest, reader: jspb.BinaryReader): GetVideoDetailRequest;
}

export namespace GetVideoDetailRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class DeletesVideoRequest extends jspb.Message {
  getVideoIdList(): Array<string>;
  setVideoIdList(value: Array<string>): DeletesVideoRequest;
  clearVideoIdList(): DeletesVideoRequest;
  addVideoId(value: string, index?: number): DeletesVideoRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeletesVideoRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeletesVideoRequest): DeletesVideoRequest.AsObject;
  static serializeBinaryToWriter(message: DeletesVideoRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeletesVideoRequest;
  static deserializeBinaryFromReader(message: DeletesVideoRequest, reader: jspb.BinaryReader): DeletesVideoRequest;
}

export namespace DeletesVideoRequest {
  export type AsObject = {
    videoIdList: Array<string>,
  }
}

export class DeletesVideoResponse extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): DeletesVideoResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeletesVideoResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeletesVideoResponse): DeletesVideoResponse.AsObject;
  static serializeBinaryToWriter(message: DeletesVideoResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeletesVideoResponse;
  static deserializeBinaryFromReader(message: DeletesVideoResponse, reader: jspb.BinaryReader): DeletesVideoResponse;
}

export namespace DeletesVideoResponse {
  export type AsObject = {
    message: string,
  }
}

export enum Visibility { 
  VISIBILITY_UNSPECIFIED = 0,
  PUBLIC = 1,
  UNLISTED = 2,
  PRIVATE = 3,
}
