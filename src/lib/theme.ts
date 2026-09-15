"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme store — and as of 2026-09-13 it is READ-ONLY: the OS decides, and
 * nothing on the site overrides it.
 *
 * THE TOGGLE IS GONE, which is the reference's shape (phosphoricons.com ships
 * no theme control at all), and removing the CONTROL without removing the
 * STORAGE would have been the worse half of the job. `setTheme` wrote
 * `localStorage` and the init script read it back before first paint — so
 * anybody who had pressed Dark on an earlier visit would keep a dark page
 * forever, with the one control that could change it no longer on the page. A
 * preference nobody can revise is not a preference, it is a stuck state.
 *
 * So the whole layer went: the key, the same-tab event, the pre-paint init
 * script and the setter. What is left is a subscription to
 * `prefers-color-scheme`, which needs no script to avoid a flash because the
 * media query is applied by the stylesheet at parse time.
 *
 * `[data-theme]` SURVIVES IN THE STYLESHEET, deliberately. Nothing sets it now,
 * so `:root[data-theme="dark"]` simply never matches and the media query's
 * `:not([data-theme="light"])` is always true — the CSS behaves correctly with
 * the attribute absent. It is kept because `[data-ground="dark"]` rides that
 * same rule as a second selector, and because a theme control is a decision
 * that could come back. That is a real exception to the rule about tokens kept
 * for consumers that do not exist (DESIGN.md §2): this one HAS a live consumer.
 *
 * THE GALLERY'S GROUND IS A DIFFERENT THING and does not come through here. It
 * is derived from the icon colour by `groundFor` and scoped to the gallery
 * region, so a page can be light while the icons sit on a dark surface.
 */

export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The server cannot know the OS preference; light is the safe assumption. */
function getServerSnapshot(): Theme {
  return "light";
}

/**
 * The theme actually in effect. Read through useSyncExternalStore rather than
 * an effect, so server and client renders stay consistent.
 */
export function useResolvedTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The icon color each theme defaults to. Icons always render in one color, so
 * this is a real default rather than a fallback — there is no "no color" state.
 */
export const THEME_ICON_COLOR: Record<Theme, string> = {
  light: "#000000",
  dark: "#ffffff",
};
