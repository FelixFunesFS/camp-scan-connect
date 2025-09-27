import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export function useDataCache<T>(options: CacheOptions = {}) {
  const { ttl = 300000, maxSize = 100 } = options; // 5 minutes default TTL
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, size: 0 });

  const cleanExpiredEntries = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    let cleaned = 0;
    
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiry) {
        cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      setCacheStats(prev => ({ ...prev, size: cache.size }));
    }
  }, []);

  const enforceMaxSize = useCallback(() => {
    const cache = cacheRef.current;
    if (cache.size <= maxSize) return;

    // Remove oldest entries (FIFO)
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = cache.size - maxSize;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
    
    setCacheStats(prev => ({ ...prev, size: cache.size }));
  }, [maxSize]);

  const get = useCallback((key: string): T | null => {
    cleanExpiredEntries();
    
    const entry = cacheRef.current.get(key);
    if (!entry) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      cacheRef.current.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1, size: prev.size - 1 }));
      return null;
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.data;
  }, [cleanExpiredEntries]);

  const set = useCallback((key: string, data: T, customTtl?: number) => {
    cleanExpiredEntries();
    
    const now = Date.now();
    const expiry = now + (customTtl || ttl);
    
    cacheRef.current.set(key, {
      data,
      timestamp: now,
      expiry
    });

    enforceMaxSize();
    setCacheStats(prev => ({ ...prev, size: cacheRef.current.size }));
  }, [cleanExpiredEntries, enforceMaxSize, ttl]);

  const remove = useCallback((key: string) => {
    const deleted = cacheRef.current.delete(key);
    if (deleted) {
      setCacheStats(prev => ({ ...prev, size: prev.size - 1 }));
    }
    return deleted;
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    setCacheStats({ hits: 0, misses: 0, size: 0 });
  }, []);

  const has = useCallback((key: string): boolean => {
    cleanExpiredEntries();
    return cacheRef.current.has(key);
  }, [cleanExpiredEntries]);

  const getHitRate = useCallback(() => {
    const total = cacheStats.hits + cacheStats.misses;
    return total > 0 ? (cacheStats.hits / total) * 100 : 0;
  }, [cacheStats]);

  return {
    get,
    set,
    remove,
    clear,
    has,
    stats: cacheStats,
    hitRate: getHitRate()
  };
}