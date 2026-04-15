// Synthetic RFID Testing Hook
import { useState, useCallback, useRef } from 'react';
import { generateTestRfidUid } from '@/utils/rfidTestUtils';

interface SyntheticRfidOptions {
  onCapture: (uid: string) => void;
  autoMode?: boolean;
  interval?: number;
  uidType?: 'valid' | 'short' | 'long' | 'special' | 'duplicate';
}

export const useSyntheticRfid = ({
  onCapture,
  autoMode = false,
  interval = 3000,
  uidType = 'valid'
}: SyntheticRfidOptions) => {
  const [isActive, setIsActive] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastUid, setLastUid] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const generateAndCapture = useCallback(() => {
    const uid = generateTestRfidUid(uidType);
    setLastUid(uid);
    setScanCount(prev => prev + 1);
    onCapture(uid);
    
    // Log the synthetic scan for debugging
    console.log(`[Synthetic RFID] Generated UID: ${uid} (type: ${uidType})`);
  }, [onCapture, uidType]);

  const startAutoScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsActive(true);
    intervalRef.current = setInterval(generateAndCapture, interval);
  }, [generateAndCapture, interval]);

  const stopAutoScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setIsActive(false);
  }, []);

  const singleScan = useCallback(() => {
    generateAndCapture();
  }, [generateAndCapture]);

  const simulateKeyboardInput = useCallback((targetElement?: HTMLElement) => {
    const uid = generateTestRfidUid(uidType);
    
    // If target element is provided, simulate typing into it
    if (targetElement && 'value' in targetElement) {
      const input = targetElement as HTMLInputElement;
      input.value = uid;
      
      // Trigger input events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true
      });
      input.dispatchEvent(enterEvent);
    } else {
      // Simulate global keyboard input (like real RFID reader)
      const uid = generateTestRfidUid(uidType);
      
      // Dispatch individual character events
      uid.split('').forEach((char, index) => {
        setTimeout(() => {
          const keyEvent = new KeyboardEvent('keypress', {
            key: char,
            code: `Key${char}`,
            bubbles: true
          });
          document.dispatchEvent(keyEvent);
        }, index * 50); // 50ms between characters
      });
      
      // Dispatch Enter after all characters
      setTimeout(() => {
        const enterEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true
        });
        document.dispatchEvent(enterEvent);
      }, uid.length * 50 + 100);
    }
    
    setLastUid(uid);
    setScanCount(prev => prev + 1);
  }, [uidType]);

  const reset = useCallback(() => {
    stopAutoScanning();
    setScanCount(0);
    setLastUid('');
  }, [stopAutoScanning]);

  // Rapid fire testing
  const rapidFire = useCallback(async (count: number = 5, delay: number = 500) => {
    setIsActive(true);
    
    for (let i = 0; i < count; i++) {
      generateAndCapture();
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setIsActive(false);
  }, [generateAndCapture]);

  return {
    isActive,
    scanCount,
    lastUid,
    startAutoScanning,
    stopAutoScanning,
    singleScan,
    simulateKeyboardInput,
    rapidFire,
    reset,
    // Utility methods
    generateUid: () => generateTestRfidUid(uidType),
    setUidType: (type: typeof uidType) => uidType = type
  };
};