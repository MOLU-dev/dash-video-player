import * as jspb from 'google-protobuf'

import * as common_pb from './common_pb'; // proto import: "common.proto"
import * as session_pb from './session_pb'; // proto import: "session.proto"
import * as google_protobuf_field_mask_pb from 'google-protobuf/google/protobuf/field_mask_pb'; // proto import: "google/protobuf/field_mask.proto"


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

export class UpdateChannelRequest extends jspb.Message {
  getChannel(): common_pb.Channel | undefined;
  setChannel(value?: common_pb.Channel): UpdateChannelRequest;
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
    channel?: common_pb.Channel.AsObject,
    updateMask?: google_protobuf_field_mask_pb.FieldMask.AsObject,
  }
}

export class UpdateChannelResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): UpdateChannelResponse;

  getMessage(): string;
  setMessage(value: string): UpdateChannelResponse;

  getChannel(): common_pb.Channel | undefined;
  setChannel(value?: common_pb.Channel): UpdateChannelResponse;
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
    channel?: common_pb.Channel.AsObject,
  }
}

export class ChannelResponse extends jspb.Message {
  getChannelsList(): Array<common_pb.Channel>;
  setChannelsList(value: Array<common_pb.Channel>): ChannelResponse;
  clearChannelsList(): ChannelResponse;
  addChannels(value?: common_pb.Channel, index?: number): common_pb.Channel;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelResponse): ChannelResponse.AsObject;
  static serializeBinaryToWriter(message: ChannelResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelResponse;
  static deserializeBinaryFromReader(message: ChannelResponse, reader: jspb.BinaryReader): ChannelResponse;
}

export namespace ChannelResponse {
  export type AsObject = {
    channelsList: Array<common_pb.Channel.AsObject>,
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
  getChannel(): common_pb.Channel | undefined;
  setChannel(value?: common_pb.Channel): GetChannelResponse;
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
    channel?: common_pb.Channel.AsObject,
  }
}

