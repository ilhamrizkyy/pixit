"use client";

import { setTheme, useResolvedTheme, type Theme } from "@/lib/theme";

/**
 * Theme control: two buttons, Light and Dark.
 *
 * They highlight the RESOLVED theme, so on a first visit with a dark OS the
 * Dark button reads as active even though nothing is stored yet. Store logic
 * lives in @/lib/theme, which the gallery shares.
 */

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
];

export function ThemeToggle() {
  const theme = useResolvedTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-sm border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-label={option.label}
          aria-pressed={theme === option.value}
          title={option.label}
          className={`rounded-sm px-2 py-1 text-caption leading-none transition-colors ${
            theme === option.value
              ? "bg-accent-subtle text-accent-ink"
              : "text-text-muted hover:text-text"
          }`}
        >
          <span aria-hidden="true">{option.icon}</span>
        </button>
      ))}
    </div>
  );
}
