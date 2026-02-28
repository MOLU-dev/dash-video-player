"use client";
import React, { useState } from "react";
import type {
  DownloadedVideo,
  DownloadProgress,
} from "../../../../src/types/download.types";

// interface DownloadsManagerProps {
//   downloadedVideos: DownloadedVideo[];
//   incompleteDownloads?: DownloadProgress[]; // Add this
//   onResume?: (videoId: string) => void;
//   onPlay: (videoId: string) => void;
//   onDelete: (videoId: string) => void;
//   onClose: () => void;
//   onClearAll?: () => void;
//   isLoading?: boolean;
// }

// export const DownloadsManager: React.FC<DownloadsManagerProps> = ({
//   downloadedVideos,
//   onPlay,
//   incompleteDownloads = [],
//   onDelete,
//   onClose,
//   onClearAll,
//   isLoading = false,
// }) => {
//   const [showClearConfirm, setShowClearConfirm] = useState(false);
//   const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

//   const formatFileSize = (bytes: number): string => {
//     if (bytes < 1024) return `${bytes} B`;
//     if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//     return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
//   };

//   return (
//     <div className="downloads-manager-overlay">
//       <div className="downloads-manager-container">
//         {/* Header */}
//         <div className="downloads-manager-header">
//           <h2>Downloads ({downloadedVideos.length})</h2>
//           <div className="header-actions">
//             {downloadedVideos.length > 0 && onClearAll && (
//               <>
//                 <button
//                   className="clear-all-btn"
//                   onClick={() => setShowClearConfirm(true)}
//                 >
//                   Clear All
//                 </button>
//                 {showClearConfirm && (
//                   <div className="clear-confirm-dialog">
//                     <p>Clear all downloads?</p>
//                     <div className="confirm-actions">
//                       <button
//                         className="confirm-btn"
//                         onClick={() => {
//                           onClearAll();
//                           setShowClearConfirm(false);
//                         }}
//                       >
//                         Yes
//                       </button>
//                       <button
//                         className="cancel-btn"
//                         onClick={() => setShowClearConfirm(false)}
//                       >
//                         No
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}
//             <button className="close-btn" onClick={onClose}>
//               ×
//             </button>
//           </div>
//         </div>

//         {/* Downloads list */}
//         <div className="downloads-list">
//           {isLoading ? (
//             <div className="loading-downloads">
//               <p>Loading downloads...</p>
//             </div>
//           ) : downloadedVideos.length === 0 ? (
//             <div className="no-downloads">
//               <p>No downloads yet</p>
//               <p>Videos you download will appear here</p>
//             </div>
//           ) : (
//             downloadedVideos.map((video) => (
//               <div
//                 key={video.videoId}
//                 className={`download-item ${
//                   selectedVideo === video.videoId ? "selected" : ""
//                 }`}
//                 onClick={() => setSelectedVideo(video.videoId)}
//               >
//                 <img
//                   src={video.thumbnail}
//                   alt={video.title}
//                   className="download-thumbnail"
//                   onError={(e) => {
//                     (e.target as HTMLImageElement).src =
//                       "/images/placeholder-thumbnail.jpg";
//                   }}
//                 />
//                 <div className="download-details">
//                   <h4>{video.title}</h4>
//                   <p>
//                     {formatFileSize(video.size)} • {video.quality} • Downloaded{" "}
//                     {new Date(video.downloadDate).toLocaleDateString()}
//                   </p>
//                 </div>

//                 <div className="download-actions">
//                   <button
//                     className="play-btn"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       onPlay(video.videoId);
//                     }}
//                   >
//                     Play
//                   </button>
//                   <button
//                     className="delete-btn"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       onDelete(video.videoId);
//                     }}
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* Styles */}
//       <style jsx>{`
//         .downloads-manager-overlay {
//           position: fixed;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background: rgba(0, 0, 0, 0.9);
//           z-index: 1000;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }

//         .downloads-manager-container {
//           background: #1e1e1e;
//           border-radius: 12px;
//           overflow: hidden;
//           width: 90%;
//           max-width: 800px;
//           max-height: 80%;
//           display: flex;
//           flex-direction: column;
//         }

//         .downloads-manager-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 16px;
//           border-bottom: 1px solid rgba(255, 255, 255, 0.1);
//         }

//         .downloads-manager-header h2 {
//           margin: 0;
//           color: white;
//         }

//         .close-btn {
//           background: none;
//           border: none;
//           color: white;
//           font-size: 24px;
//           cursor: pointer;
//           width: 32px;
//           height: 32px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           border-radius: 50%;
//         }

//         .close-btn:hover {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .downloads-list {
//           flex: 1;
//           overflow-y: auto;
//           padding: 16px;
//         }

//         .loading-downloads,
//         .no-downloads {
//           text-align: center;
//           color: #aaa;
//           padding: 40px 0;
//         }

//         .download-item {
//           display: flex;
//           align-items: center;
//           padding: 12px;
//           border-radius: 8px;
//           margin-bottom: 8px;
//           cursor: pointer;
//           transition: background-color 0.2s ease;
//         }

//         .download-item:hover {
//           background: rgba(255, 255, 255, 0.05);
//         }

