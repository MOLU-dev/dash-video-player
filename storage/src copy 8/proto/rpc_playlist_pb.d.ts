import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"
import * as rpc_editvideo_pb from './rpc_editvideo_pb'; // proto import: "rpc_editvideo.proto"


export class Playlist extends jspb.Message {
  getId(): string;
  setId(value: string): Playlist;

  getOwnerId(): string;
  setOwnerId(value: string): Playlist;

  getTitle(): string;
  setTitle(value: string): Playlist;

  getDescription(): string;
  setDescription(value: string): Playlist;

  getVisibility(): rpc_editvideo_pb.Visibility;
  setVisibility(value: rpc_editvideo_pb.Visibility): Playlist;

  getThumbnailUrl(): string;
  setThumbnailUrl(value: string): Playlist;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Playlist;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Playlist;

  getUpdatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Playlist;
  hasUpdatedAt(): boolean;
  clearUpdatedAt(): Playlist;

  getVideoCount(): number;
  setVideoCount(value: number): Playlist;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Playlist.AsObject;
  static toObject(includeInstance: boolean, msg: Playlist): Playlist.AsObject;
  static serializeBinaryToWriter(message: Playlist, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Playlist;
  static deserializeBinaryFromReader(message: Playlist, reader: jspb.BinaryReader): Playlist;
}

export namespace Playlist {
  export type AsObject = {
    id: string,
    ownerId: string,
    title: string,
    description: string,
    visibility: rpc_editvideo_pb.Visibility,
    thumbnailUrl: string,
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updatedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    videoCount: number,
  }
}

export class PlaylistItem extends jspb.Message {
  getId(): string;
  setId(value: string): PlaylistItem;

  getPlaylistId(): string;
  setPlaylistId(value: string): PlaylistItem;

  getVideoId(): string;
  setVideoId(value: string): PlaylistItem;

  getPosition(): number;
  setPosition(value: number): PlaylistItem;

  getAddedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setAddedAt(value?: google_protobuf_timestamp_pb.Timestamp): PlaylistItem;
  hasAddedAt(): boolean;
  clearAddedAt(): PlaylistItem;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PlaylistItem.AsObject;
  static toObject(includeInstance: boolean, msg: PlaylistItem): PlaylistItem.AsObject;
  static serializeBinaryToWriter(message: PlaylistItem, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PlaylistItem;
  static deserializeBinaryFromReader(message: PlaylistItem, reader: jspb.BinaryReader): PlaylistItem;
}

export namespace PlaylistItem {
  export type AsObject = {
    id: string,
    playlistId: string,
    videoId: string,
    position: number,
    addedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class CreatePlaylistRequest extends jspb.Message {
  getTitle(): string;
  setTitle(value: string): CreatePlaylistRequest;

  getDescription(): string;
  setDescription(value: string): CreatePlaylistRequest;

  getVisibility(): rpc_editvideo_pb.Visibility;
  setVisibility(value: rpc_editvideo_pb.Visibility): CreatePlaylistRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreatePlaylistRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreatePlaylistRequest): CreatePlaylistRequest.AsObject;
  static serializeBinaryToWriter(message: CreatePlaylistRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreatePlaylistRequest;
  static deserializeBinaryFromReader(message: CreatePlaylistRequest, reader: jspb.BinaryReader): CreatePlaylistRequest;
}

export namespace CreatePlaylistRequest {
  export type AsObject = {
    title: string,
    description: string,
    visibility: rpc_editvideo_pb.Visibility,
  }
}

export class GetPlaylistRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): GetPlaylistRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPlaylistRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPlaylistRequest): GetPlaylistRequest.AsObject;
  static serializeBinaryToWriter(message: GetPlaylistRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPlaylistRequest;
  static deserializeBinaryFromReader(message: GetPlaylistRequest, reader: jspb.BinaryReader): GetPlaylistRequest;
}

export namespace GetPlaylistRequest {
  export type AsObject = {
    playlistId: string,
  }
}

export class ListPlaylistsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): ListPlaylistsRequest;

  getPageToken(): string;
  setPageToken(value: string): ListPlaylistsRequest;

  getVisibility(): ListPlaylistsRequest.VisibilityFilter;
  setVisibility(value: ListPlaylistsRequest.VisibilityFilter): ListPlaylistsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPlaylistsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListPlaylistsRequest): ListPlaylistsRequest.AsObject;
  static serializeBinaryToWriter(message: ListPlaylistsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPlaylistsRequest;
  static deserializeBinaryFromReader(message: ListPlaylistsRequest, reader: jspb.BinaryReader): ListPlaylistsRequest;
}

export namespace ListPlaylistsRequest {
  export type AsObject = {
    pageSize: number,
    pageToken: string,
    visibility: ListPlaylistsRequest.VisibilityFilter,
  }

  export enum VisibilityFilter { 
    VISIBILITY_FILTER_UNSPECIFIED = 0,
    ALL = 1,
    PUBLIC_ONLY = 2,
    UNLISTED_ONLY = 3,
    PRIVATE_ONLY = 4,
  }
}

export class ListPlaylistsResponse extends jspb.Message {
  getPlaylistsList(): Array<Playlist>;
  setPlaylistsList(value: Array<Playlist>): ListPlaylistsResponse;
  clearPlaylistsList(): ListPlaylistsResponse;
  addPlaylists(value?: Playlist, index?: number): Playlist;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListPlaylistsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPlaylistsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListPlaylistsResponse): ListPlaylistsResponse.AsObject;
  static serializeBinaryToWriter(message: ListPlaylistsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPlaylistsResponse;
  static deserializeBinaryFromReader(message: ListPlaylistsResponse, reader: jspb.BinaryReader): ListPlaylistsResponse;
}

