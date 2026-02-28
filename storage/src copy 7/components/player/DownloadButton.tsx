// components/VideoPlayer/DownloadButton.tsx
import React, { useState } from "react";

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
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);

  if (isDownloaded) {
    return (
      <div className="download-container">
        <button 
          className="download-btn downloaded"
          onClick={() => setShowMenu(!showMenu)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
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

  if (downloadStatus === 'downloading') {
    const progressPercent = (downloadProgress / totalSegments) * 100;
    
    return (
      <div className="download-container">
        <button 
          className="download-btn downloading"
          onClick={onPause}
        >
          <div className="download-progress">
            <div 
              className="download-progress-bar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="download-text">
            {Math.round(progressPercent)}%
          </span>
        </button>
        
        <button className="download-cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
    );
  }

  if (downloadStatus === 'paused') {
    return (
      <div className="download-container">
        <button 
          className="download-btn paused"
          onClick={onResume}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
          </svg>
        </button>
        
        <button className="download-cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
    );
  }

  return (
    <button 
      className="download-btn"
      onClick={onDownload}
      title="Download for offline viewing"
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
      </svg>
    </button>
  );
};

export default DownloadButton;