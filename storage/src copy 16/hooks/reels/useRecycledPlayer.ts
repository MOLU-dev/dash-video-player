// hooks/reels/useRecycledPlayer.ts
import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { useGrpcPlayer } from "../../../../src copy 13/hooks/index";
import type {
  Reel,
  ReelPlayerController,
} from "../../../../src copy 13/types/reel.types";

export function useRecycledPlayer(slotIndex: number) {
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);
  const isSwitchingRef = useRef(false);

  const player = useGrpcPlayer({
    videoId: currentVideoId ?? "",
    autoInitialize: false,
    disableAutoPlay: true,
  });

  // keep the ref in sync with state for polling from async functions
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // Helper: wait until the player reports ready (manualInitialize finished)
  const waitForReady = useCallback(
    (timeoutMs = 5000): Promise<void> =>
      new Promise((resolve, reject) => {
        const start = Date.now();

        const check = () => {
          const video = player.videoRef.current;
          const readyByVideo = !!video && (video.readyState ?? 0) >= 2;
          if (isReadyRef.current || readyByVideo) {
            resolve();
            return;
          }

          if (Date.now() - start > timeoutMs) {
            reject(new Error("timeout waiting for player ready"));
            return;
          }

          setTimeout(check, 50);
        };

        check();
      }),
    [player.videoRef]
  );

  const switchToReel = useCallback(
    async (reel: Reel) => {
      if (isSwitchingRef.current) {
        console.warn(`Player ${slotIndex} already switching`);
        return;
      }

      if (!reel.videoId) {
        console.error(`Missing videoId for reel ${reel.id}`);
        return;
      }

      isSwitchingRef.current = true;
      setIsReady(false);

      try {
        const video = player.videoRef.current;
        if (video) {
          // Stop previous playback more aggressively
          try {
            video.pause();
          } catch (err) {
            /* ignore */
          }
          try {
            video.currentTime = 0;
          } catch (err) {
            /* ignore */
          }
          try {
            // Clearing src stops any network activity
            // Note: don't revoke object URLs here since we don't create them in this hook.
            video.src = "";
          } catch (err) {
            /* ignore */
          }
        }

        // Cleanup previous player resources if any
        if (currentVideoId) {
          try {
            player.cleanup();
          } catch (err) {
            console.warn(`Error during cleanup for slot ${slotIndex}:`, err);
          }
        }

        // IMPORTANT: set the new video id in state and let an effect react
        // to this state change and call manualInitialize(). Do NOT call
        // manualInitialize() directly here because the hook needs to be
        // recreated with the new videoId first.
        setCurrentVideoId(reel.videoId);

        // Wait for the effect (manualInitialize) to finish setting the player ready.
        try {
          await waitForReady(5000);
        } catch (err) {
          console.warn(
            `[RECYCLE] Slot ${slotIndex}: waitForReady timed out or errored:`,
            err
          );
          // Even on timeout we continue — caller can decide what to do.
        }
      } catch (err) {
        console.error(`Error switching player ${slotIndex}:`, err);
      } finally {
        isSwitchingRef.current = false;
      }
    },
    [slotIndex, currentVideoId, player, waitForReady]
  );

  // When currentVideoId changes, initialize the player (manualInitialize)
  useEffect(() => {
    let cancelled = false;
    if (!currentVideoId) {
      return;
    }

    (async () => {
      try {
        console.log(
          `[RECYCLE] Slot ${slotIndex}: manualInitialize for ${currentVideoId}`
        );
        await player.manualInitialize();
        if (cancelled) return;
        setIsReady(true);
        console.log(`[RECYCLE] Slot ${slotIndex}: ready for ${currentVideoId}`);
      } catch (err) {
        if (!cancelled) {
          console.error(
            `[RECYCLE] Slot ${slotIndex}: manualInitialize failed for ${currentVideoId}`,
            err
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVideoId, player, slotIndex]);

  const play = useCallback(async () => {
    const video = player.videoRef.current;
    if (video && isReadyRef.current) {
      try {
        await video.play();
      } catch (err) {
        console.error(`Error playing slot ${slotIndex}:`, err);
      }
    }
  }, [player.videoRef, slotIndex]);

  const pause = useCallback(() => {
    const video = player.videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (err) {
        console.warn(`Error pausing slot ${slotIndex}:`, err);
      }
    }
  }, [player.videoRef, slotIndex]);

  const reset = useCallback(() => {
    const video = player.videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (err) {
        /* ignore */
      }
      try {
        video.currentTime = 0;
      } catch (err) {
        /* ignore */
      }
    }
  }, [player.videoRef]);

  const getCurrentTime = useCallback(
    () => player.videoRef.current?.currentTime || 0,
    [player.videoRef]
  );

  const getDuration = useCallback(
    () => player.videoRef.current?.duration || 0,
    [player.videoRef]
  );

  const checkIsReady = useCallback(
    () => isReadyRef.current || (player.videoRef.current?.readyState ?? 0) >= 2,
    [player.videoRef]
  );

  const cleanup = useCallback(() => {
    try {
      player.cleanup();
    } catch (err) {
      console.warn(`cleanup error for slot ${slotIndex}:`, err);
    }
    setCurrentVideoId(null);
    setIsReady(false);
    isReadyRef.current = false;
  }, [player, slotIndex]);

  const controller: ReelPlayerController = useMemo(
    () => ({
      switchToReel,
      play,
      pause,
      reset,
      getCurrentTime,
      getDuration,
      isReady: checkIsReady,
      cleanup,
    }),
    [
      switchToReel,
      play,
      pause,
      reset,
      getCurrentTime,
      getDuration,
      checkIsReady,
      cleanup,
    ]
  );

  return { ...player, controller, currentVideoId, isReady, slotIndex };
}
