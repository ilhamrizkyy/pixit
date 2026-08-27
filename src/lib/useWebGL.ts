"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

function probe(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    cached = false;
  }
  return cached;
}

const noop = () => () => {};

/**
 * Whether this browser can render WebGL.
 *
 * A real capability check, not a nice-to-have: WebGL is missing or disabled in
 * headless browsers, some embedded webviews, older hardware, and behind certain
 * privacy settings. Anything drawn with it therefore needs a fallback that
 * still WORKS, not merely a blank box.
 *
 * Server snapshot is `false`, so the fallback is what renders during SSR and
 * hydration and the 3D swaps in afterwards — a guess would be a mismatch, since
 * the server cannot know the client's GPU.
 */
export function useWebGL(): boolean {
  return useSyncExternalStore(noop, probe, () => false);
}
