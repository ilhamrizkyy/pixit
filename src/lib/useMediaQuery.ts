"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` rather than an effect, for the same reason the theme
 * hook uses it: reading a browser API into state from an effect renders once
 * with a wrong value and again with the right one, and the lint rule that
 * forbids it is correct to.
 *
 * The server snapshot is `false`, so anything gated on this renders its wide
 * layout during SSR and hydration, then corrects. Returning a guess instead
 * would be a hydration mismatch — the server cannot know the viewport.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // Optional-call, not an assumption: matchMedia is absent in some
      // embedded webviews and in the test environment, and a composer that
      // throws on mount because it could not ask about the viewport is a worse
      // outcome than one that renders its wide layout.
      const media = window.matchMedia?.(query);
      if (media === undefined) return () => {};
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
