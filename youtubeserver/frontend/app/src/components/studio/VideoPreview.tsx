"use client";

import { forwardRef } from "react";

interface VideoPreviewProps {
  isStreaming: boolean;
  status: string;
}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(
  ({ isStreaming, status }, ref) => {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {isStreaming && (
          <div className="absolute top-4 left-4 bg-youtube-red text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-md">
          <p className="text-sm font-medium">{status}</p>
        </div>
      </div>
    );
  }
);

VideoPreview.displayName = "VideoPreview";

export default VideoPreview;
