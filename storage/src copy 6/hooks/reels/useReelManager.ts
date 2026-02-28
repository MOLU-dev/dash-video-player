// hooks/reels/useReelManager.ts
import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Reel,
  ReelState,
  ReelWindow,
  ReelCacheMap,
} from "../../../../src/types/reel.types";

const CACHE_SIZE = 5;
const PRELOAD_AHEAD = 2;
const KEEP_BEHIND = 2;

interface UseReelManagerProps {
  reels: Reel[];
  initialIndex?: number;
}

export function useReelManager({
  reels,
  initialIndex = 0,
}: UseReelManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reelCache, setReelCache] = useState<ReelCacheMap>(new Map());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const reelRefs = useRef<Map<string, any>>(new Map());

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
      return reels.slice(window.start, window.end + 1);
    },
    [reels]
  );

  // Initialize cache for window
  const initializeWindow = useCallback(
    (window: ReelWindow) => {
      const newCache = new Map<string, ReelState>();
      const reelsInWindow = getReelsInWindow(window);

      reelsInWindow.forEach((reel, idx) => {
        const globalIndex = window.start + idx;
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
          }
        });

        // Add new reels in window
        const reelsInWindow = getReelsInWindow(newWindow);
        reelsInWindow.forEach((reel, idx) => {
          if (!newCache.has(reel.id)) {
            const globalIndex = newWindow.start + idx;
            newCache.set(reel.id, {
              reel,
              playerState:
                globalIndex === newWindow.current ? "loading" : "idle",
              bufferProgress: 0,
              hasPlayed: false,
            });
          }
        });

        return newCache;
      });
    },
    [reels, getReelsInWindow]
  );

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
    reelsInWindow: Array.from(reelCache.values()).map((s) => s.reel),
    isTransitioning,
    goToNext,
    goToPrevious,
    registerReelPlayer,
    totalReels: reels.length,
  };
}
