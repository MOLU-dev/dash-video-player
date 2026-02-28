// components/DownloadPage/DownloadItem.tsx
import React, { useState } from "react";
import {
  DownloadedVideo,
  DownloadProgress,
} from "../VideoPlayer/hooks/useDownloadManager";

interface DownloadItemProps {
  type: "downloaded" | "pending";
  item: DownloadedVideo | DownloadProgress;
  onPlay?: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
  onPause?: (videoId: string) => void;
  onResume?: (videoId: string) => void;
  onCancel?: (videoId: string) => void;
  onRetry?: (videoId: string) => void;
}

const DownloadItem: React.FC<DownloadItemProps> = ({
  type,
  item,
  onPlay,
  onDelete,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (date: Date): string => {
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getProgressPercentage = (progress: DownloadProgress): number => {
    return Math.round(
      (progress.downloadedSegments / progress.totalSegments) * 100
    );
  };

  const getStatusText = (progress: DownloadProgress): string => {
    switch (progress.status) {
      case "downloading":
        return `Downloading... ${getProgressPercentage(progress)}%`;
      case "paused":
        return "Paused";
      case "error":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  if (type === "downloaded") {
    const video = item as DownloadedVideo;

    return (
      <div className="download-item downloaded">
        <div className="download-item-main">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="download-thumbnail"
          />

          <div className="download-info">
            <h4 className="download-title">{video.title}</h4>
            <div className="download-meta">
              <span className="download-quality">{video.quality}</span>
              <span className="download-size">
                {formatFileSize(video.size)}
              </span>
              <span className="download-date">
                Downloaded {formatDate(video.downloadDate)}
              </span>
            </div>
          </div>

          <div className="download-actions">
            <button
              className="action-btn play-btn"
              onClick={() => onPlay?.(video.videoId)}
              title="Play video"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </button>

            <div className="action-menu">
              <button
                className="action-btn menu-btn"
                onClick={() => setShowMenu(!showMenu)}
                title="More options"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                  />
                </svg>
              </button>

              {showMenu && (
                <div className="action-menu-dropdown">
                  <button
                    className="menu-item delete"
                    onClick={() => {
                      onDelete?.(video.videoId);
                      setShowMenu(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="currentColor"
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                      />
                    </svg>
                    Delete download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    const progress = item as DownloadProgress;
    const progressPercent = getProgressPercentage(progress);

    return (
      <div className={`download-item pending ${progress.status}`}>
        <div className="download-item-main">
          <div className="download-thumbnail placeholder">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path
                fill="currentColor"
                d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
              />
            </svg>
          </div>

          <div className="download-info">
            <h4 className="download-title">Video {progress.videoId}</h4>
            <div className="download-meta">
              <span className="download-quality">{progress.quality}</span>
              <span className="download-status">{getStatusText(progress)}</span>
            </div>

            {progress.status === "downloading" && (
              <div className="download-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {progress.downloadedSegments} / {progress.totalSegments}{" "}
                  segments
                </span>
              </div>
            )}
          </div>

          <div className="download-actions">
            {progress.status === "downloading" && (
              <button
                className="action-btn pause-btn"
                onClick={() => onPause?.(progress.videoId)}
                title="Pause download"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"
                  />
                </svg>
              </button>
            )}

            {progress.status === "paused" && (
              <button
                className="action-btn resume-btn"
                onClick={() => onResume?.(progress.videoId)}
                title="Resume download"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {progress.status === "error" && (
              <button
                className="action-btn retry-btn"
                onClick={() => onRetry?.(progress.videoId)}
                title="Retry download"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  />
                </svg>
              </button>
            )}

            <button
              className="action-btn cancel-btn"
              onClick={() => onCancel?.(progress.videoId)}
              title="Cancel download"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default DownloadItem;
