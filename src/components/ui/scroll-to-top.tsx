import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  className?: string;
  container?: HTMLElement | Window;
  threshold?: number;
  smooth?: boolean;
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  className,
  container = window,
  threshold = 300,
  smooth = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = container === window 
        ? window.pageYOffset 
        : (container as HTMLElement).scrollTop;
      
      setIsVisible(scrollTop > threshold);
    };

    const scrollContainer = container === window ? window : container as HTMLElement;
    scrollContainer.addEventListener('scroll', handleScroll);
    
    // Check initial scroll position
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [container, threshold]);

  const scrollToTop = () => {
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
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      variant="secondary"
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-lg transition-all duration-300",
        "hover:shadow-xl hover:scale-105",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "rounded-full w-12 h-12",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        className
      )}
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};