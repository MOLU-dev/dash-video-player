import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class Channel extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): Channel;

  getChannelName(): string;
  setChannelName(value: string): Channel;

  getDescription(): string;
  setDescription(value: string): Channel;

  getCategoryIdsList(): Array<string>;
  setCategoryIdsList(value: Array<string>): Channel;
  clearCategoryIdsList(): Channel;
  addCategoryIds(value: string, index?: number): Channel;

  getSubCategoryIdsList(): Array<string>;
  setSubCategoryIdsList(value: Array<string>): Channel;
  clearSubCategoryIdsList(): Channel;
  addSubCategoryIds(value: string, index?: number): Channel;

  getSubscriberCount(): number;
  setSubscriberCount(value: number): Channel;

  getProfilePicture(): Uint8Array | string;
  getProfilePicture_asU8(): Uint8Array;
  getProfilePicture_asB64(): string;
  setProfilePicture(value: Uint8Array | string): Channel;

  getBanner(): Uint8Array | string;
  getBanner_asU8(): Uint8Array;
  getBanner_asB64(): string;
  setBanner(value: Uint8Array | string): Channel;

  getHandle(): string;
  setHandle(value: string): Channel;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Channel;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Channel;

  getUpdatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Channel;
  hasUpdatedAt(): boolean;
  clearUpdatedAt(): Channel;

  getUrl(): string;
  setUrl(value: string): Channel;

  getLinkUrlList(): Array<string>;
  setLinkUrlList(value: Array<string>): Channel;
  clearLinkUrlList(): Channel;
  addLinkUrl(value: string, index?: number): Channel;

  getIsOwner(): boolean;
  setIsOwner(value: boolean): Channel;

  getVideoCount(): number;
  setVideoCount(value: number): Channel;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Channel.AsObject;
  static toObject(includeInstance: boolean, msg: Channel): Channel.AsObject;
  static serializeBinaryToWriter(message: Channel, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Channel;
  static deserializeBinaryFromReader(message: Channel, reader: jspb.BinaryReader): Channel;
}

export namespace Channel {
  export type AsObject = {
    channelId: string,
    channelName: string,
    description: string,
    categoryIdsList: Array<string>,
    subCategoryIdsList: Array<string>,
    subscriberCount: number,
    profilePicture: Uint8Array | string,
    banner: Uint8Array | string,
    handle: string,
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updatedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    url: string,
    linkUrlList: Array<string>,
    isOwner: boolean,
    videoCount: number,
  }
}

export enum Generator { 
  GENERATOR_UNKNOWN = 0,
  GENERATOR_FFMPEG = 1,
  GENERATOR_GPAC = 2,
}
