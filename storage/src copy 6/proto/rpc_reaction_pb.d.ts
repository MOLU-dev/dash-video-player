import * as jspb from 'google-protobuf'



export class LikeCommentRequest extends jspb.Message {
  getCommentId(): number;
  setCommentId(value: number): LikeCommentRequest;

  getIsLike(): boolean;
  setIsLike(value: boolean): LikeCommentRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LikeCommentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: LikeCommentRequest): LikeCommentRequest.AsObject;
  static serializeBinaryToWriter(message: LikeCommentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LikeCommentRequest;
  static deserializeBinaryFromReader(message: LikeCommentRequest, reader: jspb.BinaryReader): LikeCommentRequest;
}

export namespace LikeCommentRequest {
  export type AsObject = {
    commentId: number,
    isLike: boolean,
  }
}

export class LikeCommentResponse extends jspb.Message {
  getLikeCount(): number;
  setLikeCount(value: number): LikeCommentResponse;

  getDislikeCount(): number;
  setDislikeCount(value: number): LikeCommentResponse;

  getLikedByUser(): boolean;
  setLikedByUser(value: boolean): LikeCommentResponse;

  getDislikedByUser(): boolean;
  setDislikedByUser(value: boolean): LikeCommentResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LikeCommentResponse.AsObject;
  static toObject(includeInstance: boolean, msg: LikeCommentResponse): LikeCommentResponse.AsObject;
  static serializeBinaryToWriter(message: LikeCommentResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LikeCommentResponse;
  static deserializeBinaryFromReader(message: LikeCommentResponse, reader: jspb.BinaryReader): LikeCommentResponse;
}

export namespace LikeCommentResponse {
  export type AsObject = {
    likeCount: number,
    dislikeCount: number,
    likedByUser: boolean,
    dislikedByUser: boolean,
  }
}

