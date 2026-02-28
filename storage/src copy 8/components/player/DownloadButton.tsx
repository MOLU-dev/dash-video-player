// components/VideoPlayer/DownloadButton.tsx
import React, { useState, useEffect } from "react";

interface DownloadButtonProps {
  videoId: string;
  representationId: string;
  totalSegments: number;
  title: string;
  duration: number;
  quality: string;
  thumbnail: string;
  isDownloaded: boolean;
  downloadProgress: number;
  downloadStatus: string;
  onDownload: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onCheckStatus?: (videoId: string) => Promise<{
    totalSegments: number;
    downloadedSegments: number;
    progress: number;
  } | null>;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  videoId,
  representationId,
  totalSegments,
  title,
  duration,
  quality,
  thumbnail,
  isDownloaded,
  downloadProgress,
  downloadStatus,
  onDownload,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onCheckStatus,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [actualProgress, setActualProgress] = useState(downloadProgress);

  // Check actual progress on mount and when status changes
  useEffect(() => {
    const checkProgress = async () => {
      if (
        onCheckStatus &&
        (downloadStatus === "paused" ||
          downloadStatus === "error" ||
          downloadStatus === "incomplete")
      ) {
        const status = await onCheckStatus(videoId);
        if (status) {
          setActualProgress(status.downloadedSegments);
        }
      }
    };

    checkProgress();
  }, [downloadStatus, onCheckStatus, videoId]);

  const progressPercent =
    totalSegments > 0 ? (actualProgress / totalSegments) * 100 : 0;

  // Fixed condition order - check isDownloaded first
  if (isDownloaded) {
    return (
      <div className="download-container">
        <button
          className="download-btn downloaded"
          onClick={() => setShowMenu(!showMenu)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"
            />
          </svg>
        </button>

        {showMenu && (
          <div className="download-menu">
            <button className="download-menu-item" onClick={onDelete}>
              Delete download
            </button>
          </div>
        )}
      </div>
    );
  }

  if (downloadStatus === "downloading") {
    return (
      <div className="download-container">
        <button className="download-btn downloading" onClick={onPause}>
          <div className="download-progress">
            <div
              className="download-progress-bar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="download-text">{Math.round(progressPercent)}%</span>
        </button>

        <button className="download-cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
    );
  }

  if (downloadStatus === "paused" || downloadStatus === "incomplete") {
    return (
      <div className="download-container">
        <button className="download-btn paused" onClick={onResume}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
          <span className="download-text">{Math.round(progressPercent)}%</span>
        </button>

        <button className="download-cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
    );
  }

  // Default state - not downloaded and no active download
  return (
    <button
      className="download-btn"
      onClick={onDownload}
      title="Download for offline viewing"
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          fill="currentColor"
          d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"
        />
      </svg>
    </button>
  );
};

export default DownloadButton;
