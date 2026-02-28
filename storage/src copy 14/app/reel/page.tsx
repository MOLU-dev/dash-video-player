"use client";

import { VirtualReelCarousel } from "../../../../src/components/VirtualReelCarousel";

export default function MyReelsPage() {
  const reels = [
    { id: "4", videoId: "WMWmBZlMwUS", title: "Reel 4", duration: 2 },
    { id: "3", videoId: "g5FuBygiv0P", title: "Reel 3", duration: 32 },
    { id: "1", videoId: "kWgsI9sLFq3", title: "Reel 1", duration: 15 },
    { id: "2", videoId: "uqwS5sY6bnE", title: "Reel 2", duration: 30 },
  ];

  return <VirtualReelCarousel reels={reels} />;
}
