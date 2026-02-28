// components/ReelCarousel.tsx
("use client");

import React from "react";
import { useReelManager } from "@/hooks/reels/useReelManager";
import { useReelScroll } from "../../../../src/hooks/reels/useReelScroll";
import { ReelCarouselUI } from "./ReelCarouselUI";
import type { Reel } from "../../../../src/types/reel.types";

interface ReelCarouselProps {
  reels: Reel[];
  initialIndex?: number;
}

export default function ReelCarousel({
  reels,
  initialIndex = 0,
}: ReelCarouselProps) {
  const manager = useReelManager({ reels, initialIndex });

  const { containerRef } = useReelScroll({
    onNext: manager.goToNext,
    onPrevious: manager.goToPrevious,
    isTransitioning: manager.isTransitioning,
  });

  const handleReady = (reelId: string) => {
    console.log(`Reel ${reelId} ready to play`);
  };

  return (
    <ReelCarouselUI
      reels={manager.reelsInWindow}
      currentIndex={manager.currentIndex}
      containerRef={containerRef}
      onNext={manager.goToNext}
      onReady={handleReady}
      registerReelPlayer={manager.registerReelPlayer}
    />
  );
}
