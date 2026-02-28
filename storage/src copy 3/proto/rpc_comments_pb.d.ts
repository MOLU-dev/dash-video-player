import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class Comment extends jspb.Message {
  getId(): string;
  setId(value: string): Comment;

  getVideoId(): string;
  setVideoId(value: string): Comment;

  getUserId(): string;
  setUserId(value: string): Comment;

  getUsername(): string;
  setUsername(value: string): Comment;

  getContent(): string;
  setContent(value: string): Comment;

  getParentCommentId(): string;
  setParentCommentId(value: string): Comment;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Comment;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Comment;

  getIsOwner(): boolean;
  setIsOwner(value: boolean): Comment;

  getUserAvatar(): Uint8Array | string;
  getUserAvatar_asU8(): Uint8Array;
  getUserAvatar_asB64(): string;
  setUserAvatar(value: Uint8Array | string): Comment;

  getReplyCount(): number;
  setReplyCount(value: number): Comment;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Comment.AsObject;
  static toObject(includeInstance: boolean, msg: Comment): Comment.AsObject;
  static serializeBinaryToWriter(message: Comment, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Comment;
  static deserializeBinaryFromReader(message: Comment, reader: jspb.BinaryReader): Comment;
}

export namespace Comment {
  export type AsObject = {
    id: string,
    videoId: string,
    userId: string,
    username: string,
    content: string,
    parentCommentId: string,
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    isOwner: boolean,
    userAvatar: Uint8Array | string,
    replyCount: number,
  }
}

export class PostCommentRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): PostCommentRequest;

  getContent(): string;
  setContent(value: string): PostCommentRequest;

  getParentCommentId(): string;
  setParentCommentId(value: string): PostCommentRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PostCommentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PostCommentRequest): PostCommentRequest.AsObject;
  static serializeBinaryToWriter(message: PostCommentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PostCommentRequest;
  static deserializeBinaryFromReader(message: PostCommentRequest, reader: jspb.BinaryReader): PostCommentRequest;
}

export namespace PostCommentRequest {
  export type AsObject = {
    videoId: string,
    content: string,
    parentCommentId: string,
  }
}

export class PostCommentResponse extends jspb.Message {
  getComment(): Comment | undefined;
  setComment(value?: Comment): PostCommentResponse;
  hasComment(): boolean;
  clearComment(): PostCommentResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PostCommentResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PostCommentResponse): PostCommentResponse.AsObject;
  static serializeBinaryToWriter(message: PostCommentResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PostCommentResponse;
  static deserializeBinaryFromReader(message: PostCommentResponse, reader: jspb.BinaryReader): PostCommentResponse;
}

export namespace PostCommentResponse {
  export type AsObject = {
    comment?: Comment.AsObject,
  }
}

export class ListCommentsRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): ListCommentsRequest;

  getLimit(): number;
  setLimit(value: number): ListCommentsRequest;

  getOffset(): number;
  setOffset(value: number): ListCommentsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListCommentsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListCommentsRequest): ListCommentsRequest.AsObject;
  static serializeBinaryToWriter(message: ListCommentsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListCommentsRequest;
  static deserializeBinaryFromReader(message: ListCommentsRequest, reader: jspb.BinaryReader): ListCommentsRequest;
}

export namespace ListCommentsRequest {
  export type AsObject = {
    videoId: string,
    limit: number,
    offset: number,
  }
}

export class ListCommentsResponse extends jspb.Message {
  getCommentsList(): Array<Comment>;
  setCommentsList(value: Array<Comment>): ListCommentsResponse;
  clearCommentsList(): ListCommentsResponse;
  addComments(value?: Comment, index?: number): Comment;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListCommentsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListCommentsResponse): ListCommentsResponse.AsObject;
  static serializeBinaryToWriter(message: ListCommentsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListCommentsResponse;
  static deserializeBinaryFromReader(message: ListCommentsResponse, reader: jspb.BinaryReader): ListCommentsResponse;
}

export namespace ListCommentsResponse {
  export type AsObject = {
    commentsList: Array<Comment.AsObject>,
  }
}

