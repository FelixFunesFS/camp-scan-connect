import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  isEnabled?: boolean;
}

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 100, 
  isEnabled = true 
}: PullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) return;

    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        isAtTop = true;
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      if (deltaY > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isAtTop || isRefreshing) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      isAtTop = false;
    };

    const handleScroll = () => {
      if (container.scrollTop > 0) {
        isAtTop = false;
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [onRefresh, threshold, isEnabled, isRefreshing, pullDistance]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    shouldShowIndicator: pullDistance > 0
  };
};