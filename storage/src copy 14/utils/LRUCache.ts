// // utils/LRUCache.ts

// export class LRUCache<K, V> {
//   private maxSize: number;
//   private currentSize: number = 0;
//   private cache: Map<K, { value: V; size: number; lastAccessed: number }>;
//   private getSizeOf: (value: V) => number;

//   constructor(
//     maxSizeBytes: number,
//     getSizeOf: (value: V) => number = (v: any) => {
//       if (v instanceof ArrayBuffer) return v.byteLength;
//       if (typeof v === "string") return v.length * 2; // UTF-16
//       return JSON.stringify(v).length * 2;
//     }
//   ) {
//     this.maxSize = maxSizeBytes;
//     this.cache = new Map();
//     this.getSizeOf = getSizeOf;
//   }

//   get(key: K): V | null {
//     const entry = this.cache.get(key);
//     if (!entry) return null;

//     // Update last accessed time
//     entry.lastAccessed = Date.now();
//     this.cache.set(key, entry);

//     return entry.value;
//   }

//   set(key: K, value: V): void {
//     const size = this.getSizeOf(value);

//     // Check if key already exists
//     const existing = this.cache.get(key);
//     if (existing) {
//       this.currentSize -= existing.size;
//       this.cache.delete(key);
//     }

//     // Evict until we have space
//     while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
//       this.evictLRU();
//     }

//     // Don't cache if single item is larger than max size
//     if (size > this.maxSize) {
//       console.warn(
//         `Item too large for cache: ${size} bytes > ${this.maxSize} bytes`
//       );
//       return;
//     }

//     // Add to cache
//     this.cache.set(key, {
//       value,
//       size,
//       lastAccessed: Date.now(),
//     });
//     this.currentSize += size;

//     console.log(
//       `[CACHE] Added ${key}: ${(size / 1024 / 1024).toFixed(2)}MB | Total: ${(
//         this.currentSize /
//         1024 /
//         1024
//       ).toFixed(2)}MB / ${(this.maxSize / 1024 / 1024).toFixed(2)}MB`
//     );
//   }

//   has(key: K): boolean {
//     return this.cache.has(key);
//   }

//   delete(key: K): boolean {
//     const entry = this.cache.get(key);
//     if (!entry) return false;

//     this.currentSize -= entry.size;
//     this.cache.delete(key);
//     console.log(
//       `[CACHE] Deleted ${key}: freed ${(entry.size / 1024 / 1024).toFixed(2)}MB`
//     );
//     return true;
//   }

//   clear(): void {
//     this.cache.clear();
//     this.currentSize = 0;
//     console.log("[CACHE] Cleared all entries");
//   }

//   private evictLRU(): void {
//     let oldestKey: K | null = null;
//     let oldestTime = Infinity;

//     // Find least recently used
//     for (const [key, entry] of this.cache.entries()) {
//       if (entry.lastAccessed < oldestTime) {
//         oldestTime = entry.lastAccessed;
//         oldestKey = key;
//       }
//     }

//     if (oldestKey !== null) {
//       const entry = this.cache.get(oldestKey)!;
//       console.log(
//         `[CACHE] Evicting LRU: ${oldestKey} (${(
//           entry.size /
//           1024 /
//           1024
//         ).toFixed(2)}MB, age: ${(Date.now() - entry.lastAccessed) / 1000}s)`
//       );
//       this.delete(oldestKey);
//     }
//   }

//   getStats() {
//     return {
//       size: this.cache.size,
//       currentSizeBytes: this.currentSize,
//       currentSizeMB: this.currentSize / 1024 / 1024,
//       maxSizeMB: this.maxSize / 1024 / 1024,
//       utilizationPercent: (this.currentSize / this.maxSize) * 100,
//     };
//   }

//   getKeys(): K[] {
//     return Array.from(this.cache.keys());
//   }
// }


// utils/LRUCache.ts

export class LRUCache<K, V> {
  private maxSize: number;
  private currentSize: number = 0;
  private cache: Map<K, { value: V; size: number; lastAccessed: number }>;
  private getSizeOf: (value: V) => number;

  constructor(
    maxSizeBytes: number,
    getSizeOf: (value: V) => number = (v: any) => {
      if (v instanceof ArrayBuffer) return v.byteLength;
      if (v instanceof Uint8Array) return v.byteLength; // Added Uint8Array support
      if (typeof v === "string") return v.length * 2; // UTF-16
      return JSON.stringify(v).length * 2;
    }
  ) {
    this.maxSize = maxSizeBytes;
    this.cache = new Map();
    this.getSizeOf = getSizeOf;
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    const size = this.getSizeOf(value);

    // Check if key already exists
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
      this.cache.delete(key);
    }

    // Evict until we have space
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Don't cache if single item is larger than max size
    if (size > this.maxSize) {
      // console.warn(
      //   `Item too large for cache: ${size} bytes > ${this.maxSize} bytes`
      // );
      return;
    }

    // Add to cache
    this.cache.set(key, {
      value,
      size,
      lastAccessed: Date.now(),
    });
    this.currentSize += size;

    // console.log(
    //   `[CACHE] Added ${key}: ${(size / 1024 / 1024).toFixed(2)}MB | Total: ${(
    //     this.currentSize /
    //     1024 /
    //     1024
    //   ).toFixed(2)}MB / ${(this.maxSize / 1024 / 1024).toFixed(2)}MB`
    // );
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentSize -= entry.size;
    this.cache.delete(key);
    // console.log(
    //   `[CACHE] Deleted ${key}: freed ${(entry.size / 1024 / 1024).toFixed(2)}MB`
    // );
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
   // console.log("[CACHE] Cleared all entries");
  }

  private evictLRU(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    // Find least recently used
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      const entry = this.cache.get(oldestKey)!;
      // console.log(
      //   `[CACHE] Evicting LRU: ${oldestKey} (${(
      //     entry.size /
      //     1024 /
      //     1024
      //   ).toFixed(2)}MB, age: ${(Date.now() - entry.lastAccessed) / 1000}s)`
      // );
      this.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      currentSizeBytes: this.currentSize,
      currentSizeMB: this.currentSize / 1024 / 1024,
      maxSizeMB: this.maxSize / 1024 / 1024,
      utilizationPercent: (this.currentSize / this.maxSize) * 100,
    };
  }

  getKeys(): K[] {
    return Array.from(this.cache.keys());
  }
}