export class GetCommentCountRequest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): GetCommentCountRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetCommentCountRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetCommentCountRequest): GetCommentCountRequest.AsObject;
  static serializeBinaryToWriter(message: GetCommentCountRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetCommentCountRequest;
  static deserializeBinaryFromReader(message: GetCommentCountRequest, reader: jspb.BinaryReader): GetCommentCountRequest;
}

export namespace GetCommentCountRequest {
  export type AsObject = {
    videoId: string,
  }
}

export class GetCommentCountResponse extends jspb.Message {
  getCount(): number;
  setCount(value: number): GetCommentCountResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetCommentCountResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetCommentCountResponse): GetCommentCountResponse.AsObject;
  static serializeBinaryToWriter(message: GetCommentCountResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetCommentCountResponse;
  static deserializeBinaryFromReader(message: GetCommentCountResponse, reader: jspb.BinaryReader): GetCommentCountResponse;
}

export namespace GetCommentCountResponse {
  export type AsObject = {
    count: number,
  }
}

export class CreateReplyResponse extends jspb.Message {
  getComment(): Comment | undefined;
  setComment(value?: Comment): CreateReplyResponse;
  hasComment(): boolean;
  clearComment(): CreateReplyResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateReplyResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateReplyResponse): CreateReplyResponse.AsObject;
  static serializeBinaryToWriter(message: CreateReplyResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateReplyResponse;
  static deserializeBinaryFromReader(message: CreateReplyResponse, reader: jspb.BinaryReader): CreateReplyResponse;
}

export namespace CreateReplyResponse {
  export type AsObject = {
    comment?: Comment.AsObject,
  }
}

export class EditCommentRequest extends jspb.Message {
  getCommentId(): string;
  setCommentId(value: string): EditCommentRequest;

  getContent(): string;
  setContent(value: string): EditCommentRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditCommentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditCommentRequest): EditCommentRequest.AsObject;
  static serializeBinaryToWriter(message: EditCommentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditCommentRequest;
  static deserializeBinaryFromReader(message: EditCommentRequest, reader: jspb.BinaryReader): EditCommentRequest;
}

export namespace EditCommentRequest {
  export type AsObject = {
    commentId: string,
    content: string,
  }
}

export class GetRepliesRequest extends jspb.Message {
  getParentCommentId(): string;
  setParentCommentId(value: string): GetRepliesRequest;

  getVideoId(): string;
  setVideoId(value: string): GetRepliesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetRepliesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetRepliesRequest): GetRepliesRequest.AsObject;
  static serializeBinaryToWriter(message: GetRepliesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetRepliesRequest;
  static deserializeBinaryFromReader(message: GetRepliesRequest, reader: jspb.BinaryReader): GetRepliesRequest;
}

export namespace GetRepliesRequest {
  export type AsObject = {
    parentCommentId: string,
    videoId: string,
  }
}

export class GetRepliesResponse extends jspb.Message {
  getRepliesList(): Array<Comment>;
  setRepliesList(value: Array<Comment>): GetRepliesResponse;
  clearRepliesList(): GetRepliesResponse;
  addReplies(value?: Comment, index?: number): Comment;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetRepliesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetRepliesResponse): GetRepliesResponse.AsObject;
  static serializeBinaryToWriter(message: GetRepliesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetRepliesResponse;
  static deserializeBinaryFromReader(message: GetRepliesResponse, reader: jspb.BinaryReader): GetRepliesResponse;
}

export namespace GetRepliesResponse {
  export type AsObject = {
    repliesList: Array<Comment.AsObject>,
  }
}

export class DeleteCommentRequest extends jspb.Message {
  getCommentId(): string;
  setCommentId(value: string): DeleteCommentRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteCommentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteCommentRequest): DeleteCommentRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteCommentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteCommentRequest;
  static deserializeBinaryFromReader(message: DeleteCommentRequest, reader: jspb.BinaryReader): DeleteCommentRequest;
}

export namespace DeleteCommentRequest {
  export type AsObject = {
    commentId: string,
  }
}

