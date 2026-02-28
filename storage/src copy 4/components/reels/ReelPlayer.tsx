// components/ReelPlayerWithControls.tsx - Enhanced version with controls
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useReelPlayer } from '@/hooks/reels/useReelPlayer';
import { ReelControls } from './ReelControls';
import type { Reel } from '../../../../src/types/reel.types';

interface ReelPlayerWithControlsProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload: boolean;
  onEnded?: () => void;
  onReady?: () => void;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onFollow?: (authorId: string) => void;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialIsLiked?: boolean;
  initialIsFollowing?: boolean;
}

export const ReelPlayerWithControls = forwardRef<any, ReelPlayerWithControlsProps>(({
  reel,
  isActive,
  shouldPreload,
  onEnded,
  onReady,
  onLike,
  onComment,
  onShare,
  onFollow,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialIsLiked = false,
  initialIsFollowing = false,
}, ref) => {
  const player = useReelPlayer({
    reel,
    isActive,
    shouldPreload,
    onEnded,
    onReady,
  });

  // Control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  // Expose player methods to parent
  useImperativeHandle(ref, () => ({
    play: () => {
      player.handlePlay();
      setIsPlaying(true);
    },
    pause: () => {
      player.handlePause();
      setIsPlaying(false);
    },
    cleanup: () => player.cleanup?.(),
  }), [player]);

  // Track video element events
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [player.videoRef]);

  // Handlers
  const handlePlayPause = () => {
    const video = player.videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleMuteToggle = () => {
    const video = player.videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    if (onLike) {
      onLike(reel.id);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(reel.id);
    }
  };

  const handleShare = async () => {
    // Copy link to clipboard
    const shareUrl = `${window.location.origin}/reels?reelId=${reel.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.title,
          text: `Check out this reel by ${reel.author}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // Show toast notification
        alert('Link copied to clipboard!');
      }
      
      if (onShare) {
        onShare(reel.id);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    
    if (onFollow) {
      onFollow(reel.author);
    }
  };

  return (
    <div className={`reel-player ${isActive ? 'active' : ''}`}>
      {/* Video Element */}
      <video
        ref={player.videoRef}
        className="reel-video"
        playsInline
        muted={isMuted}
        loop={false}
      />
      
      {/* Buffering Indicator */}
      {player.currentStats.buffer < 3 && isActive && (
        <div className="buffer-indicator">
          <div className="spinner" />
        </div>
      )}

      {/* Interactive Controls */}
      {isActive && (
        <ReelControls
          reel={reel}
          isPlaying={isPlaying}
          isMuted={isMuted}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onMuteToggle={handleMuteToggle}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          onFollow={handleFollow}
          likeCount={likeCount}
          commentCount={commentCount}
          isLiked={isLiked}
          isFollowing={isFollowing}
        />
      )}

      <style jsx>{`
        .reel-player {
          width: 100%;
          height: 100vh;
          position: relative;
          background: #000;
          scroll-snap-align: start;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .buffer-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .reel-player:not(.active) {
          pointer-events: none;
        }

        .reel-player:not(.active) .reel-video {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
});

ReelPlayerWithControls.displayName = 'ReelPlayerWithControls';

// ============================================
// Example Usage in ReelCarousel
// ============================================

// components/ReelCarouselWithControls.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { useReelManagerEnhanced } from '@/hooks/reels/useReelManagerEnhanced';
import { useReelScroll } from '../../../../src/hooks/reels/useReelScroll';
import { ReelPlayerWithControls } from './ReelPlayerWithControls';
import type { Reel } from '../../../../src/types/reel.types';

interface ReelCarouselWithControlsProps {
  reels: Reel[];
  initialIndex?: number;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onFollow?: (authorId: string) => void;
}

export function ReelCarouselWithControls({
  reels,
  initialIndex = 0,
  onLike,
  onComment,
  onShare,
  onFollow,
}: ReelCarouselWithControlsProps) {
  const manager = useReelManagerEnhanced({ reels, initialIndex });
  
  const { containerRef } = useReelScroll({
    onNext: manager.goToNext,
    onPrevious: manager.goToPrevious,
    isTransitioning: manager.isTransitioning,
  });

  const reelPlayerRefs = useRef<Map<string, any>>(new Map());

  // Register players with manager
  useEffect(() => {
    reelPlayerRefs.current.forEach((player