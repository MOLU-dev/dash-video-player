// hooks/reels/useReelManager.ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Reel,
  ReelState,
  ReelWindow,
  ReelCacheMap,
  ReelPlayerHandle,
} from "../../../../src/types/reel.types";

const CACHE_SIZE = 5;
const PRELOAD_AHEAD = 2;
const KEEP_BEHIND = 2;

interface UseReelManagerProps {
  reels: Reel[];
  initialIndex?: number;
  autoPlayNext?: boolean;
}

export function useReelManager({
  reels,
  initialIndex = 0,
  autoPlayNext = true,
}: UseReelManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reelCache, setReelCache] = useState<ReelCacheMap>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const reelRefs = useRef<Map<string, ReelPlayerHandle>>(new Map());
  const transitionLock = useRef(false);

  // Calculate the window of reels to keep loaded
  const getReelWindow = useCallback(
    (index: number): ReelWindow => {
      const start = Math.max(0, index - KEEP_BEHIND);
      const end = Math.min(reels.length - 1, index + PRELOAD_AHEAD);

      return { start, end, current: index };
    },
    [reels.length]
  );

  // Get reels in current window
  const getReelsInWindow = useCallback(
    (window: ReelWindow) => {
      return reels.slice(window.start, window.end + 1).map((reel, idx) => ({
        ...reel,
        globalIndex: window.start + idx,
      }));
    },
    [reels]
  );

  // Initialize cache for window
  const initializeWindow = useCallback(
    (window: ReelWindow) => {
      const newCache = new Map<string, ReelState>();
      const reelsInWindow = getReelsInWindow(window);

      reelsInWindow.forEach(({ globalIndex, ...reel }) => {
        const isCurrent = globalIndex === window.current;

        newCache.set(reel.id, {
          reel,
          playerState: isCurrent ? "loading" : "idle",
          bufferProgress: 0,
          hasPlayed: false,
        });
      });

      setReelCache(newCache);
    },
    [getReelsInWindow]
  );

  // Update cache state for a reel
  const updateReelState = useCallback(
    (reelId: string, updates: Partial<ReelState>) => {
      setReelCache((prev) => {
        const newCache = new Map(prev);
        const existing = newCache.get(reelId);
        if (existing) {
          newCache.set(reelId, { ...existing, ...updates });
        }
        return newCache;
      });
    },
    []
  );

  // Move to next reel
  const goToNext = useCallback(async () => {
    if (
      currentIndex >= reels.length - 1 ||
      isTransitioning ||
      transitionLock.current
    )
      return;

    transitionLock.current = true;
    setIsTransitioning(true);

    try {
      // Pause current reel
      const currentReel = reels[currentIndex];
      const currentPlayer = reelRefs.current.get(currentReel.id);
      currentPlayer?.pause();

      // Mark as played
      updateReelState(currentReel.id, {
        hasPlayed: true,
        playerState: "paused",
      });

      // Move to next
      const nextIndex = currentIndex + 1;
      const nextReel = reels[nextIndex];

      setCurrentIndex(nextIndex);

      // Update window
      const newWindow = getReelWindow(nextIndex);
      updateWindow(newWindow);

      // Play next reel after a brief delay
      setTimeout(() => {
        const nextPlayer = reelRefs.current.get(nextReel.id);
        if (nextPlayer?.isReady()) {
          nextPlayer.play().catch(console.error);
          updateReelState(nextReel.id, { playerState: "playing" });
        }
        setIsTransitioning(false);
        transitionLock.current = false;
      }, 150);
    } catch (error) {
      console.error("Error transitioning to next reel:", error);
      setIsTransitioning(false);
      transitionLock.current = false;
    }
  }, [currentIndex, reels, isTransitioning, getReelWindow, updateReelState]);

  // Move to previous reel
  const goToPrevious = useCallback(async () => {
    if (currentIndex <= 0 || isTransitioning || transitionLock.current) return;

    transitionLock.current = true;
    setIsTransitioning(true);

    try {
      // Pause current reel
      const currentReel = reels[currentIndex];
      const currentPlayer = reelRefs.current.get(currentReel.id);
      currentPlayer?.pause();

      updateReelState(currentReel.id, { playerState: "paused" });

      // Move to previous
      const prevIndex = currentIndex - 1;
      const prevReel = reels[prevIndex];

      setCurrentIndex(prevIndex);

      // Update window
      const newWindow = getReelWindow(prevIndex);
      updateWindow(newWindow);

      // Play previous reel
      setTimeout(() => {
        const prevPlayer = reelRefs.current.get(prevReel.id);
        if (prevPlayer?.isReady()) {
          prevPlayer.play().catch(console.error);
          updateReelState(prevReel.id, {
            playerState: "playing",
            hasPlayed: true,
          });
        }
        setIsTransitioning(false);
        transitionLock.current = false;
      }, 150);
    } catch (error) {
      console.error("Error transitioning to previous reel:", error);
      setIsTransitioning(false);
      transitionLock.current = false;
    }
  }, [currentIndex, reels, isTransitioning, getReelWindow, updateReelState]);

  // Update window (cleanup old, load new)
  const updateWindow = useCallback(
    (newWindow: ReelWindow) => {
      setReelCache((prevCache) => {
        const newCache = new Map(prevCache);

        // Remove reels outside window
        prevCache.forEach((state, reelId) => {
          const reelIndex = reels.findIndex((r) => r.id === reelId);
          if (reelIndex < newWindow.start || reelIndex > newWindow.end) {
            newCache.delete(reelId);

            // Cleanup player
            const player = reelRefs.current.get(reelId);
            player?.cleanup();
            reelRefs.current.delete(reelId);

            console.log(`Cleaned up reel ${reelId} (index ${reelIndex})`);
          }
        });

        // Add new reels in window
        const reelsInWindow = getReelsInWindow(newWindow);
        reelsInWindow.forEach(({ globalIndex, ...reel }) => {
          if (!newCache.has(reel.id)) {
            newCache.set(reel.id, {
              reel,
              playerState:
                globalIndex === newWindow.current ? "loading" : "idle",
              bufferProgress: 0,
              hasPlayed: false,
            });

            console.log(
              `Added reel ${reel.id} to cache (index ${globalIndex})`
            );
          }
        });

        return newCache;
      });
    },
    [reels, getReelsInWindow]
  );

  // Register reel player ref
  const registerReelPlayer = useCallback(
    (reelId: string, player: ReelPlayerHandle) => {
      reelRefs.current.set(reelId, player);
      console.log(`Registered player for reel ${reelId}`);
    },
    []
  );

  // Handle reel ended
  const handleReelEnded = useCallback(() => {
    if (autoPlayNext) {
      goToNext();
    }
  }, [autoPlayNext, goToNext]);

  // Initialize on mount
  useEffect(() => {
    const window = getReelWindow(initialIndex);
    initializeWindow(window);
  }, [initialIndex, getReelWindow, initializeWindow]);

  // Get current window info
  const currentWindow = getReelWindow(currentIndex);
  const reelsInCurrentWindow = getReelsInWindow(currentWindow);

  return {
    currentIndex,
    currentReel: reels[currentIndex],
    reelCache,
    reelsInWindow: reelsInCurrentWindow,
    isTransitioning,
    goToNext,
    goToPrevious,
    registerReelPlayer,
    updateReelState,
    handleReelEnded,
    totalReels: reels.length,
    hasNext: currentIndex < reels.length - 1,
    hasPrevious: currentIndex > 0,
  };
}
