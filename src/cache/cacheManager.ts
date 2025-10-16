import NodeCache from 'node-cache';

export class CacheManager {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;
  private enabled: boolean;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // Default 10 minute TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // For better performance
    });

    // Check if cache is enabled
    this.enabled = process.env.CACHE_ENABLED !== 'false';

    // Set up event listeners
    this.cache.on('expired', (key, value) => {
      console.error(`Cache expired: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      console.error(`Cache deleted: ${key}`);
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) {
      this.misses++;
      return undefined;
    }

    const value = this.cache.get<T>(key);

    if (value !== undefined) {
      this.hits++;
      console.error(`Cache hit: ${key}`);
      return value;
    }

    this.misses++;
    console.error(`Cache miss: ${key}`);
    return undefined;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled) {
      return false;
    }

    const success = ttl
      ? this.cache.set(key, value, ttl)
      : this.cache.set(key, value);

    if (success) {
      console.error(`Cache set: ${key} (TTL: ${ttl || 'default'}s)`);
    }

    return success;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
    console.error('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    keys: number;
    hitRate: number;
    size: number;
  } {
    const keys = this.cache.keys();
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      keys: keys.length,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.getStats().vsize,
    };
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Get TTL for a key
   */
  getTTL(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Update TTL for a key
   */
  setTTL(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }

  /**
   * Enable or disable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();