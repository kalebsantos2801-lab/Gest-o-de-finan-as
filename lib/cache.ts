// Global client-side memory cache to enable instant tab switches (0ms perceived latency)
// by keeping data cached in memory and updating it in the background (SWR pattern)

class MemoryCache {
  private cache: Map<string, any> = new Map();

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    return this.cache.get(key) || null;
  }

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();
