"use client";

import { useState } from "react";
import { Eye, ThumbsUp, Share2 } from "lucide-react";
import type { StreamMetadata } from "@/lib/types";

interface StreamInfoProps {
  stream: StreamMetadata;
}

export default function StreamInfo({ stream }: StreamInfoProps) {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const handleLike = () => {
    if (hasLiked) {
      setLikes(likes - 1);
      setHasLiked(false);
    } else {
      setLikes(likes + 1);
      setHasLiked(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{stream.title}</h1>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-youtube-textSecondary">
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span>{stream.viewer_count} watching</span>
          </div>

          {stream.status === "live" && (
            <div className="bg-youtube-red text-white px-3 py-1 rounded-full text-sm font-bold">
              LIVE
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
              hasLiked
                ? "bg-youtube-red text-white"
                : "bg-youtube-darkHover text-white hover:bg-youtube-border"
            }`}
          >
            <ThumbsUp size={20} />
            <span>{likes}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-youtube-darkHover text-white hover:bg-youtube-border transition-colors"
          >
            <Share2 size={20} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="bg-youtube-dark rounded-lg p-4">
        <p className="text-youtube-textSecondary text-sm">
          Stream ID: <span className="font-mono text-white">{stream.id}</span>
        </p>
        <p className="text-youtube-textSecondary text-sm mt-2">
          Status: <span className="capitalize text-white">{stream.status}</span>
        </p>
      </div>
    </div>
  );
}
