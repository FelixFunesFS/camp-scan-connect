import { useEffect, useState, useCallback } from 'react';

interface UseScrollToTopOptions {
  container?: HTMLElement | Window;
  threshold?: number;
  smooth?: boolean;
}

export const useScrollToTop = ({
  container = window,
  threshold = 300,
  smooth = true,
}: UseScrollToTopOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollTop = container === window 
      ? window.pageYOffset 
      : (container as HTMLElement).scrollTop;
    
    setIsVisible(scrollTop > threshold);
  }, [container, threshold]);

  const scrollToTop = useCallback(() => {
    if (container === window) {
      window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    } else {
      (container as HTMLElement).scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, [container, smooth]);

  useEffect(() => {
    const scrollContainer = container === window ? window : container as HTMLElement;
    
    // Throttle scroll events for performance
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 16); // ~60fps
    };

    scrollContainer.addEventListener('scroll', throttledHandleScroll);
    
    // Check initial scroll position
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [container, handleScroll]);

  return {
    isVisible,
    scrollToTop,
  };
};