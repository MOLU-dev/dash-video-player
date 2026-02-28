// app/reels/[id]/page.tsx
"use client";

import { useParams, useRouter, useState } from "next/navigation";
import { ReelCarousel } from "@/components/ReelCarousel";
import { useEffect } from "react";

// This would be your data fetching function
const getReels = async (): Promise<Reel[]> => {
  // Fetch your reels from API
  return []; // Return your reels array
};

export default function ReelPage() {
  const params = useParams();
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReels = async () => {
      try {
        const reelsData = await getReels();
        setReels(reelsData);
      } catch (error) {
        console.error("Failed to load reels:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  const handleReelChange = (index: number, reel: Reel) => {
    // Update URL using dynamic route
    router.replace(`/reels/${reel.id}`, { scroll: false });
  };

  if (loading) {
    return <div>Loading reels...</div>;
  }

  if (reels.length === 0) {
    return <div>No reels found</div>;
  }

  return <ReelCarousel reels={reels} onReelChange={handleReelChange} />;
}