//         .download-item.selected {
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .download-thumbnail {
//           width: 120px;
//           height: 68px;
//           object-fit: cover;
//           border-radius: 4px;
//           margin-right: 16px;
//           background: #333;
//         }

//         .download-details {
//           flex: 1;
//         }

//         .download-details h4 {
//           margin: 0 0 4px 0;
//           color: white;
//           font-size: 16px;
//         }

//         .download-details p {
//           margin: 0;
//           color: #aaa;
//           font-size: 14px;
//         }

//         .download-actions {
//           display: flex;
//           gap: 8px;
//         }

//         .play-btn,
//         .delete-btn {
//           padding: 6px 12px;
//           border: none;
//           border-radius: 4px;
//           cursor: pointer;
//           font-size: 14px;
//           font-weight: 500;
//         }

//         .play-btn {
//           background: #ff0000;
//           color: white;
//         }

//         .delete-btn {
//           background: rgba(255, 255, 255, 0.1);
//           color: white;
//         }

//         .play-btn:hover {
//           background: #cc0000;
//         }

//         .delete-btn:hover {
//           background: rgba(255, 255, 255, 0.2);
//         }
//       `}</style>
//     </div>
//   );
// };

interface DownloadsManagerProps {
  downloadedVideos: DownloadedVideo[];
  incompleteDownloads?: DownloadProgress[]; // Add this
  onPlay: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onResume?: (videoId: string) => void; // Add resume function
  onClose: () => void;
  onClearAll?: () => void;
  isLoading?: boolean;
}

export const DownloadsManager: React.FC<DownloadsManagerProps> = ({
  downloadedVideos,
  incompleteDownloads = [], // Default to empty array
  onPlay,
  onDelete,
  onResume,
  onClose,
  onClearAll,
  isLoading = false,
}) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"completed" | "incomplete">(
    "completed"
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProgressPercent = (progress: DownloadProgress) => {
    return (progress.downloadedSegments / progress.totalSegments) * 100;
  };

  return (
    <div className="downloads-manager-overlay">
      <div className="downloads-manager-container">
        <div className="downloads-manager-header">
          <h2>Downloads</h2>
          <div className="header-actions">
            {(downloadedVideos.length > 0 || incompleteDownloads.length > 0) &&
              onClearAll && (
                <button className="clear-all-btn" onClick={onClearAll}>
                  Clear All
                </button>
              )}
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="downloads-tabs">
          <button
            className={`tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({downloadedVideos.length})
          </button>
          <button
            className={`tab ${activeTab === "incomplete" ? "active" : ""}`}
            onClick={() => setActiveTab("incomplete")}
          >
            Incomplete ({incompleteDownloads.length})
          </button>
        </div>

        <div className="downloads-list">
          {isLoading ? (
            <div className="loading-downloads">
              <p>Loading downloads...</p>
            </div>
          ) : activeTab === "completed" ? (
            downloadedVideos.length === 0 ? (
              <div className="no-downloads">
                <p>No completed downloads</p>
                <p>Videos you download will appear here</p>
              </div>
            ) : (
              downloadedVideos.map((video) => (
                <DownloadItem
                  key={video.videoId}
                  video={video}
                  selectedVideo={selectedVideo}
                  onSelect={setSelectedVideo}
                  onPlay={onPlay}
                  onDelete={onDelete}
                  type="completed"
                />
              ))
            )
          ) : incompleteDownloads.length === 0 ? (
            <div className="no-downloads">
              <p>No incomplete downloads</p>
              <p>Interrupted downloads will appear here</p>
            </div>
          ) : (
            incompleteDownloads.map((download) => (
              <DownloadItem
                key={download.videoId}
                video={download}
                selectedVideo={selectedVideo}
                onSelect={setSelectedVideo}
                onPlay={onPlay}
                onDelete={onDelete}
                onResume={onResume}
                type="incomplete"
              />
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .downloads-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0 16px;
        }

        .tab {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .tab.active {
          color: white;
          border-bottom-color: #ff0000;
        }

        .tab:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

// Separate component for download items
const DownloadItem: React.FC<{
  video: any;
  selectedVideo: string | null;
  onSelect: (videoId: string) => void;
  onPlay: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onResume?: (videoId: string) => void;
  type: "completed" | "incomplete";
}> = ({ video, selectedVideo, onSelect, onPlay, onDelete, onResume, type }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProgressPercent = (progress: any) => {
    return (progress.downloadedSegments / progress.totalSegments) * 100;
  };

  return (
    <div
      className={`download-item ${
        selectedVideo === video.videoId ? "selected" : ""
      } ${type}`}
      onClick={() => onSelect(video.videoId)}
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        className="download-thumbnail"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "/images/placeholder-thumbnail.jpg";
        }}
      />

      <div className="download-details">
        <h4>{video.title}</h4>
        {type === "completed" ? (
          <p>
            {formatFileSize(video.size)} • {video.quality} • Downloaded{" "}
            {new Date(video.downloadDate).toLocaleDateString()}
          </p>
        ) : (
          <div className="incomplete-info">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getProgressPercent(video)}%` }}
              />
            </div>
            <p>
              {video.downloadedSegments}/{video.totalSegments} segments •
              {Math.round(getProgressPercent(video))}% • {video.quality}
            </p>
          </div>
        )}
      </div>

      <div className="download-actions">
        {type === "completed" ? (
          <>
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
          </>
        ) : (
          <>
            {onResume && (
              <button
                className="resume-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onResume(video.videoId);
                }}
              >
                Resume
              </button>
            )}
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.videoId);
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .incomplete-info {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .progress-fill {
          height: 100%;
          background: #ff4444;
          transition: width 0.3s ease;
        }

        .resume-btn {
          background: #00aaff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .resume-btn:hover {
          background: #0088cc;
        }

        .download-item.incomplete {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};
