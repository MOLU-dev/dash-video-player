// hooks/reels/useVirtualReelManager.ts
import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Reel,
  VirtualReelSlot,
  RecycledPlayerState,
} from "../../../../src/types/reel.types";

interface UseVirtualReelManagerProps {
  reels: Reel[];
  initialIndex?: number;
}

// hooks/reels/useVirtualReelManager.ts
export function useVirtualReelManager({
  reels,
  initialIndex = 0,
}: UseVirtualReelManagerProps) {
  const [currentReelIndex, setCurrentReelIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionLockRef = useRef(false);

  // Calculate virtual slots - FIXED LOGIC
  const getVirtualSlots = useCallback(
    (centerIndex: number): VirtualReelSlot[] => {
      const slots: VirtualReelSlot[] = [];

      // Previous slot (if exists)
      if (centerIndex > 0) {
        slots.push({
          slotIndex: 0,
          reelIndex: centerIndex - 1,
          reel: reels[centerIndex - 1],
          isActive: false,
          shouldPreload: true,
        });
      }

      // Current slot (ALWAYS ACTIVE)
      slots.push({
        slotIndex: slots.length,
        reelIndex: centerIndex,
        reel: reels[centerIndex],
        isActive: true,
        shouldPreload: false,
      });

      // Next slot (if exists)
      if (centerIndex < reels.length - 1) {
        slots.push({
          slotIndex: slots.length,
          reelIndex: centerIndex + 1,
          reel: reels[centerIndex + 1],
          isActive: false,
          shouldPreload: true,
        });
      }

      return slots;
    },
    [reels]
  );

  const [virtualSlots, setVirtualSlots] = useState<VirtualReelSlot[]>(() =>
    getVirtualSlots(initialIndex)
  );

  // Move to next reel - IMPROVED TRANSITION
  const goToNext = useCallback(async () => {
    if (
      currentReelIndex >= reels.length - 1 ||
      isTransitioning ||
      transitionLockRef.current
    ) {
      return;
    }

    transitionLockRef.current = true;
    setIsTransitioning(true);

    const nextIndex = currentReelIndex + 1;
    console.log(`[VIRTUAL] Moving to next: ${nextIndex}`);

    // Update slots first to ensure proper active state
    setVirtualSlots(getVirtualSlots(nextIndex));

    // Then update current index
    setCurrentReelIndex(nextIndex);

    setTimeout(() => {
      setIsTransitioning(false);
      transitionLockRef.current = false;
    }, 300);
  }, [currentReelIndex, reels.length, isTransitioning, getVirtualSlots]);

  // Move to previous reel - IMPROVED TRANSITION
  const goToPrevious = useCallback(async () => {
    if (currentReelIndex <= 0 || isTransitioning || transitionLockRef.current) {
      return;
    }

    transitionLockRef.current = true;
    setIsTransitioning(true);

    const prevIndex = currentReelIndex - 1;
    console.log(`[VIRTUAL] Moving to previous: ${prevIndex}`);

    // Update slots first to ensure proper active state
    setVirtualSlots(getVirtualSlots(prevIndex));

    // Then update current index
    setCurrentReelIndex(prevIndex);

    setTimeout(() => {
      setIsTransitioning(false);
      transitionLockRef.current = false;
    }, 300);
  }, [currentReelIndex, isTransitioning, getVirtualSlots]);

  return {
    currentReelIndex,
    currentReel: reels[currentReelIndex],
    virtualSlots,
    isTransitioning,
    goToNext,
    goToPrevious,
    hasNext: currentReelIndex < reels.length - 1,
    hasPrevious: currentReelIndex > 0,
    totalReels: reels.length,
  };
}
