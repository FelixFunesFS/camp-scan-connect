import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Shared operational gate for every staff screen. This is not per-user
 * security — it just keeps campers out of staff tools on a shared device.
 * Database policies are unchanged.
 */
const STAFF_PASSCODE = "062019";
const STORAGE_KEY = "mc_staff_unlocked";

interface StaffAuthValue {
  isUnlocked: boolean;
  unlock: (code: string) => boolean;
  signOut: () => void;
}

const StaffAuthContext = createContext<StaffAuthValue>({
  isUnlocked: false,
  unlock: () => false,
  signOut: () => {},
});

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Keep multiple tabs on the same device in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIsUnlocked(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const unlock = useCallback((code: string) => {
    if (code.trim() !== STAFF_PASSCODE) return false;
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* private mode — session still unlocks in memory */
    }
    setIsUnlocked(true);
    return true;
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setIsUnlocked(false);
  }, []);

  return (
    <StaffAuthContext.Provider value={{ isUnlocked, unlock, signOut }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}
