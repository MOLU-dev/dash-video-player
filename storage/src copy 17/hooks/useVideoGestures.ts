import { useRef, useCallback, useEffect, useState } from "react";

interface GestureHandlers {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSwipeVertical: (
    direction: "up" | "down",
    side: "left" | "right",
    delta: number
  ) => void;
  onVolumeChange?: (delta: number) => void;
  onBrightnessChange?: (delta: number) => void;
}

export function useVideoGestures({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSwipeVertical,
  onVolumeChange,
  onBrightnessChange,
}: GestureHandlers) {
  const [gestureIndicator, setGestureIndicator] = useState<{
    type: "seek" | "brightness" | "volume";
    value: number;
    side?: "left" | "right";
  } | null>(null);

  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    initialValue?: number;
  } | null>(null);
  const mouseDownRef = useRef<{
    x: number;
    y: number;
    time: number;
    initialValue?: number;
  } | null>(null);
  const isSwipingRef = useRef(false);

  // timeouts as browser numbers
  const indicatorTimeoutRef = useRef<number | null>(null);

  // --- NEW: accumulation refs for seek ---
  const accumulatedSeekRef = useRef<{
    amount: number;
    side: "left" | "right";
  } | null>(null);
  const seekAccumulationTimeoutRef = useRef<number | null>(null);
  const SEEK_ACCUMULATION_WINDOW = 800; // milliseconds

  // Keep a last-known brightness/volume value (0..100)
  const currentValueRef = useRef<{ brightness: number; volume: number }>({
    brightness: 50,
    volume: 50,
  });

  const DOUBLE_TAP_DELAY = 300; // ms
  const SWIPE_THRESHOLD = 30; // pixels
  const TAP_THRESHOLD = 10; // pixels
  const MOUSE_DRAG_THRESHOLD = 5; // pixels

  const showIndicator = useCallback(
    (
      type: "seek" | "brightness" | "volume",
      value: number,
      side?: "left" | "right"
    ) => {
      setGestureIndicator({ type, value, side });

      if (indicatorTimeoutRef.current) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }

      indicatorTimeoutRef.current = window.setTimeout(() => {
        setGestureIndicator(null);
      }, 800);
    },
    []
  );

  // ===== NEW: accumulateSeek helper =====
  const accumulateSeek = useCallback(
    (side: "left" | "right", amount: number) => {
      // amount: signed seconds (e.g. -10 or +10)
      if (seekAccumulationTimeoutRef.current) {
        window.clearTimeout(seekAccumulationTimeoutRef.current);
      }

      if (
        accumulatedSeekRef.current &&
        accumulatedSeekRef.current.side === side
      ) {
        accumulatedSeekRef.current.amount += amount;
      } else {
        accumulatedSeekRef.current = { amount, side };
      }

      const total = accumulatedSeekRef.current.amount;

      // update indicator showing the cumulative amount
      showIndicator("seek", total, side);

      // reset accumulation after window expires
      seekAccumulationTimeoutRef.current = window.setTimeout(() => {
        accumulatedSeekRef.current = null;
      }, SEEK_ACCUMULATION_WINDOW);

      return total;
    },
    [showIndicator]
  );

  // ===== MOBILE TOUCH GESTURES =====
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const side = touch.clientX < rect.left + rect.width / 2 ? "left" : "right";

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      initialValue:
        side === "left"
          ? currentValueRef.current.brightness
          : currentValueRef.current.volume,
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
        if (!isSwipingRef.current) isSwipingRef.current = true;
        e.preventDefault();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const side =
          touchStartRef.current.x < rect.left + rect.width / 2
            ? "left"
            : "right";

        // map vertical delta to percent relative to max distance
        const maxSwipeDistance = rect.height * 0.8;
        const swipePercent = Math.max(
          -1,
          Math.min(1, -deltaY / maxSwipeDistance)
        ); // -1..1
        const initial = touchStartRef.current.initialValue ?? 50;
        const newValue = Math.max(
          0,
          Math.min(100, initial + swipePercent * 100)
        );

        if (side === "left") {
          currentValueRef.current.brightness = newValue;
          const deltaFraction = (newValue - initial) / 100;
          onBrightnessChange?.(deltaFraction);
          showIndicator("brightness", newValue, "left");
        } else {
          currentValueRef.current.volume = newValue;
          const deltaFraction = (newValue - initial) / 100;
          onVolumeChange?.(deltaFraction);
          showIndicator("volume", newValue, "right");
        }

        onSwipeVertical(deltaY < 0 ? "up" : "down", side, Math.abs(deltaY));
      }
    },
    [onSwipeVertical, onVolumeChange, onBrightnessChange, showIndicator]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // Check if it's a tap (minimal movement)
      if (
        deltaX < TAP_THRESHOLD &&
        deltaY < TAP_THRESHOLD &&
        !isSwipingRef.current
      ) {
        const now = Date.now();
        const x = touch.clientX;

        // Double-tap detection
        if (
          lastTapRef.current &&
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
          Math.abs(x - lastTapRef.current.x) < 50
        ) {
          e.preventDefault();
          const target = e.target as HTMLElement;
          const rect = target.getBoundingClientRect();
          const isLeftSide = x < rect.left + rect.width / 2;

          if (isLeftSide) onDoubleTapLeft();
          else onDoubleTapRight();

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

  // ===== DESKTOP MOUSE GESTURES =====
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

      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const side = e.clientX < rect.left + rect.width / 2 ? "left" : "right";

      mouseDownRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        initialValue:
          side === "left"
            ? currentValueRef.current.brightness
            : currentValueRef.current.volume,
      };
    },
    [onDoubleTapLeft, onDoubleTapRight]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!mouseDownRef.current || e.buttons !== 1) return;

      const deltaY = e.clientY - mouseDownRef.current.y;

      if (Math.abs(deltaY) > MOUSE_DRAG_THRESHOLD) {
        e.preventDefault();

        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const side =
          mouseDownRef.current.x < rect.left + rect.width / 2
            ? "left"
            : "right";

        const maxSwipeDistance = rect.height * 0.8;
        const swipePercent = Math.max(
          -1,
          Math.min(1, -deltaY / maxSwipeDistance)
        );
        const initial = mouseDownRef.current.initialValue ?? 50;
        const newValue = Math.max(
          0,
          Math.min(100, initial + swipePercent * 100)
        );

        if (side === "left") {
          currentValueRef.current.brightness = newValue;
          const deltaFraction = (newValue - initial) / 100;
          onBrightnessChange?.(deltaFraction);
          showIndicator("brightness", newValue, "left");
        } else {
          currentValueRef.current.volume = newValue;
          const deltaFraction = (newValue - initial) / 100;
          onVolumeChange?.(deltaFraction);
          showIndicator("volume", newValue, "right");
        }

        onSwipeVertical(deltaY < 0 ? "up" : "down", side, Math.abs(deltaY));
      }
    },
    [onSwipeVertical, onVolumeChange, onBrightnessChange, showIndicator]
  );

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = null;
  }, []);

  // ===== WHEEL (desktop) =====
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const side = e.clientX < rect.left + rect.width / 2 ? "left" : "right";

      const step = 5;
      if (side === "left" && onBrightnessChange) {
        const initial = currentValueRef.current.brightness;
        const newValue = Math.max(
          0,
          Math.min(100, initial + (e.deltaY < 0 ? step : -step))
        );
        currentValueRef.current.brightness = newValue;
        onBrightnessChange((newValue - initial) / 100);
        showIndicator("brightness", newValue, "left");
      } else if (side === "right" && onVolumeChange) {
        const initial = currentValueRef.current.volume;
        const newValue = Math.max(
          0,
          Math.min(100, initial + (e.deltaY < 0 ? step : -step))
        );
        currentValueRef.current.volume = newValue;
        onVolumeChange((newValue - initial) / 100);
        showIndicator("volume", newValue, "right");
      }
    },
    [onVolumeChange, onBrightnessChange, showIndicator]
  );

  // ===== KEYBOARD SHORTCUTS =====
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && onVolumeChange) {
        e.preventDefault();
        const initial = currentValueRef.current.volume;
        const newValue = Math.min(100, initial + 10);
        currentValueRef.current.volume = newValue;
        onVolumeChange((newValue - initial) / 100);
        showIndicator("volume", newValue, "right");
      } else if (e.key === "ArrowDown" && onVolumeChange) {
        e.preventDefault();
        const initial = currentValueRef.current.volume;
        const newValue = Math.max(0, initial - 10);
        currentValueRef.current.volume = newValue;
        onVolumeChange((newValue - initial) / 100);
        showIndicator("volume", newValue, "right");
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "ArrowUp" &&
        onBrightnessChange
      ) {
        e.preventDefault();
        const initial = currentValueRef.current.brightness;
        const newValue = Math.min(100, initial + 10);
        currentValueRef.current.brightness = newValue;
        onBrightnessChange((newValue - initial) / 100);
        showIndicator("brightness", newValue, "left");
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "ArrowDown" &&
        onBrightnessChange
      ) {
        e.preventDefault();
        const initial = currentValueRef.current.brightness;
        const newValue = Math.max(0, initial - 10);
        currentValueRef.current.brightness = newValue;
        onBrightnessChange((newValue - initial) / 100);
        showIndicator("brightness", newValue, "left");
      }
    },
    [onVolumeChange, onBrightnessChange, showIndicator]
  );

  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }
      if (seekAccumulationTimeoutRef.current) {
        window.clearTimeout(seekAccumulationTimeoutRef.current);
      }
    };
  }, []);

  return {
    gestureIndicator,
    showIndicator,
    accumulateSeek, // <-- new export
    // Mobile
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Desktop
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
  };
}
