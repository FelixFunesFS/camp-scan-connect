import { useEffect, useRef } from 'react';

interface UseBackgroundRefreshProps {
  onRefresh: () => void;
  interval?: number;
  refreshTrigger?: any;
}

export const useBackgroundRefresh = ({ 
  onRefresh, 
  interval = 30000, 
  refreshTrigger 
}: UseBackgroundRefreshProps) => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const refreshTriggerRef = useRef(refreshTrigger);

  // Handle manual refresh triggers
  useEffect(() => {
    if (refreshTrigger !== refreshTriggerRef.current) {
      refreshTriggerRef.current = refreshTrigger;
      onRefresh();
    }
  }, [refreshTrigger, onRefresh]);

  // Handle automatic refresh
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      onRefresh();
    }, interval);

    // Initial fetch
    onRefresh();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onRefresh, interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};