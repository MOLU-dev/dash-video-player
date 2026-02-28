import { useEffect, useRef, useCallback } from "react";
import type { Reel } from "../../../../src/types/reel.types";

interface UseReelPreloaderProps {
  reels: Reel[];
  currentIndex: number;
  onPreloaded: (reelId: string) => void;
  onPreloadFailed?: (reelId: string, error: Error) => void;
}

export function useReelPreloader({
  reels,
  currentIndex,
  onPreloaded,
  onPreloadFailed,
}: UseReelPreloaderProps) {
  const preloadedRefs = useRef<Set<string>>(new Set());
  const preloadQueue = useRef<string[]>([]);
  const isPreloading = useRef(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Determine which reels to preload
  const getPreloadList = useCallback(() => {
    const toPreload: string[] = [];

    // Current reel (highest priority)
    if (reels[currentIndex]) {
      toPreload.push(reels[currentIndex].id);
    }

    // Next 2 reels (high priority)
    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (reels[nextIndex]) {
        toPreload.push(reels[nextIndex].id);
      }
    }

    // Previous 2 reels (medium priority - for back navigation)
    for (let i = 1; i <= 2; i++) {
      const prevIndex = currentIndex - i;
      if (reels[prevIndex]) {
        toPreload.push(reels[prevIndex].id);
      }
    }

    // Filter out already preloaded
    return toPreload.filter((id) => !preloadedRefs.current.has(id));
  }, [reels, currentIndex]);

  // Preload a single reel
  const preloadReel = useCallback(
    async (reel: Reel) => {
      if (preloadedRefs.current.has(reel.id)) {
        return;
      }

      const controller = new AbortController();
      abortControllersRef.current.set(reel.id, controller);

      try {
        console.log(`[Preloader] Starting preload: ${reel.id}`);

        // Calculate priority based on distance from current
        const reelIndex = reels.findIndex((r) => r.id === reel.id);
        const distance = Math.abs(reelIndex - currentIndex);

        // Adjust quality based on distance
        let quality = "auto";
        if (distance === 1) quality = "720p";
        if (distance >= 2) quality = "480p";

        // Simulate preloading (in real implementation, this would trigger segment fetching)
        // You would call your video player's preload method here
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 500); // Simulate network delay

          controller.signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Preload aborted", "AbortError"));
          });
        });

        if (controller.signal.aborted) {
          throw new DOMException("Preload aborted", "AbortError");
        }

        preloadedRefs.current.add(reel.id);
        onPreloaded(reel.id);

        console.log(`[Preloader] Completed: ${reel.id} (quality: ${quality})`);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(`[Preloader] Failed to preload ${reel.id}:`, error);
          if (onPreloadFailed) {
            onPreloadFailed(reel.id, error as Error);
          }
        }
      } finally {
        abortControllersRef.current.delete(reel.id);
      }
    },
    [reels, currentIndex, onPreloaded, onPreloadFailed]
  );

  // Process preload queue
  const processQueue = useCallback(async () => {
    if (isPreloading.current || preloadQueue.current.length === 0) {
      return;
    }

    isPreloading.current = true;

    while (preloadQueue.current.length > 0) {
      const reelId = preloadQueue.current.shift();
      const reel = reels.find((r) => r.id === reelId);

      if (reel && !preloadedRefs.current.has(reelId)) {
        await preloadReel(reel);
      }
    }

    isPreloading.current = false;
  }, [reels, preloadReel]);

  // Cancel preload for specific reel
  const cancelPreload = useCallback((reelId: string) => {
    const controller = abortControllersRef.current.get(reelId);
    if (controller) {
      console.log(`[Preloader] Cancelling: ${reelId}`);
      controller.abort();
      abortControllersRef.current.delete(reelId);
    }
  }, []);

  // Cancel all ongoing preloads
  const cancelAllPreloads = useCallback(() => {
    console.log("[Preloader] Cancelling all preloads");
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    preloadQueue.current = [];
  }, []);

  // Update preload queue when current index changes
  useEffect(() => {
    const toPreload = getPreloadList();

    // Clear queue and add new items
    preloadQueue.current = toPreload;

    // Start processing
    processQueue();
  }, [currentIndex, getPreloadList, processQueue]);

  // Cleanup old preloaded reels outside the window
  useEffect(() => {
    const cleanup = () => {
      const validIds = new Set(getPreloadList());

      // Add reels in the current window
      for (let i = -2; i <= 2; i++) {
        const index = currentIndex + i;
        if (reels[index]) {
          validIds.add(reels[index].id);
        }
      }

      // Remove preloaded reels outside the window
      preloadedRefs.current.forEach((id) => {
        if (!validIds.has(id)) {
          console.log(`[Preloader] Cleaning up: ${id}`);
          preloadedRefs.current.delete(id);
          cancelPreload(id);
        }
      });
    };

    cleanup();
  }, [currentIndex, reels, getPreloadList, cancelPreload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllPreloads();
    };
  }, [cancelAllPreloads]);

  return {
    isPreloaded: (reelId: string) => preloadedRefs.current.has(reelId),
    preloadedCount: preloadedRefs.current.size,
    cancelPreload,
    cancelAllPreloads,
    getPreloadStatus: () => ({
      preloaded: Array.from(preloadedRefs.current),
      queue: [...preloadQueue.current],
      processing: isPreloading.current,
    }),
  };
}
