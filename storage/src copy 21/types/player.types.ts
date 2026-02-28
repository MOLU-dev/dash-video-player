// src/types/player.types.ts
export type GeneratorType = "ffmpeg" | "gpac" | "unknown";

export type Representation = {
  id: string;
  mimeType: string;
  segmentDur: number;
  bandwidth: number;
  timescale: number;
  startNumber: number;
  totalSegments: number;
  width?: number;
  height?: number;
  initialization: string;
  media: string;
  hasSegmentTimeline: boolean;
  segmentTimeline: Array<{ t: number; d: number; r: number }>;
  generator?: GeneratorType;
  availabilityTimeOffset?: number;
};

export type OperationQueue = {
  video: (() => Promise<void>)[];
  audio: (() => Promise<void>)[];
  videoProcessing: boolean;
  audioProcessing: boolean;
};

export type ThroughputSample = {
  timestamp: number;
  throughput: number;
  bytes: number;
  duration: number;
  mediaType: "video" | "audio";
  segmentSize: number;
};

export type PlayerStats = {
  throughput: number;
  buffer: number;
  quality: string;
};

export type BufferState = "healthy" | "low" | "critical";

export type MediaType = "video" | "audio";

export type QualityInfo = {
  id: string;
  label: string;
};

export type SegmentRequest = {
  call: any;
  controller: AbortController;
  mediaType: MediaType;
  repId: string;
};

export type BOLAState = {
  vp: number;
  gp: number;
  utilities: number[];
};

export type PendingQualitySwitch = {
  targetQuality: number;
  timestamp: number;
};

export type PendingAppend = {
  segmentNumber: number;
  duration: number;
};

export interface EnhancedBOLAState extends BOLAState {
  sortedReps: Representation[];
  minBandwidth: number;
  maxBandwidth: number;
  lastInitTime: number;
}

export type StreamType = "vod" | "live";

// ADD THIS: PrefetchMetadata interface
export interface PrefetchMetadata {
  isComplete: boolean;
  videoRep: Representation;
  audioRep: Representation;
  videoRepId: string;
  audioRepId: string;
  prefetchedSegments?: number[];
  timestamp: number;
}



export interface LiveStreamingState {
  isLive: boolean;
  availabilityStartTime: Date | null;
  suggestedPresentationDelay: number;
  timeShiftBufferDepth: number;
  minimumUpdatePeriod: number;
  lastManifestUpdate: number;
  currentSegmentAvailability: number;
}