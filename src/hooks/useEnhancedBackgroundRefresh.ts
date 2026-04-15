import { useEffect, useRef, useState, useCallback } from 'react';

interface UseEnhancedBackgroundRefreshProps {
  onRefresh: () => Promise<void> | void;
  interval?: number;
  refreshTrigger?: any;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface RefreshState {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: Error | null;
  successCount: number;
}

export const useEnhancedBackgroundRefresh = ({ 
  onRefresh, 
  interval = 30000, 
  refreshTrigger,
  onSuccess,
  onError
}: UseEnhancedBackgroundRefreshProps) => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const refreshTriggerRef = useRef(refreshTrigger);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    isRefreshing: false,
    lastUpdated: null,
    error: null,
    successCount: 0
  });

  const performRefresh = useCallback(async () => {
    setRefreshState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      await onRefresh();
      setRefreshState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        lastUpdated: new Date(),
        successCount: prev.successCount + 1
      }));
      onSuccess?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Refresh failed');
      setRefreshState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        error: errorObj
      }));
      onError?.(errorObj);
    }
  }, [onRefresh, onSuccess, onError]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    await performRefresh();
  }, [performRefresh]);

  // Handle manual refresh triggers
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== refreshTriggerRef.current) {
      refreshTriggerRef.current = refreshTrigger;
      if (refreshTriggerRef.current !== undefined) { // Only trigger if not initial render
        performRefresh();
      }
    }
  }, [refreshTrigger, performRefresh]);

  // Handle automatic refresh
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      performRefresh();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performRefresh, interval]);

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
    manualRefresh
  };
};