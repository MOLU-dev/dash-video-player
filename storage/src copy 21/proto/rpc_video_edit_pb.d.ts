import * as jspb from 'google-protobuf'



export class EditEffect extends jspb.Message {
  getType(): EffectType;
  setType(value: EffectType): EditEffect;

  getTimestamp(): number;
  setTimestamp(value: number): EditEffect;

  getStartTime(): number;
  setStartTime(value: number): EditEffect;

  getEndTime(): number;
  setEndTime(value: number): EditEffect;

  getVolume(): number;
  setVolume(value: number): EditEffect;

  getWatermarkUrl(): string;
  setWatermarkUrl(value: string): EditEffect;

  getWatermarkX(): number;
  setWatermarkX(value: number): EditEffect;

  getWatermarkY(): number;
  setWatermarkY(value: number): EditEffect;

  getWatermarkOpacity(): number;
  setWatermarkOpacity(value: number): EditEffect;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditEffect.AsObject;
  static toObject(includeInstance: boolean, msg: EditEffect): EditEffect.AsObject;
  static serializeBinaryToWriter(message: EditEffect, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditEffect;
  static deserializeBinaryFromReader(message: EditEffect, reader: jspb.BinaryReader): EditEffect;
}

export namespace EditEffect {
  export type AsObject = {
    type: EffectType,
    timestamp: number,
    startTime: number,
    endTime: number,
    volume: number,
    watermarkUrl: string,
    watermarkX: number,
    watermarkY: number,
    watermarkOpacity: number,
  }
}

export class TimelineClip extends jspb.Message {
  getAssetId(): string;
  setAssetId(value: string): TimelineClip;

  getStartTime(): number;
  setStartTime(value: number): TimelineClip;

  getDuration(): number;
  setDuration(value: number): TimelineClip;

  getTrimStart(): number;
  setTrimStart(value: number): TimelineClip;

  getTrimEnd(): number;
  setTrimEnd(value: number): TimelineClip;

  getVolume(): number;
  setVolume(value: number): TimelineClip;

  getMuted(): boolean;
  setMuted(value: boolean): TimelineClip;

  getEffectsList(): Array<EditEffect>;
  setEffectsList(value: Array<EditEffect>): TimelineClip;
  clearEffectsList(): TimelineClip;
  addEffects(value?: EditEffect, index?: number): EditEffect;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TimelineClip.AsObject;
  static toObject(includeInstance: boolean, msg: TimelineClip): TimelineClip.AsObject;
  static serializeBinaryToWriter(message: TimelineClip, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TimelineClip;
  static deserializeBinaryFromReader(message: TimelineClip, reader: jspb.BinaryReader): TimelineClip;
}

export namespace TimelineClip {
  export type AsObject = {
    assetId: string,
    startTime: number,
    duration: number,
    trimStart: number,
    trimEnd: number,
    volume: number,
    muted: boolean,
    effectsList: Array<EditEffect.AsObject>,
  }
}

export class Track extends jspb.Message {
  getId(): string;
  setId(value: string): Track;

  getType(): TrackType;
  setType(value: TrackType): Track;

  getName(): string;
  setName(value: string): Track;

  getClipsList(): Array<TimelineClip>;
  setClipsList(value: Array<TimelineClip>): Track;
  clearClipsList(): Track;
  addClips(value?: TimelineClip, index?: number): TimelineClip;

  getMuted(): boolean;
  setMuted(value: boolean): Track;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Track.AsObject;
  static toObject(includeInstance: boolean, msg: Track): Track.AsObject;
  static serializeBinaryToWriter(message: Track, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Track;
  static deserializeBinaryFromReader(message: Track, reader: jspb.BinaryReader): Track;
}

export namespace Track {
  export type AsObject = {
    id: string,
    type: TrackType,
    name: string,
    clipsList: Array<TimelineClip.AsObject>,
    muted: boolean,
  }
}

export class EditManifest extends jspb.Message {
  getVideoId(): string;
  setVideoId(value: string): EditManifest;

  getTracksList(): Array<Track>;
  setTracksList(value: Array<Track>): EditManifest;
  clearTracksList(): EditManifest;
  addTracks(value?: Track, index?: number): Track;

  getMainAudioEditsList(): Array<EditEffect>;
  setMainAudioEditsList(value: Array<EditEffect>): EditManifest;
  clearMainAudioEditsList(): EditManifest;
  addMainAudioEdits(value?: EditEffect, index?: number): EditEffect;

