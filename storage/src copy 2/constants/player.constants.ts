
//constants/player.constanst.ts
export const REBUFFERING_PENALTY = 10;
export const REBUFFER_THRESHOLD = 1;

// Buffer management constants
export const TARGET_BUFFER_LEVEL = 60; // seconds
export const MAX_BUFFER_LEVEL = TARGET_BUFFER_LEVEL * 1.1;
export const BUFFER_EMERGENCY_THRESHOLD = TARGET_BUFFER_LEVEL * 0.2;
export const BUFFER_MIN_SWITCH_THRESHOLD = TARGET_BUFFER_LEVEL * 0.1;
export const BUFFER_RECOVERY_MULTIPLIER = 1.5;

// Switching margins
export const SWITCH_UP_MARGIN = 0.2;
export const SWITCH_DOWN_MARGIN = 0.1;
export const MIN_REL_DIFF_FOR_SWITCH = 0.2;

// Pacing
export const PACING_FACTOR = 0.8;
export const JITTER_FACTOR = 0.2;

// Throughput measurement
export const THROUGHPUT_WINDOW_SIZE = 10;
export const MIN_SEGMENT_SIZE_FOR_MEASUREMENT = 50000; // 50KB
export const MAX_THROUGHPUT_SAMPLE_AGE = 10000; // 10 seconds

// Online/offline
export const ONLINE_COOLDOWN_PERIOD = 5000; // 5 seconds

// Buffer eviction
export const BUFFER_KEEP_BEHIND = 10; // Keep 10 seconds behind playhead
export const BUFFER_EVICTION_INTERVAL = 10000; // 10 seconds
