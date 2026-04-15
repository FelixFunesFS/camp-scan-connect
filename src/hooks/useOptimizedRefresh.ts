import { useEffect, useRef, useState, useCallback } from 'react';

interface UseOptimizedRefreshProps {
  onRefresh: () => Promise<void> | void;
  interval?: number;
  refreshTrigger?: any;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  adaptiveInterval?: boolean;
}

interface RefreshState {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: Error | null;
  successCount: number;
  failureCount: number;
  currentInterval: number;
}

export const useOptimizedRefresh = ({ 
  onRefresh, 
  interval = 10000, // Increased from 3s to 10s
  refreshTrigger,
  onSuccess,
  onError,
  enabled = true,
  adaptiveInterval = true
}: UseOptimizedRefreshProps) => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const refreshTriggerRef = useRef(refreshTrigger);
  const lastRefreshTime = useRef<number>(0);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    isRefreshing: false,
    lastUpdated: null,
    error: null,
    successCount: 0,
    failureCount: 0,
    currentInterval: interval
  });

  // Adaptive interval calculation
  const calculateInterval = useCallback((baseInterval: number, failures: number) => {
    if (!adaptiveInterval) return baseInterval;
    
    // Exponential backoff for failures, but cap at 60 seconds
    const backoffMultiplier = Math.min(Math.pow(2, failures), 6);
    return Math.min(baseInterval * backoffMultiplier, 60000);
  }, [adaptiveInterval]);

  const performRefresh = useCallback(async () => {
    const now = Date.now();
    
    // Prevent rapid successive refreshes (minimum 2 seconds between refreshes)
    if (now - lastRefreshTime.current < 2000) {
      return;
    }
    
    lastRefreshTime.current = now;
    setRefreshState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      await onRefresh();
      setRefreshState(prev => { 
        const newState = {
          ...prev, 
          isRefreshing: false, 
          lastUpdated: new Date(),
          successCount: prev.successCount + 1,
          failureCount: 0, // Reset failure count on success
          currentInterval: interval // Reset to base interval on success
        };
        return newState;
      });
      onSuccess?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Refresh failed');
      setRefreshState(prev => {
        const newFailureCount = prev.failureCount + 1;
        const newInterval = calculateInterval(interval, newFailureCount);
        
        return { 
          ...prev, 
          isRefreshing: false, 
          error: errorObj,
          failureCount: newFailureCount,
          currentInterval: newInterval
        };
      });
      onError?.(errorObj);
    }
  }, [onRefresh, onSuccess, onError, interval, calculateInterval]);

  // Manual refresh function with rate limiting
  const manualRefresh = useCallback(async () => {
    await performRefresh();
  }, [performRefresh]);

  // Handle manual refresh triggers (optimized to prevent duplicate calls)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== refreshTriggerRef.current) {
      refreshTriggerRef.current = refreshTrigger;
      if (enabled && refreshTriggerRef.current !== undefined) {
        // Debounce manual triggers
        const timeoutId = setTimeout(() => {
          performRefresh();
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [refreshTrigger, performRefresh, enabled]);

  // Handle automatic refresh with adaptive intervals
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval with current adaptive interval
    intervalRef.current = setInterval(() => {
      performRefresh();
    }, refreshState.currentInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performRefresh, enabled, refreshState.currentInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...refreshState,
    manualRefresh,
    isEnabled: enabled
  };
};