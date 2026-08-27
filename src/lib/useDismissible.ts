"use client";

import { useCallback, useState } from "react";

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

  const requestClose = useCallback(() => {
    // Someone who asked for less motion should not be made to wait for it.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      onClose();
      return;
    }

    setClosing(true);
    setTimeout(onClose, closeMs);
  }, [onClose, closeMs]);

  return { closing, requestClose };
}

/** Close durations, matching the motion scale in globals.css. */
export const CLOSE_MS = {
  /** Modal — scales in place, so it leaves quickly. */
  modal: 150,
  /** Sheet — travels the screen height, so it needs longer to clear. */
  sheet: 350,
} as const;
