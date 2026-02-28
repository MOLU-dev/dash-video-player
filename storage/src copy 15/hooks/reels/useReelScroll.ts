// hooks/reels/useReelScroll.ts

"use client"
import React, { useEffect, useRef, useCallback } from "react";

interface UseReelScrollProps {
  onNext: () => void;
  onPrevious: () => void;
  isTransitioning: boolean;
  enabled?: boolean;
}

export function useReelScroll({
  onNext,
  onPrevious,
  isTransitioning,
  enabled = true,
}: UseReelScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastScrollTime = useRef(0);
  const scrollThreshold = 50; // pixels
  const scrollCooldown = 500; // ms
  const swipeVelocityThreshold = 0.3; // pixels per ms

  const handleScroll = useCallback(
    (deltaY: number, velocity?: number) => {
      if (!enabled || isTransitioning) return;

      const now = Date.now();
      if (now - lastScrollTime.current < scrollCooldown) return;

      // Check if it's a deliberate swipe (either distance or velocity)
      const isDeliberateSwipe =
        Math.abs(deltaY) >= scrollThreshold ||
        (velocity && Math.abs(velocity) >= swipeVelocityThreshold);

      if (!isDeliberateSwipe) return;

      lastScrollTime.current = now;

      if (deltaY > 0) {
        // Scroll down - next reel
        onNext();
      } else {
        // Scroll up - previous reel
        onPrevious();
      }
    },
    [onNext, onPrevious, isTransitioning, enabled]
  );

  // Wheel event (desktop)
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleScroll(e.deltaY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleScroll, enabled]);

  // Touch events (mobile)
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();

      const deltaY = touchStartY.current - touchEndY;
      const deltaTime = touchEndTime - touchStartTime.current;
      const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;

      handleScroll(deltaY, velocity);
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleScroll, enabled]);

  // Keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrevious, enabled]);

  return { containerRef };
}
