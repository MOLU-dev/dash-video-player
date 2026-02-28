// hooks/reels/useReelPreloader.ts
import { useEffect, useRef, useCallback } from 'react';
import type { Reel } from '../../../../src/types/reel.types';

interface UseReelPreloaderProps {
  reels: Reel[];
  currentIndex: number;
  onPreloaded: (reelId: string) => void;
}

export function useReelPreloader({
  reels,
  currentIndex,
  onPreloaded,
}: UseReelPreloaderProps) {
  const preloadedRefs = useRef<Set<string>>(new Set());
  const preloadQueue = useRef<string[]>([]);
  const isPreloading = useRef(false);

  // Determine which reels to preload
  const getPreloadList = useCallback(() => {
    const toPreload: string[] = [];
    
    // Current reel (highest priority)
    if (reels[currentIndex]) {
      toPreload.push(reels[currentIndex].id);
    }
    
    // Next 2 reels
    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (reels[nextIndex]) {
        toPreload.push(reels[nextIndex].id);
      }
    }
    
    // Previous 2 reels
    for (let i = 1; i <= 2; i++) {
      const prevIndex = currentIndex - i;
      if (reels[prevIndex]) {
        toPreload.push(reels[prevIndex].id);
      }
    }
    
    // Filter out already preloaded
    return toPreload.filter(id => !preloadedRefs.current.has(id));
  }, [reels, currentIndex]);

  // Preload a single reel
  const preloadReel = useCallback(async (reel: Reel) => {
    if (preloadedRefs.current.has(reel.id)) {
      return;
    }

    try {
      console.log(`[Preloader] Starting preload: ${reel.id}`);
      
      // This would trigger your segment fetching
      // The actual implementation depends on your video player
      // For now, we'll just mark it as preloaded after a small delay
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      preloadedRefs.current.add(reel.id);
      onPreloaded(reel.id);
      
      console.log(`[Preloader] Completed: ${reel.id}`);
    } catch (error) {