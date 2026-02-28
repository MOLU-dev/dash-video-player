import * as jspb from 'google-protobuf'

import * as session_pb from './session_pb'; // proto import: "session.proto"
import * as google_protobuf_field_mask_pb from 'google-protobuf/google/protobuf/field_mask_pb'; // proto import: "google/protobuf/field_mask.proto"
import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class ChannelRequest extends jspb.Message {
  getChannelName(): string;
  setChannelName(value: string): ChannelRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelRequest): ChannelRequest.AsObject;
  static serializeBinaryToWriter(message: ChannelRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelRequest;
  static deserializeBinaryFromReader(message: ChannelRequest, reader: jspb.BinaryReader): ChannelRequest;
}

export namespace ChannelRequest {
  export type AsObject = {
    channelName: string,
  }
}

export class CreateChannelRequest extends jspb.Message {
  getName(): string;
  setName(value: string): CreateChannelRequest;

  getHandle(): string;
  setHandle(value: string): CreateChannelRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateChannelRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateChannelRequest): CreateChannelRequest.AsObject;
  static serializeBinaryToWriter(message: CreateChannelRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateChannelRequest;
  static deserializeBinaryFromReader(message: CreateChannelRequest, reader: jspb.BinaryReader): CreateChannelRequest;
}

export namespace CreateChannelRequest {
  export type AsObject = {
    name: string,
    handle: string,
  }
}

export class CreateChannelResponse extends jspb.Message {
  getSession(): session_pb.SessionResponse | undefined;
  setSession(value?: session_pb.SessionResponse): CreateChannelResponse;
  hasSession(): boolean;
  clearSession(): CreateChannelResponse;

  getSuccess(): boolean;
  setSuccess(value: boolean): CreateChannelResponse;

  getMessage(): string;
  setMessage(value: string): CreateChannelResponse;

  getChannelId(): string;
  setChannelId(value: string): CreateChannelResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateChannelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateChannelResponse): CreateChannelResponse.AsObject;
  static serializeBinaryToWriter(message: CreateChannelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateChannelResponse;
  static deserializeBinaryFromReader(message: CreateChannelResponse, reader: jspb.BinaryReader): CreateChannelResponse;
}

export namespace CreateChannelResponse {
  export type AsObject = {
    session?: session_pb.SessionResponse.AsObject,
    success: boolean,
    message: string,
    channelId: string,
  }
}

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

export class UpdateChannelRequest extends jspb.Message {
  getChannel(): Channel | undefined;
  setChannel(value?: Channel): UpdateChannelRequest;
  hasChannel(): boolean;
  clearChannel(): UpdateChannelRequest;

  getUpdateMask(): google_protobuf_field_mask_pb.FieldMask | undefined;
  setUpdateMask(value?: google_protobuf_field_mask_pb.FieldMask): UpdateChannelRequest;
  hasUpdateMask(): boolean;
  clearUpdateMask(): UpdateChannelRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateChannelRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateChannelRequest): UpdateChannelRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateChannelRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateChannelRequest;
  static deserializeBinaryFromReader(message: UpdateChannelRequest, reader: jspb.BinaryReader): UpdateChannelRequest;
}

export namespace UpdateChannelRequest {
  export type AsObject = {
    channel?: Channel.AsObject,
    updateMask?: google_protobuf_field_mask_pb.FieldMask.AsObject,
  }
}

export class UpdateChannelResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): UpdateChannelResponse;

  getMessage(): string;
  setMessage(value: string): UpdateChannelResponse;

  getChannel(): Channel | undefined;
  setChannel(value?: Channel): UpdateChannelResponse;
  hasChannel(): boolean;
  clearChannel(): UpdateChannelResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateChannelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateChannelResponse): UpdateChannelResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateChannelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateChannelResponse;
  static deserializeBinaryFromReader(message: UpdateChannelResponse, reader: jspb.BinaryReader): UpdateChannelResponse;
}

export namespace UpdateChannelResponse {
  export type AsObject = {
    success: boolean,
    message: string,
    channel?: Channel.AsObject,
  }
}

export class ChannelResponse extends jspb.Message {
  getChannelsList(): Array<Channel>;
  setChannelsList(value: Array<Channel>): ChannelResponse;
  clearChannelsList(): ChannelResponse;
  addChannels(value?: Channel, index?: number): Channel;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelResponse): ChannelResponse.AsObject;
  static serializeBinaryToWriter(message: ChannelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelResponse;
  static deserializeBinaryFromReader(message: ChannelResponse, reader: jspb.BinaryReader): ChannelResponse;
}

export namespace ChannelResponse {
  export type AsObject = {
    channelsList: Array<Channel.AsObject>,
  }
}

export class listSubscribersRequest extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): listSubscribersRequest;

  getLimit(): number;
  setLimit(value: number): listSubscribersRequest;

  getOffset(): number;
  setOffset(value: number): listSubscribersRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): listSubscribersRequest.AsObject;
  static toObject(includeInstance: boolean, msg: listSubscribersRequest): listSubscribersRequest.AsObject;
  static serializeBinaryToWriter(message: listSubscribersRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): listSubscribersRequest;
  static deserializeBinaryFromReader(message: listSubscribersRequest, reader: jspb.BinaryReader): listSubscribersRequest;
}

export namespace listSubscribersRequest {
  export type AsObject = {
    channelId: string,
    limit: number,
    offset: number,
  }
}

export class ListSubscribersResponse extends jspb.Message {
  getSubscribersList(): Array<Subscriber>;
  setSubscribersList(value: Array<Subscriber>): ListSubscribersResponse;
  clearSubscribersList(): ListSubscribersResponse;
  addSubscribers(value?: Subscriber, index?: number): Subscriber;

  getHasMore(): boolean;
  setHasMore(value: boolean): ListSubscribersResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListSubscribersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListSubscribersResponse): ListSubscribersResponse.AsObject;
  static serializeBinaryToWriter(message: ListSubscribersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListSubscribersResponse;
  static deserializeBinaryFromReader(message: ListSubscribersResponse, reader: jspb.BinaryReader): ListSubscribersResponse;
}

export namespace ListSubscribersResponse {
  export type AsObject = {
    subscribersList: Array<Subscriber.AsObject>,
    hasMore: boolean,
  }
}

export class Subscriber extends jspb.Message {
  getSubscriberId(): string;
  setSubscriberId(value: string): Subscriber;

  getSubscriberName(): string;
  setSubscriberName(value: string): Subscriber;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Subscriber.AsObject;
  static toObject(includeInstance: boolean, msg: Subscriber): Subscriber.AsObject;
  static serializeBinaryToWriter(message: Subscriber, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Subscriber;
  static deserializeBinaryFromReader(message: Subscriber, reader: jspb.BinaryReader): Subscriber;
}

export namespace Subscriber {
  export type AsObject = {
    subscriberId: string,
    subscriberName: string,
  }
}

export class GetChannelResponse extends jspb.Message {
  getChannel(): Channel | undefined;
  setChannel(value?: Channel): GetChannelResponse;
  hasChannel(): boolean;
  clearChannel(): GetChannelResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetChannelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetChannelResponse): GetChannelResponse.AsObject;
  static serializeBinaryToWriter(message: GetChannelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetChannelResponse;
  static deserializeBinaryFromReader(message: GetChannelResponse, reader: jspb.BinaryReader): GetChannelResponse;
}

export namespace GetChannelResponse {
  export type AsObject = {
    channel?: Channel.AsObject,
  }
}

