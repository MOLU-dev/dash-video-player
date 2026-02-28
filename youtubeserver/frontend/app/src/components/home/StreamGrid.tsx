"use client";

import { useState, useEffect } from "react";
import { StreamAPI } from "@/lib/api";
import type { StreamMetadata } from "@/lib/types";
import StreamCard from "./StreamCard";
import { Loader2 } from "lucide-react";

export default function StreamGrid() {
  const [streams, setStreams] = useState<StreamMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStreams() {
      try {
        const data = await StreamAPI.listStreams();
        setStreams(data);
      } catch (err) {
        setError("Failed to load streams");
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();

    // Refresh streams every 10 seconds
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-youtube-red" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-youtube-textSecondary text-lg">
          No streams available
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}
