// components/VideoPlayer/DownloadsManager.tsx
"use client";
import React, { useState } from "react";
import { DownloadedVideo } from "../../../../src/hooks/useDownloadManager";

interface DownloadsManagerProps {
  downloadedVideos: DownloadedVideo[];
  onPlay: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onClose: () => void;
}

const DownloadsManager: React.FC<DownloadsManagerProps> = ({
  downloadedVideos,
  onPlay,
  onDelete,
  onClose,
}) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="downloads-manager-overlay">
      <div className="downloads-manager-container">
        <div className="downloads-manager-header">
          <h2>Downloads</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="downloads-list">
          {downloadedVideos.length === 0 ? (
            <div className="no-downloads">
              <p>No downloads yet</p>
              <p>Videos you download will appear here</p>
            </div>
          ) : (
            downloadedVideos.map((video) => (
              <div
                key={video.videoId}
                className={`download-item ${
                  selectedVideo === video.videoId ? "selected" : ""
                }`}
                onClick={() => setSelectedVideo(video.videoId)}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="download-thumbnail"
                />

                <div className="download-details">
                  <h4>{video.title}</h4>
                  <p>
                    {formatFileSize(video.size)} • {video.quality} • Downloaded{" "}
                    {video.downloadDate.toLocaleDateString()}
                  </p>
                </div>

                <div className="download-actions">
                  <button
                    className="play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(video.videoId);
                    }}
                  >
                    Play
                  </button>

                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(video.videoId);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadsManager;
