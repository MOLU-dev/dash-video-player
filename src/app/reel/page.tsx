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

/**
 *  Custom video source with UNIQUE IDs
 */
const CUSTOM_VIDEOS: Video[] = [
  {
    id: "uqwS5sY6bnE",
    title: "Morning vibes ☀️",
    creator: "John Doe",
    likeCount: 120,
    commentCount: 14,
    isLiked: false,
  },
  {
    id: "kWgsI9sLFq3",
    title: "City night lights 🌃",
    creator: "Jane Smith",
    likeCount: 542,
    commentCount: 87,
    isLiked: true,
  },
  {
    id: "Tginu2qAWWz",
    title: "Coding at 2AM 💻",
    creator: "Ofonime",
    likeCount: 900,
    commentCount: 201,
    isLiked: false,
  },
  {
    id: "k9B15RzIWYQ",
    title: "Travel memories ✈️",
    creator: "Alex",
    likeCount: 321,
    commentCount: 45,
    isLiked: false,
  },
  {
    id: "reel_005",
    title: "Late night chill 🎧",
    creator: "Chris",
    likeCount: 78,
    commentCount: 6,
    isLiked: false,
  },
  {
    id: "reel_006",
    title: "Coffee & Code ☕",
    creator: "Sarah",
    likeCount: 234,
    commentCount: 32,
    isLiked: false,
  },
  {
    id: "reel_007",
    title: "Sunset vibes 🌅",
    creator: "Mike",
    likeCount: 567,
    commentCount: 78,
    isLiked: true,
  },
];

const PAGE_SIZE = 3; // Load 3 videos at a time

export default function ReelsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Load videos from local array instead of API
   */
  const loadVideos = useCallback(() => {
    if (loading || !hasMore) return;

    setLoading(true);

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const nextVideos = CUSTOM_VIDEOS.slice(start, end);

    if (nextVideos.length === 0) {
      setHasMore(false);
    } else {
      setVideos((prev) => [...prev, ...nextVideos]);
      setPage((prev) => prev + 1);
    }

    setLoading(false);
  }, [loading, hasMore, page]);

  useEffect(() => {
    loadVideos();
  }, []);

  /**
   * Like handler (local state only)
   */
  const handleLike = useCallback((videoId: string, isLiked: boolean) => {
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
  }, []);

  /**
   * Comment handler
   */
  const handleComment = useCallback((videoId: string) => {
    console.log("Open comments for:", videoId);
  }, []);

  /**
   * Share handler
   */
  const handleShare = useCallback(async (videoId: string) => {
    const url = `${window.location.origin}/reels/${videoId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this video!",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share:", err);
    }
  }, []);

  /**
   * Initial loading screen
   */
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
