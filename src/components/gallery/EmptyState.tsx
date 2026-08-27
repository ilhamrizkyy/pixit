"use client";

import { GRID_SIZE } from "@/engine/constants";

/**
 * Shown when a search or filter matches nothing.
 *
 * Uses the pixel-grid motif rather than a generic message, and — importantly —
 * offers the way out. A dead end that only says "nothing found" leaves the
 * visitor to work out for themselves that the filter is the problem.
 *
 * The pattern is deterministic, not random, so it does not reshuffle on every
 * keystroke while someone types a failing search.
 */

/** A sparse diagonal scatter, derived from the grid so it stays on-brand. */
const PATTERN = Array.from({ length: GRID_SIZE * 3 }, (_, i) => (i * 7) % 5 === 0);

type EmptyStateProps = {
  query?: string;
  /** Present when anything is actually filtering; absent when the set is empty. */
  onReset?: () => void;
  resetLabel?: string;
};

export function EmptyState({ query, onReset, resetLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <div
        aria-hidden="true"
        className="grid grid-cols-11 gap-[3px]"
        style={{ width: "min(11rem, 60vw)" }}
      >
        {PATTERN.map((filled, i) => (
          <div
            key={i}
            className="aspect-square bg-text-faint"
            style={{ opacity: filled ? 0.9 : 0.15 }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-ui text-text">
          {query ? (
            <>
              No icons match{" "}
              <span className="font-data text-text-muted">
                &ldquo;{query}&rdquo;
              </span>
            </>
          ) : (
            "No icons match that filter"
          )}
        </p>
        <p className="text-caption text-text-muted">
          Try a broader term, or search by tag — icons carry several.
        </p>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-sm border border-border bg-surface px-4 py-2 text-ui text-text transition-colors hover:border-text-faint"
        >
          {resetLabel ?? "Clear search"}
        </button>
      )}
    </div>
  );
}
