import { useState, useEffect, useCallback } from 'react';
import {
  ANY_CREDENTIAL_MAX_LENGTH,
  ANY_CREDENTIAL_MIN_LENGTH,
  isValidCredentialFormat,
  type CredentialType,
} from '@/lib/credentialFormat';

interface RfidCaptureOptions {
  onCapture: (uid: string) => void;
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
  /** Restrict accepted payloads to one medium. Defaults to accepting any. */
  credentialType?: CredentialType;
}

export const useRfidCapture = ({
  onCapture,
  enabled = true,
  minLength = ANY_CREDENTIAL_MIN_LENGTH,
  debounceMs = 100,
  credentialType
}: RfidCaptureOptions) => {
  const [capturedUid, setCapturedUid] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Accepts RFID UIDs, barcodes and QR payloads; still rejects typed search text.
  const isValidRfidFormat = useCallback(
    (uid: string) => isValidCredentialFormat(uid, credentialType),
    [credentialType]
  );

  const handleCapture = useCallback((uid: string) => {
    // Validate credential format before processing
    if (!isValidRfidFormat(uid)) {
      console.warn('Rejected invalid credential format:', uid);
      return;
    }
    
    setCapturedUid(uid);
    setIsCapturing(true);
    onCapture(uid);
    
    // Reset capture state after debounce period
    setTimeout(() => {
      setIsCapturing(false);
      setCapturedUid('');
    }, debounceMs);
  }, [onCapture, debounceMs, isValidRfidFormat]);

  useEffect(() => {
    if (!enabled) return;

    let inputBuffer = '';
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only capture when focused on an RFID input field
      const activeElement = document.activeElement as HTMLElement;
      
      if (!activeElement || activeElement.getAttribute('data-rfid-input') !== 'true') {
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
        
        // Enhanced auto-trigger for assignment mode - optimized for USB readers
        if (inputBuffer.length >= minLength && inputBuffer.length <= ANY_CREDENTIAL_MAX_LENGTH) {
          // Ultra-fast timeout for rapid assignment workflow
          timeout = setTimeout(() => {
            if (inputBuffer.length >= minLength) {
              handleCapture(inputBuffer.trim());
              inputBuffer = '';
            }
          }, 100); // Optimized for USB reader workflow
        }
        
        // Auto-trigger if buffer gets very long (some readers don't send Enter)
        if (inputBuffer.length > ANY_CREDENTIAL_MAX_LENGTH) {
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