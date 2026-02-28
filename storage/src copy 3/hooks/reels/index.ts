# Reels/Shorts Player Architecture

## 🎯 Requirements

1. **Cache 5 reels at once** (current + 2 before + 2 after)
2. **Play only one reel** at a time
3. **Keep 2 played reels** in history
4. **Preload 3 upcoming reels** for instant playback
5. **Vertical scroll** navigation
6. **Instant transitions** - reels always ready

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Reel Carousel Container                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Reel    │  │  Reel    │  │  Reel    │     │
│  │  -2      │  │  -1      │  │   0      │     │
│  │ (cached) │  │ (cached) │  │(PLAYING) │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                  │
│  ┌──────────┐  ┌──────────┐                    │
│  │  Reel    │  │  Reel    │                    │
│  │  +1      │  │  +2      │                    │
│  │(preload) │  │(preload) │                    │
│  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────┘

Window: [-2, -1, 0, +1, +2]
Playing: 0
```

## 📁 File Structure

```
src/
├── hooks/
│   ├── reels/
│   │   ├── useReelManager.ts       ← Cache & preload logic
│   │   ├── useReelPlayer.ts        ← Individual reel player
│   │   ├── useReelScroll.ts        ← Scroll behavior
│   │   └── useReelPreloader.ts     ← Preloading strategy
│   └── index.ts
│
├── components/
│   ├── ReelCarousel.tsx            ← Container
│   ├── ReelCarouselUI.tsx          ← UI presentation
│   ├── ReelPlayer.tsx              ← Single reel player
│   └── ReelControls.tsx            ← Reel controls
│
└── types/
    └── reel.types.ts
```

## 🔧 Implementation

### 1. Types Definition

```typescript
// types/reel.types.ts
export interface Reel {
  id: string;
  videoId: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration: number;
}

export interface ReelState {
  reel: Reel;
  playerState: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';
  bufferProgress: number;
  hasPlayed: boolean;
}

export interface ReelWindow {
  start: number;
  end: number;
  current: number;
}

export type ReelCacheMap = Map<string, ReelState>;
```

### 2. Reel Manager Hook

```typescript
// hooks/reels/useReelManager.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Reel, ReelState, ReelWindow, ReelCacheMap } from '@/types/reel.types';

const CACHE_SIZE = 5;
const PRELOAD_AHEAD = 2;
const KEEP_BEHIND = 2;

interface UseReelManagerProps {
  reels: Reel[];
  initialIndex?: number;
}

export function useReelManager({ 
  reels, 
  initialIndex = 0 
}: UseReelManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reelCache, setReelCache] = useState<ReelCacheMap>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const reelRefs = useRef<Map<string, any>>(new Map());

  // Calculate the window of reels to keep loaded
  const getReelWindow = useCallback((index: number): ReelWindow => {
    const start = Math.max(0, index - KEEP_BEHIND);
    const end = Math.min(reels.length - 1, index + PRELOAD_AHEAD);
    
    return { start, end, current: index };
  }, [reels.length]);

  // Get reels in current window
  const getReelsInWindow = useCallback((window: ReelWindow) => {
    return reels.slice(window.start, window.end + 1);
  }, [reels]);

  // Initialize cache for window
  const initializeWindow = useCallback((window: ReelWindow) => {
    const newCache = new Map<string, ReelState>();
    const reelsInWindow = getReelsInWindow(window);
    
    reelsInWindow.forEach((reel, idx) => {
      const globalIndex = window.start + idx;
      const isCurrent = globalIndex === window.current;
      
      newCache.set(reel.id, {
        reel,
        playerState: isCurrent ? 'loading' : 'idle',
        bufferProgress: 0,
        hasPlayed: false,
      });
    });
    
    setReelCache(newCache);
  }, [getReelsInWindow]);

  // Move to next reel
  const goToNext = useCallback(async () => {
    if (currentIndex >= reels.length - 1 || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Pause current reel
    const currentReel = reels[currentIndex];
    const currentPlayer = reelRefs.current.get(currentReel.id);
    currentPlayer?.pause();
    
    // Move to next
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    
    // Update window
    const newWindow = getReelWindow(nextIndex);
    updateWindow(newWindow);
    
    // Play next reel
    setTimeout(() => {
      const nextReel = reels[nextIndex];
      const nextPlayer = reelRefs.current.get(nextReel.id);
      nextPlayer?.play();
      setIsTransitioning(false);
    }, 100);
  }, [currentIndex, reels, isTransitioning, getReelWindow]);

  // Move to previous reel
  const goToPrevious = useCallback(async () => {
    if (currentIndex <= 0 || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Pause current reel
    const currentReel = reels[currentIndex];
    const currentPlayer = reelRefs.current.get(currentReel.id);
    currentPlayer?.pause();
    
    // Move to previous
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    
    // Update window
    const newWindow = getReelWindow(prevIndex);
    updateWindow(newWindow);
    
    // Play previous reel
    setTimeout(() => {
      const prevReel = reels[prevIndex];
      const prevPlayer = reelRefs.current.get(prevReel.id);
      prevPlayer?.play();
      setIsTransitioning(false);
    }, 100);
  }, [currentIndex, reels, isTransitioning, getReelWindow]);

  // Update window (cleanup old, load new)
  const updateWindow = useCallback((newWindow: ReelWindow) => {
    setReelCache((prevCache) => {
      const newCache = new Map(prevCache);
      
      // Remove reels outside window
      prevCache.forEach((state, reelId) => {
        const reelIndex = reels.findIndex(r => r.id === reelId);
        if (reelIndex < newWindow.start || reelIndex > newWindow.end) {
          newCache.delete(reelId);
          
          // Cleanup player
          const player = reelRefs.current.get(reelId);
          player?.cleanup();
          reelRefs.current.delete(reelId);
        }
      });
      
      // Add new reels in window
      const reelsInWindow = getReelsInWindow(newWindow);
      reelsInWindow.forEach((reel, idx) => {
        if (!newCache.has(reel.id)) {
          const globalIndex = newWindow.start + idx;
          newCache.set(reel.id, {
            reel,
            playerState: globalIndex === newWindow.current ? 'loading' : 'idle',
            bufferProgress: 0,
            hasPlayed: false,
          });
        }
      });
      
      return newCache;
    });
  }, [reels, getReelsInWindow]);

  // Register reel player ref
  const registerReelPlayer = useCallback((reelId: string, player: any) => {
    reelRefs.current.set(reelId, player);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const window = getReelWindow(initialIndex);
    initializeWindow(window);
  }, [initialIndex, getReelWindow, initializeWindow]);

  return {
    currentIndex,
    currentReel: reels[currentIndex],
    reelCache,
    reelsInWindow: Array.from(reelCache.values()).map(s => s.reel),
    isTransitioning,
    goToNext,
    goToPrevious,
    registerReelPlayer,
    totalReels: reels.length,
  };
}
```

### 3. Scroll Handler Hook

```typescript
// hooks/reels/useReelScroll.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseReelScrollProps {
  onNext: () => void;
  onPrevious: () => void;
  isTransitioning: boolean;
}

