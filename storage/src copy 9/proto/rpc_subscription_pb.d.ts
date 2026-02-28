import * as jspb from 'google-protobuf'

import * as rpc_Channel_pb from './rpc_Channel_pb'; // proto import: "rpc_Channel.proto"


export class SubscribeRequest extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): SubscribeRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribeRequest): SubscribeRequest.AsObject;
  static serializeBinaryToWriter(message: SubscribeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribeRequest;
  static deserializeBinaryFromReader(message: SubscribeRequest, reader: jspb.BinaryReader): SubscribeRequest;
}

export namespace SubscribeRequest {
  export type AsObject = {
    channelId: string,
  }
}

export class SubscriptionStatus extends jspb.Message {
  getSubscribed(): boolean;
  setSubscribed(value: boolean): SubscriptionStatus;

  getSubscribersCount(): number;
  setSubscribersCount(value: number): SubscriptionStatus;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscriptionStatus.AsObject;
  static toObject(includeInstance: boolean, msg: SubscriptionStatus): SubscriptionStatus.AsObject;
  static serializeBinaryToWriter(message: SubscriptionStatus, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscriptionStatus;
  static deserializeBinaryFromReader(message: SubscriptionStatus, reader: jspb.BinaryReader): SubscriptionStatus;
}

export namespace SubscriptionStatus {
  export type AsObject = {
    subscribed: boolean,
    subscribersCount: number,
  }
}

export class SubscribedUser extends jspb.Message {
  getUserId(): string;
  setUserId(value: string): SubscribedUser;

  getUsername(): string;
  setUsername(value: string): SubscribedUser;

  getAvatar(): Uint8Array | string;
  getAvatar_asU8(): Uint8Array;
  getAvatar_asB64(): string;
  setAvatar(value: Uint8Array | string): SubscribedUser;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribedUser.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribedUser): SubscribedUser.AsObject;
  static serializeBinaryToWriter(message: SubscribedUser, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribedUser;
  static deserializeBinaryFromReader(message: SubscribedUser, reader: jspb.BinaryReader): SubscribedUser;
}

export namespace SubscribedUser {
  export type AsObject = {
    userId: string,
    username: string,
    avatar: Uint8Array | string,
  }
}

export class SubscribersResponse extends jspb.Message {
  getSubscribersList(): Array<SubscribedUser>;
  setSubscribersList(value: Array<SubscribedUser>): SubscribersResponse;
  clearSubscribersList(): SubscribersResponse;
  addSubscribers(value?: SubscribedUser, index?: number): SubscribedUser;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribersResponse): SubscribersResponse.AsObject;
  static serializeBinaryToWriter(message: SubscribersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribersResponse;
  static deserializeBinaryFromReader(message: SubscribersResponse, reader: jspb.BinaryReader): SubscribersResponse;
}

export namespace SubscribersResponse {
  export type AsObject = {
    subscribersList: Array<SubscribedUser.AsObject>,
  }
}

export class SubscribedResponse extends jspb.Message {
  getChannel(): rpc_Channel_pb.Channel | undefined;
  setChannel(value?: rpc_Channel_pb.Channel): SubscribedResponse;
  hasChannel(): boolean;
  clearChannel(): SubscribedResponse;

  getStatus(): SubscriptionStatus | undefined;
  setStatus(value?: SubscriptionStatus): SubscribedResponse;
  hasStatus(): boolean;
  clearStatus(): SubscribedResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribedResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribedResponse): SubscribedResponse.AsObject;
  static serializeBinaryToWriter(message: SubscribedResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribedResponse;
  static deserializeBinaryFromReader(message: SubscribedResponse, reader: jspb.BinaryReader): SubscribedResponse;
}

export namespace SubscribedResponse {
  export type AsObject = {
    channel?: rpc_Channel_pb.Channel.AsObject,
    status?: SubscriptionStatus.AsObject,
  }
}

