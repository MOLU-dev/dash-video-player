// // types/download.types.ts
// export interface DownloadProgress {
//   videoId: string;
//   totalSegments: number;
//   downloadedSegments: number;
//   status: "downloading" | "paused" | "completed" | "error";
//   quality: string;
// }

// export interface DownloadedVideo {
//   videoId: string;
//   title: string;
//   duration: number;
//   quality: string;
//   downloadDate: Date;
//   size: number;
//   thumbnail: string;
// }


// types/download.types.ts
export interface DownloadProgress {
  videoId: string;
  totalSegments: number;
  downloadedSegments: number;
  status: 'downloading' | 'paused' | 'completed' | 'error' | 'incomplete'; // Add 'incomplete'
  quality: string;
  representationId?: string; // Add for resume
  title?: string; // Add for display
  thumbnail?: string; // Add for display
}

export interface DownloadedVideo {
  videoId: string;
  title: string;
  duration: number;
  quality: string;
  downloadDate: Date;
  size: number;
  thumbnail: string;
  status?: 'completed' | 'incomplete'; // Add status
}