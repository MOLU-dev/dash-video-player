// types/reel.types.ts
export interface Reel {
  id: string;
  videoId: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration: number;
}

export interface ReelState {
  reel: Reel;
  playerState: "idle" | "loading" | "ready" | "playing" | "paused" | "error";
  bufferProgress: number;
  hasPlayed: boolean;
}

export interface ReelWindow {
  start: number;
  end: number;
  current: number;
}

export type ReelCacheMap = Map<string, ReelState>;

export interface ReelPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  cleanup: () => void;
  isReady: () => boolean;
}
