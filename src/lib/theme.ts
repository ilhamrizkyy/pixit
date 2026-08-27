"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme store. Shared, because the gallery needs the resolved theme too — the
 * default icon color is black in light and white in dark, so it has to follow
 * the theme as it changes.
 *
 * Two explicit values, Light and Dark. System is not a third value but the
 * DEFAULT: until a choice is made no data-theme is set and the CSS media query
 * decides, so a first visit already matches the OS and keeps following it.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pixle-theme";

/** Fired on same-tab changes; the storage event only covers other tabs. */
const THEME_EVENT = "pixle-theme-change";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs before first paint to stop a flash of the wrong theme. Inlined into
 * <head>, so it must stay dependency-free and defensive: a browser with
 * storage blocked should fall back to the media query, not throw.
 */
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
  }
} catch (e) {}
`;

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

/** The resolved theme: an explicit choice if there is one, else the OS. */
function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage unavailable — fall through to the media query.
  }
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The server cannot know the OS preference; light is the safe assumption. */
function getServerSnapshot(): Theme {
  return "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The preference simply will not persist.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
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
