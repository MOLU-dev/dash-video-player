// // hooks/useVideoGestures.ts
// import { useRef, useCallback, useEffect, useState } from "react";

// interface GestureHandlers {
//   onDoubleTapLeft: () => void;
//   onDoubleTapRight: () => void;
//   onSwipeVertical: (
//     direction: "up" | "down",
//     side: "left" | "right",
//     delta: number
//   ) => void;
// }

// export function useVideoGestures({
//   onDoubleTapLeft,
//   onDoubleTapRight,
//   onSwipeVertical,
// }: GestureHandlers) {
//   const [gestureIndicator, setGestureIndicator] = useState<{
//     type: "seek" | "brightness" | "volume";
//     value: number;
//     side?: "left" | "right";
//   } | null>(null);

//   const lastTapRef = useRef<{ time: number; x: number } | null>(null);
//   const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
//     null
//   );
//   const isSwipingRef = useRef(false);
//   const indicatorTimeoutRef = useRef<NodeJS.Timeout>();

//   const DOUBLE_TAP_DELAY = 300; // ms
//   const SWIPE_THRESHOLD = 30; // pixels
//   const TAP_THRESHOLD = 10; // pixels - maximum movement for a tap

//   const showIndicator = useCallback(
//     (
//       type: "seek" | "brightness" | "volume",
//       value: number,
//       side?: "left" | "right"
//     ) => {
//       setGestureIndicator({ type, value, side });

//       if (indicatorTimeoutRef.current) {
//         clearTimeout(indicatorTimeoutRef.current);
//       }

//       indicatorTimeoutRef.current = setTimeout(() => {
//         setGestureIndicator(null);
//       }, 800);
//     },
//     []
//   );

//   const handleTouchStart = useCallback((e: TouchEvent) => {
//     if (e.touches.length !== 1) return;

//     const touch = e.touches[0];
//     touchStartRef.current = {
//       x: touch.clientX,
//       y: touch.clientY,
//       time: Date.now(),
//     };
//     isSwipingRef.current = false;
//   }, []);

//   const handleTouchMove = useCallback(
//     (e: TouchEvent) => {
//       if (!touchStartRef.current || e.touches.length !== 1) return;

//       const touch = e.touches[0];
//       const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
//       const deltaY = touch.clientY - touchStartRef.current.y;

//       // Detect vertical swipe
//       if (Math.abs(deltaY) > SWIPE_THRESHOLD && deltaX < SWIPE_THRESHOLD) {
//         if (!isSwipingRef.current) {
//           isSwipingRef.current = true;
//         }

//         e.preventDefault();

//         const target = e.target as HTMLElement;
//         const rect = target.getBoundingClientRect();
//         const side =
//           touch.clientX < rect.left + rect.width / 2 ? "left" : "right";
//         const direction = deltaY < 0 ? "up" : "down";

//         onSwipeVertical(direction, side, Math.abs(deltaY));
//       }
//     },
//     [onSwipeVertical]
//   );

//   const handleTouchEnd = useCallback(
//     (e: TouchEvent) => {
//       if (!touchStartRef.current) return;

//       const touch = e.changedTouches[0];
//       const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
//       const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
//       const timeDelta = Date.now() - touchStartRef.current.time;

//       // Check if it's a tap (minimal movement)
//       if (
//         deltaX < TAP_THRESHOLD &&
//         deltaY < TAP_THRESHOLD &&
//         !isSwipingRef.current
//       ) {
//         const now = Date.now();
//         const x = touch.clientX;

//         // Check for double tap
//         if (
//           lastTapRef.current &&
//           now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
//           Math.abs(x - lastTapRef.current.x) < 50
//         ) {
//           e.preventDefault();

//           const target = e.target as HTMLElement;
//           const rect = target.getBoundingClientRect();
//           const isLeftSide = x < rect.left + rect.width / 2;

//           if (isLeftSide) {
//             onDoubleTapLeft();
//           } else {
//             onDoubleTapRight();
//           }

//           lastTapRef.current = null;
//         } else {
//           lastTapRef.current = { time: now, x };
//         }
//       }

//       touchStartRef.current = null;
//       isSwipingRef.current = false;
//     },
//     [onDoubleTapLeft, onDoubleTapRight]
//   );

//   const handleMouseDown = useCallback(
//     (e: MouseEvent) => {
//       const now = Date.now();
//       const x = e.clientX;

//       if (
//         lastTapRef.current &&
//         now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
//         Math.abs(x - lastTapRef.current.x) < 50
//       ) {
//         e.preventDefault();

//         const target = e.target as HTMLElement;
//         const rect = target.getBoundingClientRect();
//         const isLeftSide = x < rect.left + rect.width / 2;

//         if (isLeftSide) {
//           onDoubleTapLeft();
//         } else {
//           onDoubleTapRight();
//         }

//         lastTapRef.current = null;
//       } else {
//         lastTapRef.current = { time: now, x };
//       }
//     },
//     [onDoubleTapLeft, onDoubleTapRight]
//   );

