// hooks/usePlaybackPosition.ts
import { useEffect, useRef, useCallback } from "react";

interface PlaybackPositionData {
  videoId: string;
  currentTime: number;
  duration: number;
  timestamp: number;
  quality?: string;
}

const STORAGE_KEY_PREFIX = "playback_position_";
const SAVE_INTERVAL = 5000;
const RESUME_THRESHOLD = 0.95;
const MIN_RESUME_TIME = 5;

export function usePlaybackPosition(videoId: string) {
  const saveIntervalRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  const getStorageKey = useCallback((id: string) => {
    return `${STORAGE_KEY_PREFIX}${id}`;
  }, []);

  // Get saved position for a video
  const getSavedPosition = useCallback(
    (id: string): PlaybackPositionData | null => {
      try {
        const stored = localStorage.getItem(getStorageKey(id));
        if (stored) {
          const data: PlaybackPositionData = JSON.parse(stored);

          if (data.duration > 0) {
            const watchedPercentage = data.currentTime / data.duration;
            if (watchedPercentage >= RESUME_THRESHOLD) {
              return null;
            }
          }

          if (data.currentTime < MIN_RESUME_TIME) {
            return null;
          }

          return data;
        }
      } catch (error) {
        console.error("Error reading playback position:", error);
      }
      return null;
    },
    [getStorageKey]
  );

  // Save current position
  const savePosition = useCallback(
    (id: string, currentTime: number, duration: number, quality?: string) => {
      try {
        const now = Date.now();
        if (now - lastSaveTimeRef.current < 1000) {
          return;
        }
        lastSaveTimeRef.current = now;

        const data: PlaybackPositionData = {
          videoId: id,
          currentTime,
          duration,
          timestamp: now,
          quality,
        };

        localStorage.setItem(getStorageKey(id), JSON.stringify(data));
      } catch (error) {
        console.error("Error saving playback position:", error);
      }
    },
    [getStorageKey]
  );

  // Clear saved position
  const clearPosition = useCallback(
    (id: string) => {
      try {
        localStorage.removeItem(getStorageKey(id));
      } catch (error) {
        console.error("Error clearing playback position:", error);
      }
    },
    [getStorageKey]
  );

  // Get all saved positions
  const getAllPositions = useCallback((): PlaybackPositionData[] => {
    try {
      const positions: PlaybackPositionData[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            positions.push(JSON.parse(stored));
          }
        }
      }
      return positions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error getting all positions:", error);
      return [];
    }
  }, []);

  // Clear old positions (older than 30 days)
  const clearOldPositions = useCallback(() => {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: PlaybackPositionData = JSON.parse(stored);
            if (data.timestamp < thirtyDaysAgo) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error clearing old positions:", error);
    }
  }, []);

  // Setup auto-save interval - UPDATED TO ACCEPT NULLABLE REF
  const startAutoSave = useCallback(
    (
      videoRef: React.RefObject<HTMLVideoElement | null>, // Accept null now
      id: string,
      getCurrentQuality?: () => string
    ) => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }

      saveIntervalRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (video && !video.paused && !video.ended) {
          savePosition(
            id,
            video.currentTime,
            video.duration,
            getCurrentQuality?.()
          );
        }
      }, SAVE_INTERVAL);
    },
    [savePosition]
  );

  // Stop auto-save
  const stopAutoSave = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    clearOldPositions();

    return () => {
      stopAutoSave();
    };
  }, [clearOldPositions, stopAutoSave]);

  return {
    getSavedPosition,
    savePosition,
    clearPosition,
    getAllPositions,
    clearOldPositions,
    startAutoSave, // Now this matches the expected type
    stopAutoSave,
  };
}
