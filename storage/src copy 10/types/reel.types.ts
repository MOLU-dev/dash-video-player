// types/reel.types.ts
export interface Reel {
  id: string;
  videoId: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration: number;

  // Optional engagement stats
  likes?: number;
  comments?: number;
  shares?: number;
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
  isPlaying: () => boolean;
}

// types/reel.types.ts - ADD these new types

export interface VirtualReelSlot {
  slotIndex: number;           // Physical DOM position (always 0, 1, or 2)
  reelIndex: number;               // Logical reel index (0 to infinity)
  reel: Reel;                      // The actual reel data
  isActive: boolean;               // Currently visible
  shouldPreload: boolean;          // Should buffer segments
}

export interface RecycledPlayerState {
  currentReelIndex: number;        // Which reel is active
  slots: VirtualReelSlot[];        // Always 3 slots
  isTransitioning: boolean;
}

export interface ReelPlayerController {
  switchToReel: (reel: Reel) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isReady: () => boolean;
  cleanup: () => void;
}