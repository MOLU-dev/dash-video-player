// hooks/useVideoGestures.ts
import { useRef, useCallback, useEffect, useState } from "react";

interface GestureHandlers {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSwipeVertical: (
    direction: "up" | "down",
    side: "left" | "right",
    delta: number
  ) => void;
}

export function useVideoGestures({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSwipeVertical,
}: GestureHandlers) {
  const [gestureIndicator, setGestureIndicator] = useState<{
    type: "seek" | "brightness" | "volume";
    value: number;
    side?: "left" | "right";
  } | null>(null);

  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const isSwipingRef = useRef(false);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout>();

  const DOUBLE_TAP_DELAY = 300; // ms
  const SWIPE_THRESHOLD = 30; // pixels
  const TAP_THRESHOLD = 10; // pixels - maximum movement for a tap

  const showIndicator = useCallback(
    (
      type: "seek" | "brightness" | "volume",
      value: number,
      side?: "left" | "right"
    ) => {
      setGestureIndicator({ type, value, side });

      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }

      indicatorTimeoutRef.current = setTimeout(() => {
        setGestureIndicator(null);
      }, 800);
    },
    []
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Detect vertical swipe
      if (Math.abs(deltaY) > SWIPE_THRESHOLD && deltaX < SWIPE_THRESHOLD) {
        if (!isSwipingRef.current) {
          isSwipingRef.current = true;
        }

        e.preventDefault();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const side =
          touch.clientX < rect.left + rect.width / 2 ? "left" : "right";
        const direction = deltaY < 0 ? "up" : "down";

        onSwipeVertical(direction, side, Math.abs(deltaY));
      }
    },
    [onSwipeVertical]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const timeDelta = Date.now() - touchStartRef.current.time;

      // Check if it's a tap (minimal movement)
      if (
        deltaX < TAP_THRESHOLD &&
        deltaY < TAP_THRESHOLD &&
        !isSwipingRef.current
      ) {
        const now = Date.now();
        const x = touch.clientX;

        // Check for double tap
        if (
          lastTapRef.current &&
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
          Math.abs(x - lastTapRef.current.x) < 50
        ) {
          e.preventDefault();

          const target = e.target as HTMLElement;
          const rect = target.getBoundingClientRect();
          const isLeftSide = x < rect.left + rect.width / 2;

          if (isLeftSide) {
            onDoubleTapLeft();
          } else {
            onDoubleTapRight();
          }

          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, x };
        }
      }

      touchStartRef.current = null;
      isSwipingRef.current = false;
    },
    [onDoubleTapLeft, onDoubleTapRight]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const now = Date.now();
      const x = e.clientX;

      if (
        lastTapRef.current &&
        now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
        Math.abs(x - lastTapRef.current.x) < 50
      ) {
        e.preventDefault();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const isLeftSide = x < rect.left + rect.width / 2;

        if (isLeftSide) {
          onDoubleTapLeft();
        } else {
          onDoubleTapRight();
        }

        lastTapRef.current = null;
      } else {
        lastTapRef.current = { time: now, x };
      }
    },
    [onDoubleTapLeft, onDoubleTapRight]
  );

  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  return {
    gestureIndicator,
    showIndicator,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
  };
}
