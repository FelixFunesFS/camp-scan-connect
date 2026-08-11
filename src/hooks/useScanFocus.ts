import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Keeps a keyboard-wedge scan input focused so a scan is never lost.
 * Restores focus on mount, on window/tab refocus, on clicks in dead space,
 * and whenever the caller's `deps` change (e.g. after a scan resolves).
 */
export function useScanFocus(deps: unknown[] = [], options?: { enabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = useIsMobile();
  const enabled = options?.enabled !== false && !isMobile;

  const focusInput = useCallback(() => {
    if (!enabled) return;
    const el = inputRef.current;
    if (!el || el.disabled) return;
    if (document.activeElement === el) return;

    const active = document.activeElement as HTMLElement | null;
    const tag = active?.tagName;
    const typingElsewhere =
      (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active?.isContentEditable) &&
      active !== el;
    // Never steal focus from an open dialog or another field the user is using.
    if (typingElsewhere) return;
    if (active?.closest('[role="dialog"], [data-radix-popper-content-wrapper]')) return;

    el.focus();
  }, [enabled]);

  // Focus on mount and whenever the caller's state changes.
  useEffect(() => {
    focusInput();
    const t = setTimeout(focusInput, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusInput, ...deps]);

  // Refocus when the tab/window becomes active again.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") setTimeout(focusInput, 60);
    };
    window.addEventListener("focus", focusInput);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", focusInput);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, focusInput]);

  // Clicking dead space rearms the scanner.
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("input, textarea, select, button, a, [role='dialog'], [contenteditable='true']")) {
        return;
      }
      setTimeout(focusInput, 0);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [enabled, focusInput]);

  const focusProps = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };

  return { inputRef, isFocused, focusInput, focusProps, focusEnabled: enabled };
}
