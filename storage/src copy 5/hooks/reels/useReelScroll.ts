// hooks/reels/useReelScroll.ts
import { useEffect, useRef, useCallback } from "react";

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

  const handleScroll = useCallback(
    (deltaY: number) => {
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
    },
    [onNext, onPrevious, isTransitioning]
  );

  // Wheel event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleScroll(e.deltaY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
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

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrevious]);

  return { containerRef };
}
