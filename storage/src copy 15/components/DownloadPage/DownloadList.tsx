// components/DownloadPage/DownloadList.tsx
import React from "react";
import DownloadItem from "./DownloadItem";
import {
  DownloadedVideo,
  DownloadProgress,
} from "../VideoPlayer/hooks/useDownloadManager";

interface DownloadListProps {
  type: "downloaded" | "pending";
  items: (DownloadedVideo | DownloadProgress)[];
  onPlay?: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
  onPause?: (videoId: string) => void;
  onResume?: (videoId: string) => void;
  onCancel?: (videoId: string) => void;
  onRetry?: (videoId: string) => void;
  emptyMessage: string;
}

const DownloadList: React.FC<DownloadListProps> = ({
  type,
  items,
  onPlay,
  onDelete,
  onPause,
  onResume,
  onCancel,
  onRetry,
  emptyMessage,
}) => {
  if (items.length === 0) {
    return (
      <div className="download-list empty">
        <div className="empty-state">
          <svg
            className="empty-icon"
            viewBox="0 0 24 24"
            width="64"
            height="64"
          >
            <path
              fill="currentColor"
              d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
            />
          </svg>
          <h3>No downloads</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="download-list">
      {items.map((item) => (
        <DownloadItem
          key={
            type === "downloaded"
              ? (item as DownloadedVideo).videoId
              : (item as DownloadProgress).videoId
          }
          type={type}
          item={item}
          onPlay={onPlay}
          onDelete={onDelete}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
};

export default DownloadList;
