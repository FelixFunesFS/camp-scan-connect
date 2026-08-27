import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import {
  ANY_CREDENTIAL_MAX_LENGTH,
  ANY_CREDENTIAL_MIN_LENGTH,
  isValidCredentialFormat,
  normalizeCredential,
  type CredentialType,
} from '@/lib/credentialFormat';

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
  /** Restrict accepted payloads to one medium. Defaults to accepting any. */
  credentialType?: CredentialType;
}

export const RfidCaptureProvider: React.FC<RfidCaptureProviderProps> = ({
  children,
  enabled = true,
  minLength = ANY_CREDENTIAL_MIN_LENGTH,
  debounceMs = 100,
  credentialType
}) => {
  const registeredInputsRef = useRef(new Map<HTMLInputElement, (uid: string) => void>());

  // Accepts Codes, barcodes and QR payloads; still rejects typed search text.
  const isValidRfidFormat = useCallback(
    (uid: string) => isValidCredentialFormat(uid, credentialType),
    [credentialType]
  );

  const registerInput = useCallback((element: HTMLInputElement, onCapture: (uid: string) => void) => {
    registeredInputsRef.current.set(element, onCapture);
  }, []);

  const unregisterInput = useCallback((element: HTMLInputElement) => {
    registeredInputsRef.current.delete(element);
  }, []);

  const triggerCapture = useCallback((rawUid: string, targetElement?: HTMLInputElement) => {
    const uid = normalizeCredential(rawUid);
    if (targetElement && registeredInputsRef.current.has(targetElement)) {
      const onCapture = registeredInputsRef.current.get(targetElement);
      if (onCapture) {
        onCapture(uid);
      }
    } else {
      // Find the currently focused code input
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
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyPress = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      
      // Only capture when focused on an code input field
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

      // Handle Enter key (typical end of code scan)
      if (event.key === 'Enter') {
        if (inputBuffer.length >= minLength && isValidRfidFormat(inputBuffer.trim())) {
          event.preventDefault();
          onCapture(normalizeCredential(inputBuffer));
        }
        inputBuffer = '';
        return;
      }

      // Handle regular characters
      if (event.key.length === 1) {
        inputBuffer += event.key;
        
        // Enhanced auto-trigger for assignment mode - optimized for USB readers
        if (inputBuffer.length >= minLength && inputBuffer.length <= ANY_CREDENTIAL_MAX_LENGTH) {
          // Ultra-fast timeout for rapid assignment workflow
          timeout = setTimeout(() => {
            if (inputBuffer.length >= minLength && isValidRfidFormat(inputBuffer.trim())) {
              onCapture(normalizeCredential(inputBuffer));
              inputBuffer = '';
            }
          }, debounceMs); // Optimized for USB reader workflow
        }
        
        // Auto-trigger if buffer gets very long (some readers don't send Enter)
        if (inputBuffer.length > ANY_CREDENTIAL_MAX_LENGTH) {
          if (isValidRfidFormat(inputBuffer.trim())) {
            onCapture(normalizeCredential(inputBuffer));
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