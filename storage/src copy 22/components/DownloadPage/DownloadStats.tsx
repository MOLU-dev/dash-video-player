// components/DownloadPage/DownloadStats.tsx
import React from "react";

interface DownloadStatsProps {
  totalDownloaded: number;
  totalDownloadedSize: number;
  activeDownloads: number;
  pendingDownloads: number;
  pausedDownloads: number;
  isLowBattery: boolean;
  isOnline: boolean;
}

const DownloadStats: React.FC<DownloadStatsProps> = ({
  totalDownloaded,
  totalDownloadedSize,
  activeDownloads,
  pendingDownloads,
  pausedDownloads,
  isLowBattery,
  isOnline,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="download-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{totalDownloaded}</div>
          <div className="stat-label">Downloaded</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">
            {formatFileSize(totalDownloadedSize)}
          </div>
          <div className="stat-label">Total Size</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{activeDownloads}</div>
          <div className="stat-label">Active</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{pendingDownloads}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="system-status">
        {!isOnline && (
          <div className="status-item warning">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM9 15l4-4 4 4H9z"
              />
            </svg>
            Offline - Downloads paused
          </div>
        )}

        {isLowBattery && (
          <div className="status-item warning">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M7 22v-3h4v-5h-4V6h8v8h2v1h2v4h-2v1H7z"
              />
            </svg>
            Low battery - Downloads paused
          </div>
        )}

        {pausedDownloads > 0 && (
          <div className="status-item info">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"
              />
            </svg>
            {pausedDownloads} downloads paused
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadStats;