//   useEffect(() => {
//     return () => {
//       if (indicatorTimeoutRef.current) {
//         clearTimeout(indicatorTimeoutRef.current);
//       }
//     };
//   }, []);

//   return {
//     gestureIndicator,
//     showIndicator,
//     handleTouchStart,
//     handleTouchMove,
//     handleTouchEnd,
//     handleMouseDown,
//   };
// }


// hooks/useVideoGestures.ts
import { useRef, useCallback, useEffect, useState } from 'react';

interface GestureHandlers {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSwipeVertical: (direction: 'up' | 'down', side: 'left' | 'right', delta: number) => void;
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
    type: 'seek' | 'brightness' | 'volume';
    value: number;
    side?: 'left' | 'right';
  } | null>(null);
  
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout>(null);

  const DOUBLE_TAP_DELAY = 300; // ms
  const SWIPE_THRESHOLD = 30; // pixels
  const TAP_THRESHOLD = 10; // pixels
  const MOUSE_DRAG_THRESHOLD = 5; // pixels

  const showIndicator = useCallback((
    type: 'seek' | 'brightness' | 'volume',
    value: number,
    side?: 'left' | 'right'
  ) => {
    setGestureIndicator({ type, value, side });
    
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    
    indicatorTimeoutRef.current = setTimeout(() => {
      setGestureIndicator(null);
    }, 800);
  }, []);

  // ===== MOBILE TOUCH GESTURES =====
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

  const handleTouchMove = useCallback((e: TouchEvent) => {
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
      const side = touch.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
      const direction = deltaY < 0 ? 'up' : 'down';
      
      onSwipeVertical(direction, side, Math.abs(deltaY));
      
      // Show visual feedback
      const value = Math.min(100, Math.max(0, 50 + (deltaY / 2)));
      showIndicator(side === 'left' ? 'brightness' : 'volume', value, side);
    }
  }, [onSwipeVertical, showIndicator]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const timeDelta = Date.now() - touchStartRef.current.time;
    
    // Check if it's a tap (minimal movement)
    if (deltaX < TAP_THRESHOLD && deltaY < TAP_THRESHOLD && !isSwipingRef.current) {
      const now = Date.now();
      const x = touch.clientX;
      
      // Check for double tap
      if (lastTapRef.current && 
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
          Math.abs(x - lastTapRef.current.x) < 50) {
        
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
  }, [onDoubleTapLeft, onDoubleTapRight]);

  // ===== DESKTOP MOUSE GESTURES =====
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // For double click detection
    const now = Date.now();
    const x = e.clientX;
    
    if (lastTapRef.current && 
        now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
        Math.abs(x - lastTapRef.current.x) < 50) {
      
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

    // For click-and-drag volume/brightness control
    mouseDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  }, [onDoubleTapLeft, onDoubleTapRight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!mouseDownRef.current || e.buttons !== 1) return; // Only if left mouse button is held
    
    const deltaY = e.clientY - mouseDownRef.current.y;
    
    if (Math.abs(deltaY) > MOUSE_DRAG_THRESHOLD) {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
      const direction = deltaY < 0 ? 'up' : 'down';
      
      onSwipeVertical(direction, side, Math.abs(deltaY));
      
      // Show visual feedback
      const value = Math.min(100, Math.max(0, 50 + (deltaY / 2)));
      showIndicator(side === 'left' ? 'brightness' : 'volume', value, side);
    }
  }, [onSwipeVertical, showIndicator]);

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = null;
  }, []);

  // ===== DESKTOP WHEEL GESTURES =====
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    const direction = e.deltaY < 0 ? 'up' : 'down';
    
    // Use wheel for volume/brightness control
    if (side === 'left' && onBrightnessChange) {
      const delta = direction === 'up' ? 0.1 : -0.1;
      onBrightnessChange(delta);
      showIndicator('brightness', 50 + (delta * 50), 'left');
    } else if (side === 'right' && onVolumeChange) {
      const delta = direction === 'up' ? 0.1 : -0.1;
      onVolumeChange(delta);
      showIndicator('volume', 50 + (delta * 50), 'right');
    }
  }, [onVolumeChange, onBrightnessChange, showIndicator]);

  // ===== KEYBOARD SHORTCUTS =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Volume controls
    if (e.key === 'ArrowUp' && onVolumeChange) {
      e.preventDefault();
      onVolumeChange(0.1);
      showIndicator('volume', 75, 'right');
    } else if (e.key === 'ArrowDown' && onVolumeChange) {
      e.preventDefault();
      onVolumeChange(-0.1);
      showIndicator('volume', 25, 'right');
    }
    
    // Brightness controls (with modifier key)
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp' && onBrightnessChange) {
      e.preventDefault();
      onBrightnessChange(0.1);
      showIndicator('brightness', 75, 'left');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown' && onBrightnessChange) {
      e.preventDefault();
      onBrightnessChange(-0.1);
      showIndicator('brightness', 25, 'left');
    }
  }, [onVolumeChange, onBrightnessChange, showIndicator]);

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