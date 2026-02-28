// lib/segmentCache.ts - Updated version

import { LRUCache } from "@/utils/LRUCache";

// Cache key structure: "videoId:type:repId:segmentIndex"
// Example: "video123:video:rep1080p:5"
// For init segments: "videoId:type:repId:init"

export interface SegmentCacheEntry {
  data: Uint8Array;
  videoId: string;
  mediaType: "video" | "audio";
  representationId: string;
  segmentIndex: number;
  timestamp: number;
}

export interface SegmentCacheStats {
  totalEntries: number;
  videoSegments: number;
  audioSegments: number;
  currentSizeMB: number;
  maxSizeMB: number;
  hitRate: number;
  missRate: number;
  prefetchedVideos: Set<string>;
}

class SegmentCacheManager {
  private cache: LRUCache<string, Uint8Array>;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };
  private prefetchedVideos: Set<string> = new Set();

  // 150MB cache - adjust based on your needs
  private readonly DEFAULT_CACHE_SIZE = 150 * 1024 * 1024;

  constructor(maxSizeBytes?: number) {
    this.cache = new LRUCache<string, Uint8Array>(
      maxSizeBytes || this.DEFAULT_CACHE_SIZE,
      (buffer) => buffer.byteLength
    );
  }

  /**
   * Generate cache key for regular segments
   */
  private getCacheKey(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number
  ): string {
    return `${videoId}:${mediaType}:${representationId}:${segmentIndex}`;
  }

  /**
   * Generate cache key for init segments
   */
  private getInitCacheKey(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string
  ): string {
    return `${videoId}:${mediaType}:${representationId}:init`;
  }

  /**
   * Get segment from cache
   */
  get(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number
  ): Uint8Array | null {
    const key = this.getCacheKey(
      videoId,
      mediaType,
      representationId,
      segmentIndex
    );
    const data = this.cache.get(key);

    if (data) {
      this.stats.hits++;
      return data;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Get init segment from cache
   */
  getInitSegment(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string
  ): Uint8Array | null {
    const key = this.getInitCacheKey(videoId, mediaType, representationId);
    const data = this.cache.get(key);

    if (data) {
      this.stats.hits++;
      return data;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store segment in cache
   */
  set(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number,
    data: ArrayBuffer | Uint8Array
  ): void {
    const key = this.getCacheKey(
      videoId,
      mediaType,
      representationId,
      segmentIndex
    );

    // Convert ArrayBuffer to Uint8Array if needed
    const dataToStore =
      data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    this.cache.set(key, dataToStore);
    this.stats.sets++;
  }

  /**
   * Store init segment in cache
   */
  setInitSegment(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    data: ArrayBuffer | Uint8Array
  ): void {
    const key = this.getInitCacheKey(videoId, mediaType, representationId);

    // Convert ArrayBuffer to Uint8Array if needed
    const dataToStore =
      data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    this.cache.set(key, dataToStore);
    this.stats.sets++;
  }

  /**
   * Mark a video as prefetched (optional metadata)
   */
  markAsPrefetched(videoId: string, representationId: string): void {
    const key = `${videoId}:${representationId}`;
    this.prefetchedVideos.add(key);
  }

  /**
   * Check if video is marked as prefetched
   */
  isPrefetched(videoId: string, representationId: string): boolean {
    const key = `${videoId}:${representationId}`;
    return this.prefetchedVideos.has(key);
  }

  /**
   * Check if segment exists in cache
   */
  has(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number
  ): boolean {
    const key = this.getCacheKey(
      videoId,
      mediaType,
      representationId,
      segmentIndex
    );
    return this.cache.has(key);
  }

  /**
   * Check if init segment exists in cache
   */
  hasInitSegment(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string
  ): boolean {
    const key = this.getInitCacheKey(videoId, mediaType, representationId);
    return this.cache.has(key);
  }

  /**
   * Delete specific segment
   */
  delete(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number
  ): boolean {
    const key = this.getCacheKey(
      videoId,
      mediaType,
      representationId,
      segmentIndex
    );
    return this.cache.delete(key);
  }

  /**
   * Delete init segment
   */
  deleteInitSegment(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string
  ): boolean {
    const key = this.getInitCacheKey(videoId, mediaType, representationId);
    return this.cache.delete(key);
  }

  /**
   * Delete all segments for a video
   */
  deleteVideo(videoId: string): void {
    const keys = this.cache.getKeys();
    const videoKeys = keys.filter((key) => key.startsWith(`${videoId}:`));

    videoKeys.forEach((key) => {
      this.cache.delete(key);
    });

    // Also remove from prefetched set
    const prefetchKeysToRemove: string[] = [];
    this.prefetchedVideos.forEach((key) => {
      if (key.startsWith(`${videoId}:`)) {
        prefetchKeysToRemove.push(key);
      }
    });
    prefetchKeysToRemove.forEach((key) => this.prefetchedVideos.delete(key));
  }

  /**
   * Prefetch segments (download and cache without appending)
   */
  async prefetchSegments(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    startSegment: number,
    count: number
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const segmentIndex = startSegment + i;

      // Skip if already cached
      if (this.has(videoId, mediaType, representationId, segmentIndex)) {
        continue;
      }

      const promise = this.fetchAndCache(
        videoId,
        mediaType,
        representationId,
        segmentIndex
      );
      promises.push(promise);
    }

    await Promise.all(promises);
  }

  /**
   * Fetch segment from server and cache it
   */
  private async fetchAndCache(
    videoId: string,
    mediaType: "video" | "audio",
    representationId: string,
    segmentIndex: number
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/segment/${videoId}/${mediaType}/${representationId}/${segmentIndex}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Data = new Uint8Array(arrayBuffer);
      this.set(videoId, mediaType, representationId, segmentIndex, uint8Data);
    } catch (error) {
      // Handle error silently for prefetching
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): SegmentCacheStats {
    const cacheStats = this.cache.getStats();
    const keys = this.cache.getKeys();

    const videoSegments = keys.filter((k) => k.includes(":video:")).length;
    const audioSegments = keys.filter((k) => k.includes(":audio:")).length;

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;

    return {
      totalEntries: cacheStats.size,
      videoSegments,
      audioSegments,
      currentSizeMB: cacheStats.currentSizeMB,
      maxSizeMB: cacheStats.maxSizeMB,
      hitRate: parseFloat(hitRate.toFixed(2)),
      missRate: parseFloat(missRate.toFixed(2)),
      prefetchedVideos: this.prefetchedVideos,
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.prefetchedVideos.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  /**
   * Get all cached video IDs
   */
  getCachedVideos(): string[] {
    const keys = this.cache.getKeys();
    const videoIds = new Set<string>();

    keys.forEach((key) => {
      const videoId = key.split(":")[0];
      videoIds.add(videoId);
    });

    return Array.from(videoIds);
  }

  /**
   * Get cache keys (for debugging)
   */
  getKeys(): string[] {
    return this.cache.getKeys();
  }
}

// Singleton instance
let segmentCacheInstance: SegmentCacheManager | null = null;

export function getSegmentCache(): SegmentCacheManager {
  if (!segmentCacheInstance) {
    segmentCacheInstance = new SegmentCacheManager();
  }
  return segmentCacheInstance;
}

export function resetSegmentCache(): void {
  segmentCacheInstance?.clear();
  segmentCacheInstance = null;
}
