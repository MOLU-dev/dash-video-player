// FILE: components/ReelItem.tsx
// ============================================================

import React, { useCallback, useState, useRef } from 'react';
import { Volume2, VolumeX, Heart, MessageCircle, Share2, MoreVertical, Download } from 'lucide-react';
import { useReelPlayer } from '@/hooks/reels/useReelPlayer';

interface ReelItemProps {
  videoId: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  isActive: boolean;
  initialTime?: number;
  onLike?: (videoId: string, isLiked: boolean) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  onStateChange?: (state: any) => void;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
}

export function ReelItem({
  videoId,
  title,
  creator,
  creatorAvatar,
  isActive,
  initialTime,
  onLike,
  onComment,
  onShare,
  onStateChange,
  likeCount = 0,
  commentCount = 0,
  isLiked: initialIsLiked = false,
}: ReelItemProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const lastTapRef = useRef(0);

  const {
    videoRef,
    isMuted,
    isReady,
    toggleMute,
    onDownload,
    downloadStatus,
    downloadProgress,
  } = useReelPlayer({
    videoId,
    isActive,
    initialTime,
    onStateChange,
  });

  // Handle double-tap to like
  const handleVideoTap = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      if (!isLiked) {
        setIsLiked(true);
        setShowLikeAnimation(true);
        onLike?.(videoId, true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }
    } else {
      toggleMute();
    }

    lastTapRef.current = now;
  }, [videoId, isLiked, onLike, toggleMute]);

  const handleLike = useCallback(() => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    onLike?.(videoId, newLikedState);
    
    if (newLikedState) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 800);
    }
  }, [isLiked, videoId, onLike]);

  const handleDownload = useCallback(() => {
    onDownload();
    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 3000);
  }, [onDownload]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="reel-item">
      <div className="video-container" onClick={handleVideoTap}>
        <video
          ref={videoRef}
          className="reel-video"
          playsInline
          loop
          preload="metadata"
        />

        {isActive && !isReady && (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        )}

        {showLikeAnimation && (
          <div className="like-animation">
            <Heart size={80} fill="#ff2e63" color="#ff2e63" />
          </div>
        )}
      </div>

      <div className="gradient-overlay" />

      <div className="actions-sidebar">
        {creatorAvatar && (
          <div className="creator-avatar">
            <img src={creatorAvatar} alt={creator} />
          </div>
        )}

        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <Heart 
            size={32} 
            fill={isLiked ? '#ff2e63' : 'none'}
            color={isLiked ? '#ff2e63' : 'white'}
          />
          <span className="action-count">{formatCount(likeCount)}</span>
        </button>

        <button 
          className="action-btn"
          onClick={() => onComment?.(videoId)}
        >
          <MessageCircle size={32} />
          <span className="action-count">{formatCount(commentCount)}</span>
        </button>

        <button 
          className="action-btn"
          onClick={() => onShare?.(videoId)}
        >
          <Share2 size={32} />
          <span className="action-count">Share</span>
        </button>

        <button 
          className="action-btn"
          onClick={handleDownload}
          disabled={downloadStatus === 'downloading'}
        >
          <Download size={32} />
          {downloadStatus === 'downloading' && (
            <span className="action-count">{Math.round(downloadProgress)}%</span>
          )}
        </button>

        <button className="action-btn">
          <MoreVertical size={32} />
        </button>
      </div>

      <div className="bottom-info">
        <div className="creator-info">
          <h3 className="creator-name">{creator}</h3>
          <button className="follow-btn">Follow</button>
        </div>
        <p className="video-title">{title}</p>
        <div className="video-meta">
          <span>🎵 Original Audio</span>
        </div>
      </div>

      <button className="mute-toggle" onClick={() => toggleMute()}>
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {showDownloadToast && (
        <div className="download-toast">
          <Download size={16} />
          <span>Downloading...</span>
        </div>
      )}

      <style jsx>{`
        .reel-item {
          position: relative;
          width: 100vw;
          height: 100vh;
          scroll-snap-align: start;
          background: #000;
          overflow: hidden;
        }

        .video-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
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
          to { transform: rotate(360deg); }
        }

        .like-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: likePopup 0.8s ease forwards;
          pointer-events: none;
          z-index: 100;
        }

        @keyframes likePopup {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .gradient-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 0, 0, 0.4) 50%,
            transparent 100%
          );
          pointer-events: none;
        }

        .actions-sidebar {
          position: absolute;
          right: 12px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }

        .creator-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid white;
          margin-bottom: 8px;
        }

        .creator-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          transition: transform 0.2s;
          padding: 8px;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .action-btn.liked {
          animation: likeButtonPulse 0.3s ease;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes likeButtonPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        .action-count {
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .bottom-info {
          position: absolute;
          bottom: 20px;
          left: 16px;
          right: 80px;
          z-index: 10;
          color: white;
        }

        .creator-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .creator-name {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .follow-btn {
          padding: 6px 16px;
          border: 2px solid white;
          border-radius: 4px;
          background: transparent;
          color: white;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .follow-btn:hover {
          background: white;
          color: black;
        }

        .video-title {
          margin: 4px 0;
          font-size: 14px;
          line-height: 1.4;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .video-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          opacity: 0.9;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }

        .mute-toggle {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: background 0.2s;
        }

        .mute-toggle:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        .download-toast {
          position: absolute;
          bottom: 200px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 20px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          animation: slideUp 0.3s ease;
          z-index: 20;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @media (max-width: 768px) {
          .actions-sidebar {
            right: 8px;
            bottom: 80px;
            gap: 16px;
          }

          .bottom-info {
            left: 12px;
            bottom: 16px;
            right: 70px;
          }

          .action-btn {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}
