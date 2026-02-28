import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class SiginRequest extends jspb.Message {
  getToken(): string;
  setToken(value: string): SiginRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SiginRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SiginRequest): SiginRequest.AsObject;
  static serializeBinaryToWriter(message: SiginRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SiginRequest;
  static deserializeBinaryFromReader(message: SiginRequest, reader: jspb.BinaryReader): SiginRequest;
}

export namespace SiginRequest {
  export type AsObject = {
    token: string,
  }
}

export class RefreshRequest extends jspb.Message {
  getRefreshToken(): string;
  setRefreshToken(value: string): RefreshRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RefreshRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RefreshRequest): RefreshRequest.AsObject;
  static serializeBinaryToWriter(message: RefreshRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RefreshRequest;
  static deserializeBinaryFromReader(message: RefreshRequest, reader: jspb.BinaryReader): RefreshRequest;
}

export namespace RefreshRequest {
  export type AsObject = {
    refreshToken: string,
  }
}

export class SwitchChannelRequest extends jspb.Message {
  getChannelid(): string;
  setChannelid(value: string): SwitchChannelRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SwitchChannelRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SwitchChannelRequest): SwitchChannelRequest.AsObject;
  static serializeBinaryToWriter(message: SwitchChannelRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SwitchChannelRequest;
  static deserializeBinaryFromReader(message: SwitchChannelRequest, reader: jspb.BinaryReader): SwitchChannelRequest;
}

export namespace SwitchChannelRequest {
  export type AsObject = {
    channelid: string,
  }
}

export class SessionResponse extends jspb.Message {
  getAccessToken(): string;
  setAccessToken(value: string): SessionResponse;

  getAccessTokenExpiresAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setAccessTokenExpiresAt(value?: google_protobuf_timestamp_pb.Timestamp): SessionResponse;
  hasAccessTokenExpiresAt(): boolean;
  clearAccessTokenExpiresAt(): SessionResponse;

  getRefreshToken(): string;
  setRefreshToken(value: string): SessionResponse;

  getRefreshTokenExpiresAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setRefreshTokenExpiresAt(value?: google_protobuf_timestamp_pb.Timestamp): SessionResponse;
  hasRefreshTokenExpiresAt(): boolean;
  clearRefreshTokenExpiresAt(): SessionResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SessionResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SessionResponse): SessionResponse.AsObject;
  static serializeBinaryToWriter(message: SessionResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SessionResponse;
  static deserializeBinaryFromReader(message: SessionResponse, reader: jspb.BinaryReader): SessionResponse;
}

export namespace SessionResponse {
  export type AsObject = {
    accessToken: string,
    accessTokenExpiresAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    refreshToken: string,
    refreshTokenExpiresAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class CheckAuthResponse extends jspb.Message {
  getIsAuthenticated(): boolean;
  setIsAuthenticated(value: boolean): CheckAuthResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CheckAuthResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CheckAuthResponse): CheckAuthResponse.AsObject;
  static serializeBinaryToWriter(message: CheckAuthResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CheckAuthResponse;
  static deserializeBinaryFromReader(message: CheckAuthResponse, reader: jspb.BinaryReader): CheckAuthResponse;
}

export namespace CheckAuthResponse {
  export type AsObject = {
    isAuthenticated: boolean,
  }
}

