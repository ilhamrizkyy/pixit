"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps a surface mounted long enough to animate out.
 *
 * Overlays here unmount on close, so an exit animation has nothing to play on
 * unless the unmount is deferred. This holds the element for the length of its
 * close animation, then releases it.
 *
 * The close clock is deliberately SHORTER than the matching open clock —
 * arriving should feel deliberate, leaving should feel immediate.
 */
export function useDismissible(onClose: () => void, closeMs: number) {
  const [closing, setClosing] = useState(false);
  /* THE TIMER IS HELD, for three reasons it did not used to be.

     1. UNMOUNT. A surface can be torn down while its own close is in flight —
        clear the gallery's selection during the export menu's 150ms and
        `onClose` fires against a component that is gone.
     2. RE-ENTRANCY. Two `requestClose` calls stacked two timers, so the second
        close ran the callback twice.
     3. CANCEL. A close can be OVERTAKEN rather than completed: picking another
        icon while the shelf is closing must keep the new selection, not have a
        pending timer null it 150ms later. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setClosing(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const requestClose = useCallback(() => {
    // Already closing: a second press is not a second close.
    if (timer.current !== null) return;

    // Someone who asked for less motion should not be made to wait for it.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      onClose();
      return;
    }

    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false);
      onClose();
    }, closeMs);
  }, [onClose, closeMs]);

  return { closing, requestClose, cancel };
}

/** Close durations, matching the motion scale in globals.css. */
export const CLOSE_MS = {
  /** Modal — scales in place, so it leaves quickly. */
  modal: 150,
  /** Sheet — travels the screen height, so it needs longer to clear. */
  sheet: 350,
  /** Dropdown — scales a few pixels from its trigger, so it leaves at once. */
  menu: 150,
} as const;
