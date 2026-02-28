export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const RESOLUTIONS = {
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "360p": { width: 640, height: 360 },
} as const;

export const FRAME_RATES = [60, 30, 24] as const;

export const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }] as const;

export const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
export const STREAM_UPDATE_INTERVAL = 10000; // 10 seconds
