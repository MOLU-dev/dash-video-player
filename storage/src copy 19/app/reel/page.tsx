// ============================================================
// FILE: app/reels/page.tsx
// ============================================================

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReelPlayer } from "@/components/reels/ReelPlayer";

interface Video {
  id: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export default function ReelsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reels?page=${page}&limit=10`);

      if (!response.ok) {
        throw new Error("Failed to load videos");
      }

      const newVideos: Video[] = await response.json();

      if (newVideos.length === 0) {
        setHasMore(false);
      } else {
        setVideos((prev) => [...prev, ...newVideos]);
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to load videos:", err);
      setError("Failed to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  useEffect(() => {
    loadVideos();
  }, []);

  const handleLike = useCallback(async (videoId: string, isLiked: boolean) => {
    try {
      await fetch("/api/reels/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, isLiked }),
      });

      setVideos((prev) =>
        prev.map((video) =>
          video.id === videoId
            ? {
                ...video,
                isLiked,
                likeCount: video.likeCount + (isLiked ? 1 : -1),
              }
            : video
        )
      );
    } catch (err) {
      console.error("Failed to like video:", err);
    }
  }, []);

  const handleComment = useCallback((videoId: string) => {
    console.log("Open comments for:", videoId);
  }, []);

  const handleShare = useCallback(async (videoId: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this video!",
          url: `${window.location.origin}/reels/${videoId}`,
        });
      } else {
        await navigator.clipboard.writeText(
          `${window.location.origin}/reels/${videoId}`
        );
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share:", err);
    }
  }, []);

  if (videos.length === 0 && loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading reels...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #000;
            color: white;
            gap: 16px;
          }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => loadVideos()}>Retry</button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #000;
            color: white;
            gap: 16px;
          }

          button {
            padding: 12px 24px;
            background: white;
            color: black;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <ReelPlayer
        videos={videos}
        onLoadMore={loadVideos}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
      />

      {loading && videos.length > 0 && (
        <div className="bottom-loading">
          <div className="spinner" />
        </div>
      )}

      <style jsx>{`
        .bottom-loading {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: rgba(0, 0, 0, 0.8);
          padding: 12px;
          border-radius: 50%;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