  getOutputFormat(): string;
  setOutputFormat(value: string): EditManifest;

  getOutputWidth(): number;
  setOutputWidth(value: number): EditManifest;

  getOutputHeight(): number;
  setOutputHeight(value: number): EditManifest;

  getOutputBitrate(): number;
  setOutputBitrate(value: number): EditManifest;

  getOutputFps(): number;
  setOutputFps(value: number): EditManifest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditManifest.AsObject;
  static toObject(includeInstance: boolean, msg: EditManifest): EditManifest.AsObject;
  static serializeBinaryToWriter(message: EditManifest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditManifest;
  static deserializeBinaryFromReader(message: EditManifest, reader: jspb.BinaryReader): EditManifest;
}

export namespace EditManifest {
  export type AsObject = {
    videoId: string,
    tracksList: Array<Track.AsObject>,
    mainAudioEditsList: Array<EditEffect.AsObject>,
    outputFormat: string,
    outputWidth: number,
    outputHeight: number,
    outputBitrate: number,
    outputFps: number,
  }
}

export class SubmitEditRequest extends jspb.Message {
  getManifest(): EditManifest | undefined;
  setManifest(value?: EditManifest): SubmitEditRequest;
  hasManifest(): boolean;
  clearManifest(): SubmitEditRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitEditRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitEditRequest): SubmitEditRequest.AsObject;
  static serializeBinaryToWriter(message: SubmitEditRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitEditRequest;
  static deserializeBinaryFromReader(message: SubmitEditRequest, reader: jspb.BinaryReader): SubmitEditRequest;
}

export namespace SubmitEditRequest {
  export type AsObject = {
    manifest?: EditManifest.AsObject,
  }
}

export class SubmitEditResponse extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): SubmitEditResponse;

  getStatus(): string;
  setStatus(value: string): SubmitEditResponse;

  getMessage(): string;
  setMessage(value: string): SubmitEditResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitEditResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitEditResponse): SubmitEditResponse.AsObject;
  static serializeBinaryToWriter(message: SubmitEditResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitEditResponse;
  static deserializeBinaryFromReader(message: SubmitEditResponse, reader: jspb.BinaryReader): SubmitEditResponse;
}

export namespace SubmitEditResponse {
  export type AsObject = {
    jobId: string,
    status: string,
    message: string,
  }
}

export class GetEditStatusRequest extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): GetEditStatusRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetEditStatusRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetEditStatusRequest): GetEditStatusRequest.AsObject;
  static serializeBinaryToWriter(message: GetEditStatusRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetEditStatusRequest;
  static deserializeBinaryFromReader(message: GetEditStatusRequest, reader: jspb.BinaryReader): GetEditStatusRequest;
}

export namespace GetEditStatusRequest {
  export type AsObject = {
    jobId: string,
  }
}

export class GetEditStatusResponse extends jspb.Message {
  getJobId(): string;
  setJobId(value: string): GetEditStatusResponse;

  getStatus(): string;
  setStatus(value: string): GetEditStatusResponse;

  getProgress(): number;
  setProgress(value: number): GetEditStatusResponse;

  getOutputUrl(): string;
  setOutputUrl(value: string): GetEditStatusResponse;

  getErrorMessage(): string;
  setErrorMessage(value: string): GetEditStatusResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetEditStatusResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetEditStatusResponse): GetEditStatusResponse.AsObject;
  static serializeBinaryToWriter(message: GetEditStatusResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetEditStatusResponse;
  static deserializeBinaryFromReader(message: GetEditStatusResponse, reader: jspb.BinaryReader): GetEditStatusResponse;
}

export namespace GetEditStatusResponse {
  export type AsObject = {
    jobId: string,
    status: string,
    progress: number,
    outputUrl: string,
    errorMessage: string,
  }
}

export enum EffectType { 
  EFFECT_TYPE_UNSPECIFIED = 0,
  CUT = 1,
  TRIM = 2,
  WATERMARK = 3,
  MUTE = 4,
  VOLUME = 5,
  FADE_IN = 6,
  FADE_OUT = 7,
}
export enum TrackType { 
  TRACK_TYPE_UNSPECIFIED = 0,
  VIDEO_TRACK = 1,
  AUDIO_TRACK = 2,
}
