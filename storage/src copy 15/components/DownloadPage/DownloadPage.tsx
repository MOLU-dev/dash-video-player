// components/DownloadPage/DownloadPage.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useDownloadManager } from "../VideoPlayer/hooks/useDownloadManager";
import DownloadList from "./DownloadList";
import DownloadStats from "./DownloadStats";
import DownloadFilters from "./DownloadFilters";

export type DownloadFilter = "all" | "video" | "audio";
export type SortBy = "date" | "name" | "size" | "progress";

const DownloadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"downloaded" | "pending">(
    "downloaded"
  );
  const [filter, setFilter] = useState<DownloadFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    downloads,
    downloadedVideos,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteDownloadedVideo,
    playDownloadedVideo,
    isLowBattery,
    isOnline,
  } = useDownloadManager();

  // Filter and sort downloaded videos
  const getFilteredDownloadedVideos = () => {
    let filtered = downloadedVideos;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((video) =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter (in a real app, you might have different media types)
    if (filter !== "all") {
      // For now, we only have videos, but you can extend this
      filtered = filtered; // Placeholder for future media type filtering
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "size":
          return b.size - a.size;
        case "date":
          return (
            new Date(b.downloadDate).getTime() -
            new Date(a.downloadDate).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Filter and sort pending downloads
  const getFilteredPendingDownloads = () => {
    let filtered = downloads;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((download) =>
        download.videoId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.videoId.localeCompare(b.videoId);
        case "progress":
          return (
            b.downloadedSegments / b.totalSegments -
            a.downloadedSegments / a.totalSegments
          );
        case "date":
          // For pending downloads, we don't have a date, so sort by progress
          return (
            b.downloadedSegments / b.totalSegments -
            a.downloadedSegments / a.totalSegments
          );
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredDownloadedVideos = getFilteredDownloadedVideos();
  const filteredPendingDownloads = getFilteredPendingDownloads();

  // Calculate statistics
  const totalDownloadedSize = downloadedVideos.reduce(
    (sum, video) => sum + video.size,
    0
  );
  const totalPendingDownloads = downloads.length;
  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading"
  ).length;
  const pausedDownloads = downloads.filter((d) => d.status === "paused").length;

  return (
    <div className="download-page">
      <div className="download-page-header">
        <h1>Downloads</h1>
        <DownloadStats
          totalDownloaded={downloadedVideos.length}
          totalDownloadedSize={totalDownloadedSize}
          activeDownloads={activeDownloads}
          pendingDownloads={totalPendingDownloads}
          pausedDownloads={pausedDownloads}
          isLowBattery={isLowBattery}
          isOnline={isOnline}
        />
      </div>

      <div className="download-page-controls">
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "downloaded" ? "active" : ""}`}
              onClick={() => setActiveTab("downloaded")}
            >
              Downloaded
              <span className="tab-badge">{downloadedVideos.length}</span>
            </button>
            <button
              className={`tab ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Downloads
              <span className="tab-badge">{downloads.length}</span>
            </button>
          </div>
        </div>

        <DownloadFilters
          filter={filter}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
        />
      </div>

      <div className="download-page-content">
        {activeTab === "downloaded" ? (
          <DownloadList
            type="downloaded"
            items={filteredDownloadedVideos}
            onPlay={playDownloadedVideo}
            onDelete={deleteDownloadedVideo}
            onRetry={() => {}} // Not applicable for downloaded items
            emptyMessage="No downloads yet. Videos you download will appear here."
          />
        ) : (
          <DownloadList
            type="pending"
            items={filteredPendingDownloads}
            onPause={pauseDownload}
            onResume={resumeDownload}
            onCancel={cancelDownload}
            onRetry={resumeDownload}
            emptyMessage="No pending downloads. Start downloading videos to see them here."
          />
        )}
      </div>
    </div>
  );
};

export default DownloadPage;
