import * as jspb from 'google-protobuf'



export class UploadFile extends jspb.Message {
  getFileName(): string;
  setFileName(value: string): UploadFile;

  getMimeType(): string;
  setMimeType(value: string): UploadFile;

  getFileSize(): number;
  setFileSize(value: number): UploadFile;

  getFileChunk(): Uint8Array | string;
  getFileChunk_asU8(): Uint8Array;
  getFileChunk_asB64(): string;
  setFileChunk(value: Uint8Array | string): UploadFile;

  getChunkIndex(): number;
  setChunkIndex(value: number): UploadFile;

  getTotalChunks(): number;
  setTotalChunks(value: number): UploadFile;

  getFileId(): string;
  setFileId(value: string): UploadFile;

  getFileType(): FileType;
  setFileType(value: FileType): UploadFile;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UploadFile.AsObject;
  static toObject(includeInstance: boolean, msg: UploadFile): UploadFile.AsObject;
  static serializeBinaryToWriter(message: UploadFile, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UploadFile;
  static deserializeBinaryFromReader(message: UploadFile, reader: jspb.BinaryReader): UploadFile;
}

export namespace UploadFile {
  export type AsObject = {
    fileName: string,
    mimeType: string,
    fileSize: number,
    fileChunk: Uint8Array | string,
    chunkIndex: number,
    totalChunks: number,
    fileId: string,
    fileType: FileType,
  }
}

export class UploadFileResponse extends jspb.Message {
  getFileId(): string;
  setFileId(value: string): UploadFileResponse;

  getStatus(): string;
  setStatus(value: string): UploadFileResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UploadFileResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UploadFileResponse): UploadFileResponse.AsObject;
  static serializeBinaryToWriter(message: UploadFileResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UploadFileResponse;
  static deserializeBinaryFromReader(message: UploadFileResponse, reader: jspb.BinaryReader): UploadFileResponse;
}

export namespace UploadFileResponse {
  export type AsObject = {
    fileId: string,
    status: string,
  }
}

export enum FileType { 
  FILE_TYPE_UNSPECIFIED = 0,
  VIDEO = 1,
  CHANNEL_PROFILE = 2,
  CHANNEL_BANNER = 3,
  VIDEO_THUMBNAIL = 4,
}
