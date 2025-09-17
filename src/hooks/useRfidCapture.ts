import { useState, useEffect, useCallback } from 'react';

interface RfidCaptureOptions {
  onCapture: (uid: string) => void;
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
}

export const useRfidCapture = ({
  onCapture,
  enabled = true,
  minLength = 8,
  debounceMs = 100
}: RfidCaptureOptions) => {
  const [capturedUid, setCapturedUid] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback((uid: string) => {
    setCapturedUid(uid);
    setIsCapturing(true);
    onCapture(uid);
    
    // Reset capture state after debounce period
    setTimeout(() => {
      setIsCapturing(false);
      setCapturedUid('');
    }, debounceMs);
  }, [onCapture, debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    let inputBuffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field (unless it's our RFID input)
      const target = event.target as HTMLElement;
      const isRfidInput = target.classList.contains('rfid-input') || 
                         target.getAttribute('data-rfid-input') === 'true';
      
      if (target.tagName === 'INPUT' && !isRfidInput) {
        return;
      }

      // Clear timeout on new input
      if (timeout) {
        clearTimeout(timeout);
      }

      // Handle Enter key (typical end of RFID scan)
      if (event.key === 'Enter') {
        if (inputBuffer.length >= minLength) {
          event.preventDefault();
          handleCapture(inputBuffer.trim());
        }
        inputBuffer = '';
        return;
      }

      // Handle regular characters
      if (event.key.length === 1) {
        inputBuffer += event.key;
        
        // Enhanced auto-trigger for RFID assignment mode - optimized for USB readers
        if (inputBuffer.length >= minLength && inputBuffer.length <= 20) {
          // Ultra-fast timeout for rapid assignment workflow
          timeout = setTimeout(() => {
            if (inputBuffer.length >= minLength) {
              handleCapture(inputBuffer.trim());
              inputBuffer = '';
            }
          }, 100); // Optimized for USB reader workflow
        }
        
        // Auto-trigger if buffer gets very long (some readers don't send Enter)
        if (inputBuffer.length > 20) {
          handleCapture(inputBuffer.trim());
          inputBuffer = '';
          return;
        }
      }
    };

    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [enabled, minLength, handleCapture]);

  return {
    capturedUid,
    isCapturing,
    clearCapture: () => setCapturedUid('')
  };
};