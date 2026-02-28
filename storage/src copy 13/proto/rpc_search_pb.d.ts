import * as jspb from 'google-protobuf'

import * as rpc_Home_pb from './rpc_Home_pb'; // proto import: "rpc_Home.proto"


export class VideoResult extends jspb.Message {
  getVideos(): rpc_Home_pb.Video | undefined;
  setVideos(value?: rpc_Home_pb.Video): VideoResult;
  hasVideos(): boolean;
  clearVideos(): VideoResult;

  getTitleHi(): string;
  setTitleHi(value: string): VideoResult;

  getTagsList(): Array<string>;
  setTagsList(value: Array<string>): VideoResult;
  clearTagsList(): VideoResult;
  addTags(value: string, index?: number): VideoResult;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VideoResult.AsObject;
  static toObject(includeInstance: boolean, msg: VideoResult): VideoResult.AsObject;
  static serializeBinaryToWriter(message: VideoResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VideoResult;
  static deserializeBinaryFromReader(message: VideoResult, reader: jspb.BinaryReader): VideoResult;
}

export namespace VideoResult {
  export type AsObject = {
    videos?: rpc_Home_pb.Video.AsObject,
    titleHi: string,
    tagsList: Array<string>,
  }
}

export class AutocompleteRequest extends jspb.Message {
  getPrefix(): string;
  setPrefix(value: string): AutocompleteRequest;

  getLimit(): number;
  setLimit(value: number): AutocompleteRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AutocompleteRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AutocompleteRequest): AutocompleteRequest.AsObject;
  static serializeBinaryToWriter(message: AutocompleteRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AutocompleteRequest;
  static deserializeBinaryFromReader(message: AutocompleteRequest, reader: jspb.BinaryReader): AutocompleteRequest;
}

export namespace AutocompleteRequest {
  export type AsObject = {
    prefix: string,
    limit: number,
  }
}

export class AutocompleteResponse extends jspb.Message {
  getSuggestionsList(): Array<string>;
  setSuggestionsList(value: Array<string>): AutocompleteResponse;
  clearSuggestionsList(): AutocompleteResponse;
  addSuggestions(value: string, index?: number): AutocompleteResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AutocompleteResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AutocompleteResponse): AutocompleteResponse.AsObject;
  static serializeBinaryToWriter(message: AutocompleteResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AutocompleteResponse;
  static deserializeBinaryFromReader(message: AutocompleteResponse, reader: jspb.BinaryReader): AutocompleteResponse;
}

export namespace AutocompleteResponse {
  export type AsObject = {
    suggestionsList: Array<string>,
  }
}

export class SearchRequest extends jspb.Message {
  getQuery(): string;
  setQuery(value: string): SearchRequest;

  getDurationFilter(): DurationFilter;
  setDurationFilter(value: DurationFilter): SearchRequest;

  getUploadDate(): UploadDate;
  setUploadDate(value: UploadDate): SearchRequest;

  getSortBy(): SortBy;
  setSortBy(value: SortBy): SearchRequest;

  getLimit(): number;
  setLimit(value: number): SearchRequest;

  getOffset(): number;
  setOffset(value: number): SearchRequest;

  getSeed(): number;
  setSeed(value: number): SearchRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SearchRequest): SearchRequest.AsObject;
  static serializeBinaryToWriter(message: SearchRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchRequest;
  static deserializeBinaryFromReader(message: SearchRequest, reader: jspb.BinaryReader): SearchRequest;
}

export namespace SearchRequest {
  export type AsObject = {
    query: string,
    durationFilter: DurationFilter,
    uploadDate: UploadDate,
    sortBy: SortBy,
    limit: number,
    offset: number,
    seed: number,
  }
}

export class SearchResponse extends jspb.Message {
  getResultsList(): Array<VideoResult>;
  setResultsList(value: Array<VideoResult>): SearchResponse;
  clearResultsList(): SearchResponse;
  addResults(value?: VideoResult, index?: number): VideoResult;

  getCurrentPage(): number;
  setCurrentPage(value: number): SearchResponse;

  getTotalPages(): number;
  setTotalPages(value: number): SearchResponse;

  getSeed(): number;
  setSeed(value: number): SearchResponse;

  getHasMore(): boolean;
  setHasMore(value: boolean): SearchResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SearchResponse): SearchResponse.AsObject;
  static serializeBinaryToWriter(message: SearchResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchResponse;
  static deserializeBinaryFromReader(message: SearchResponse, reader: jspb.BinaryReader): SearchResponse;
}

export namespace SearchResponse {
  export type AsObject = {
    resultsList: Array<VideoResult.AsObject>,
    currentPage: number,
    totalPages: number,
    seed: number,
    hasMore: boolean,
  }
}

export enum DurationFilter { 
  DURATION_FILTER_UNSPECIFIED = 0,
  DURATION_FILTER_SHORT = 1,
  DURATION_FILTER_MEDIUM = 2,
  DURATION_FILTER_LONG = 3,
}
export enum UploadDate { 
  UPLOAD_DATE_UNSPECIFIED = 0,
  UPLOAD_DATE_LAST_HOUR = 1,
  UPLOAD_DATE_TODAY = 2,
  UPLOAD_DATE_THIS_WEEK = 3,
  UPLOAD_DATE_THIS_MONTH = 4,
  UPLOAD_DATE_THIS_YEAR = 5,
}
export enum SortBy { 
  SORT_BY_UNSPECIFIED = 0,
  SORT_BY_RELEVANCE = 1,
  SORT_BY_NEWEST = 2,
  SORT_BY_VIEW_COUNT = 3,
}
