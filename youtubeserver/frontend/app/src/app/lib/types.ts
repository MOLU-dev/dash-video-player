export interface StreamConfig {
  stream_id: string;
  stream_key: string;
  whip_url: string;
  play_url: string;
}

export interface StreamMetadata {
  id: string;
  title: string;
  stream_key: string;
  status: "ready" | "live" | "ended" | "failed" | "reconnecting";
  start_time: string;
  viewer_count: number;
}

export interface StreamHealth {
  stream_id: string;
  status: string;
  connection_quality: "good" | "fair" | "poor" | "failed";
  packet_loss_percent: number;
  current_bitrate: number;
  last_heartbeat: string;
  reconnect_attempts: number;
  uptime_seconds: number;
}

export interface DeviceConfig {
  cameraId: string;
  microphoneId: string;
}

export interface StreamSettings {
  resolution: "1080p" | "720p" | "480p" | "360p";
  framerate: 60 | 30 | 24;
  bitrate: number;
}

export interface Overlay {
  id: string;
  type: "text" | "image";
  content: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
}