export namespace ListPlaylistsResponse {
  export type AsObject = {
    playlistsList: Array<Playlist.AsObject>,
    nextPageToken: string,
  }
}

export class UpdatePlaylistRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): UpdatePlaylistRequest;

  getTitle(): string;
  setTitle(value: string): UpdatePlaylistRequest;
  hasTitle(): boolean;
  clearTitle(): UpdatePlaylistRequest;

  getDescription(): string;
  setDescription(value: string): UpdatePlaylistRequest;
  hasDescription(): boolean;
  clearDescription(): UpdatePlaylistRequest;

  getVisibility(): rpc_editvideo_pb.Visibility;
  setVisibility(value: rpc_editvideo_pb.Visibility): UpdatePlaylistRequest;
  hasVisibility(): boolean;
  clearVisibility(): UpdatePlaylistRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdatePlaylistRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdatePlaylistRequest): UpdatePlaylistRequest.AsObject;
  static serializeBinaryToWriter(message: UpdatePlaylistRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdatePlaylistRequest;
  static deserializeBinaryFromReader(message: UpdatePlaylistRequest, reader: jspb.BinaryReader): UpdatePlaylistRequest;
}

export namespace UpdatePlaylistRequest {
  export type AsObject = {
    playlistId: string,
    title?: string,
    description?: string,
    visibility?: rpc_editvideo_pb.Visibility,
  }

  export enum TitleCase { 
    _TITLE_NOT_SET = 0,
    TITLE = 2,
  }

  export enum DescriptionCase { 
    _DESCRIPTION_NOT_SET = 0,
    DESCRIPTION = 3,
  }

  export enum VisibilityCase { 
    _VISIBILITY_NOT_SET = 0,
    VISIBILITY = 4,
  }
}

export class DeletePlaylistRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): DeletePlaylistRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeletePlaylistRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeletePlaylistRequest): DeletePlaylistRequest.AsObject;
  static serializeBinaryToWriter(message: DeletePlaylistRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeletePlaylistRequest;
  static deserializeBinaryFromReader(message: DeletePlaylistRequest, reader: jspb.BinaryReader): DeletePlaylistRequest;
}

export namespace DeletePlaylistRequest {
  export type AsObject = {
    playlistId: string,
  }
}

export class AddItemRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): AddItemRequest;

  getVideoId(): string;
  setVideoId(value: string): AddItemRequest;

  getPosition(): number;
  setPosition(value: number): AddItemRequest;
  hasPosition(): boolean;
  clearPosition(): AddItemRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddItemRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AddItemRequest): AddItemRequest.AsObject;
  static serializeBinaryToWriter(message: AddItemRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddItemRequest;
  static deserializeBinaryFromReader(message: AddItemRequest, reader: jspb.BinaryReader): AddItemRequest;
}

export namespace AddItemRequest {
  export type AsObject = {
    playlistId: string,
    videoId: string,
    position?: number,
  }

  export enum PositionCase { 
    _POSITION_NOT_SET = 0,
    POSITION = 3,
  }
}

export class RemoveItemRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): RemoveItemRequest;

  getItemId(): string;
  setItemId(value: string): RemoveItemRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RemoveItemRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RemoveItemRequest): RemoveItemRequest.AsObject;
  static serializeBinaryToWriter(message: RemoveItemRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RemoveItemRequest;
  static deserializeBinaryFromReader(message: RemoveItemRequest, reader: jspb.BinaryReader): RemoveItemRequest;
}

export namespace RemoveItemRequest {
  export type AsObject = {
    playlistId: string,
    itemId: string,
  }
}

export class MoveItemRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): MoveItemRequest;

  getItemId(): string;
  setItemId(value: string): MoveItemRequest;

  getNewPosition(): number;
  setNewPosition(value: number): MoveItemRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MoveItemRequest.AsObject;
  static toObject(includeInstance: boolean, msg: MoveItemRequest): MoveItemRequest.AsObject;
  static serializeBinaryToWriter(message: MoveItemRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MoveItemRequest;
  static deserializeBinaryFromReader(message: MoveItemRequest, reader: jspb.BinaryReader): MoveItemRequest;
}

export namespace MoveItemRequest {
  export type AsObject = {
    playlistId: string,
    itemId: string,
    newPosition: number,
  }
}

export class ListItemsRequest extends jspb.Message {
  getPlaylistId(): string;
  setPlaylistId(value: string): ListItemsRequest;

  getPageSize(): number;
  setPageSize(value: number): ListItemsRequest;

  getPageToken(): string;
  setPageToken(value: string): ListItemsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListItemsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListItemsRequest): ListItemsRequest.AsObject;
  static serializeBinaryToWriter(message: ListItemsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListItemsRequest;
  static deserializeBinaryFromReader(message: ListItemsRequest, reader: jspb.BinaryReader): ListItemsRequest;
}

export namespace ListItemsRequest {
  export type AsObject = {
    playlistId: string,
    pageSize: number,
    pageToken: string,
  }
}

export class ListItemsResponse extends jspb.Message {
  getItemsList(): Array<PlaylistItem>;
  setItemsList(value: Array<PlaylistItem>): ListItemsResponse;
  clearItemsList(): ListItemsResponse;
  addItems(value?: PlaylistItem, index?: number): PlaylistItem;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListItemsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListItemsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListItemsResponse): ListItemsResponse.AsObject;
  static serializeBinaryToWriter(message: ListItemsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListItemsResponse;
  static deserializeBinaryFromReader(message: ListItemsResponse, reader: jspb.BinaryReader): ListItemsResponse;
}

export namespace ListItemsResponse {
  export type AsObject = {
    itemsList: Array<PlaylistItem.AsObject>,
    nextPageToken: string,
  }
}