export function useReelScroll({
  onNext,
  onPrevious,
  isTransitioning,
}: UseReelScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastScrollTime = useRef(0);
  const scrollThreshold = 50; // pixels
  const scrollCooldown = 500; // ms

  const handleScroll = useCallback((deltaY: number) => {
    if (isTransitioning) return;
    
    const now = Date.now();
    if (now - lastScrollTime.current < scrollCooldown) return;
    
    if (Math.abs(deltaY) < scrollThreshold) return;
    
    lastScrollTime.current = now;
    
    if (deltaY > 0) {
      // Scroll down - next reel
      onNext();
    } else {
      // Scroll up - previous reel
      onPrevious();
    }
  }, [onNext, onPrevious, isTransitioning]);

  // Wheel event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleScroll(e.deltaY);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleScroll]);

  // Touch events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY.current - touchEndY;
      handleScroll(deltaY);
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious]);

  return { containerRef };
}
```

### 4. Individual Reel Player

```typescript
// hooks/reels/useReelPlayer.ts
import { useEffect, useCallback, useRef } from 'react';
import { useGrpcPlayer } from '@/hooks';
import type { Reel } from '@/types/reel.types';

interface UseReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload: boolean;
  onReady?: () => void;
  onEnded?: () => void;
}

export function useReelPlayer({
  reel,
  isActive,
  shouldPreload,
  onReady,
  onEnded,
}: UseReelPlayerProps) {
  const player = useGrpcPlayer({ videoId: reel.videoId });
  const hasPreloaded = useRef(false);

  // Preload when needed
  useEffect(() => {
    if (shouldPreload && !hasPreloaded.current && !isActive) {
      // Start initializing but don't play
      player.videoRef.current?.load();
      hasPreloaded.current = true;
    }
  }, [shouldPreload, isActive, player]);

  // Play/pause based on active state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    if (isActive) {
      // Play when active
      video.play().catch(console.error);
    } else {
      // Pause when not active
      video.pause();
      // Reset to beginning if not adjacent
      video.currentTime = 0;
    }
  }, [isActive, player.videoRef]);

  // Handle video ended
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (isActive && onEnded) {
        onEnded();
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [isActive, onEnded, player.videoRef]);

  // Handle ready state
  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (onReady) {
        onReady();
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [onReady, player.videoRef]);

  const cleanup = useCallback(() => {
    const video = player.videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = '';
    }
  }, [player.videoRef]);

  return {
    ...player,
    cleanup,
  };
}
```

Now let me create the UI components: