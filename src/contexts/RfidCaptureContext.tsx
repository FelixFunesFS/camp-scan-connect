import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';

interface RfidCaptureContextType {
  registerInput: (element: HTMLInputElement, onCapture: (uid: string) => void) => void;
  unregisterInput: (element: HTMLInputElement) => void;
  triggerCapture: (uid: string, targetElement?: HTMLInputElement) => void;
}

const RfidCaptureContext = createContext<RfidCaptureContextType | null>(null);

interface RfidCaptureProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
}

export const RfidCaptureProvider: React.FC<RfidCaptureProviderProps> = ({
  children,
  enabled = true,
  minLength = 8,
  debounceMs = 100
}) => {
  const registeredInputsRef = useRef(new Map<HTMLInputElement, (uid: string) => void>());

  // RFID format validation - basic checks to prevent search text from being treated as RFID
  const isValidRfidFormat = useCallback((uid: string) => {
    // Basic checks to reject obvious non-RFID patterns
    if (uid.length < 8 || uid.length > 20) return false;
    
    // Reject common search patterns
    const commonWords = ['search', 'name', 'phone', 'email', 'order', 'attendee'];
    const lowerUid = uid.toLowerCase();
    if (commonWords.some(word => lowerUid.includes(word))) return false;
    
    // Reject if it looks like a name (contains spaces or common name patterns)
    if (/\s/.test(uid) || /^[a-zA-Z]+$/.test(uid)) return false;
    
    // Should contain some numbers or special characters (typical of RFID UIDs)
    if (!/\d/.test(uid) && !/[^a-zA-Z\s]/.test(uid)) return false;
    
    return true;
  }, []);

  const registerInput = useCallback((element: HTMLInputElement, onCapture: (uid: string) => void) => {
    registeredInputsRef.current.set(element, onCapture);
  }, []);

  const unregisterInput = useCallback((element: HTMLInputElement) => {
    registeredInputsRef.current.delete(element);
  }, []);

  const triggerCapture = useCallback((uid: string, targetElement?: HTMLInputElement) => {
    if (targetElement && registeredInputsRef.current.has(targetElement)) {
      const onCapture = registeredInputsRef.current.get(targetElement);
      if (onCapture) {
        onCapture(uid);
      }
    } else {
      // Find the currently focused RFID input
      const activeElement = document.activeElement as HTMLInputElement;
      if (activeElement?.getAttribute('data-rfid-input') === 'true') {
        const onCapture = registeredInputsRef.current.get(activeElement);
        if (onCapture) {
          onCapture(uid);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let inputBuffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      
      // Only capture when focused on an RFID input field
      if (!activeElement || activeElement.getAttribute('data-rfid-input') !== 'true') {
        return;
      }

      // Explicitly ignore search inputs
      if (activeElement.getAttribute('data-search-input') === 'true' || 
          activeElement.getAttribute('data-exclude-rfid') === 'true') {
        return;
      }

      // Find the registered callback for this input
      const onCapture = registeredInputsRef.current.get(activeElement as HTMLInputElement);
      if (!onCapture) return;

      // Clear timeout on new input
      if (timeout) {
        clearTimeout(timeout);
      }

      // Handle Enter key (typical end of RFID scan)
      if (event.key === 'Enter') {
        if (inputBuffer.length >= minLength && isValidRfidFormat(inputBuffer.trim())) {
          event.preventDefault();
          onCapture(inputBuffer.trim());
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
            if (inputBuffer.length >= minLength && isValidRfidFormat(inputBuffer.trim())) {
              onCapture(inputBuffer.trim());
              inputBuffer = '';
            }
          }, debounceMs); // Optimized for USB reader workflow
        }
        
        // Auto-trigger if buffer gets very long (some readers don't send Enter)
        if (inputBuffer.length > 20) {
          if (isValidRfidFormat(inputBuffer.trim())) {
            onCapture(inputBuffer.trim());
          }
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
  }, [enabled, minLength, debounceMs, isValidRfidFormat]);

  const contextValue: RfidCaptureContextType = {
    registerInput,
    unregisterInput,
    triggerCapture
  };

  return (
    <RfidCaptureContext.Provider value={contextValue}>
      {children}
    </RfidCaptureContext.Provider>
  );
};

export const useRfidCaptureContext = () => {
  const context = useContext(RfidCaptureContext);
  if (!context) {
    throw new Error('useRfidCaptureContext must be used within a RfidCaptureProvider');
  }
  return context;
};