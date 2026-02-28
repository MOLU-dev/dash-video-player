import { useState, useEffect } from "react";
import { StreamAPI } from "@/lib/api";
import { HEALTH_CHECK_INTERVAL } from "@/utils/constants";
import type { StreamHealth } from "@/lib/types";

export function useStreamHealth(streamId: string | null, isActive: boolean) {
  const [health, setHealth] = useState<StreamHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId || !isActive) return;

    const fetchHealth = async () => {
      try {
        const data = await StreamAPI.getStreamHealth(streamId);
        setHealth(data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch stream health");
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [streamId, isActive]);

  return { health, error };
}
