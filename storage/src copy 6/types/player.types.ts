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
