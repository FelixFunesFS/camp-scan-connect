import { useState, useCallback } from 'react';

export interface SyntheticRfidOptions {
  prefix?: string;
  length?: number;
  format?: 'hex' | 'numeric' | 'mixed';
}

export const useSyntheticRfidGenerator = (options: SyntheticRfidOptions = {}) => {
  const {
    prefix = 'TEST',
    length = 12,
    format = 'hex'
  } = options;

  const [generatedUids, setGeneratedUids] = useState<Set<string>>(new Set());

  const generateUid = useCallback(() => {
    let uid: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      
      let suffix: string;
      switch (format) {
        case 'numeric':
          suffix = (timestamp + random).replace(/[^0-9]/g, '').substring(0, length - prefix.length);
          break;
        case 'hex':
          suffix = (timestamp + random).replace(/[^0-9A-F]/gi, '').toUpperCase().substring(0, length - prefix.length);
          break;
        case 'mixed':
        default:
          suffix = (timestamp + random).substring(0, length - prefix.length).toUpperCase();
          break;
      }
      
      uid = prefix + suffix.padEnd(length - prefix.length, '0');
      attempts++;
    } while (generatedUids.has(uid) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // Fallback to timestamp-based UID
      uid = prefix + Date.now().toString().slice(-8);
    }

    setGeneratedUids(prev => new Set(prev).add(uid));
    return uid;
  }, [prefix, length, format, generatedUids]);

  const clearGenerated = useCallback(() => {
    setGeneratedUids(new Set());
  }, []);

  const validateUid = useCallback((uid: string): boolean => {
    // Basic validation for generated UIDs
    if (!uid.startsWith(prefix)) return false;
    if (uid.length !== length) return false;
    
    switch (format) {
      case 'numeric':
        return /^[A-Z0-9]+$/.test(uid);
      case 'hex':
        return /^[A-F0-9]+$/.test(uid);
      case 'mixed':
      default:
        return /^[A-Z0-9]+$/.test(uid);
    }
  }, [prefix, length, format]);

  return {
    generateUid,
    clearGenerated,
    validateUid,
    generatedCount: generatedUids.size,
    generatedUids: Array.from(generatedUids)
  };
};