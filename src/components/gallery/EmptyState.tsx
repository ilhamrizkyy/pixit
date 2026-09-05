"use client";

import Link from "next/link";
import { GRID_SIZE } from "@/engine/constants";

/**
 * Shown when a search or filter matches nothing.
 *
 * Uses the pixel-grid motif rather than a generic message, and, importantly,
 * offers the way out. A dead end that only says "nothing found" leaves the
 * visitor to work out for themselves that the filter is the problem.
 *
 * IT NAMES EVERY FILTER THAT IS ACTUALLY ON (2026-09-04). With a category and a
 * query both active it said `No icons match "arrow"` when arrows plainly exist
 * and the CATEGORY was what excluded them, then offered to clear only the
 * query — so the one screen whose whole job is to diagnose a dead end was
 * misdiagnosing it and handing back a fix that did not work.
 *
 * The pattern is deterministic, not random, so it does not reshuffle on every
 * keystroke while someone types a failing search.
 */

/** A sparse diagonal scatter, derived from the grid so it stays on-brand. */
const PATTERN = Array.from({ length: GRID_SIZE * 3 }, (_, i) => (i * 7) % 5 === 0);

type EmptyStateProps = {
  query?: string;
  /** The live category's label, when one is narrowing the set. */
  category?: string;
  /** Present when anything is actually filtering; absent when the set is empty. */
  onReset?: () => void;
};

export function EmptyState({ query, category, onReset }: EmptyStateProps) {
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
          {query && category ? (
            <>
              No{" "}
              <span className="font-data text-text-muted">{category}</span>{" "}
              icons match{" "}
              <span className="font-data text-text-muted">
                &ldquo;{query}&rdquo;
              </span>
            </>
          ) : query ? (
            <>
              No icons match{" "}
              <span className="font-data text-text-muted">
                &ldquo;{query}&rdquo;
              </span>
            </>
          ) : category ? (
            <>
              No icons in{" "}
              <span className="font-data text-text-muted">{category}</span>
            </>
          ) : (
            "No icons yet"
          )}
        </p>
        <p className="text-caption text-text-muted">
          Every icon is tagged. Try one word: arrow, media, folder.
        </p>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-sm border border-border bg-surface px-4 py-2 text-ui text-text transition-colors hover:border-text-faint"
        >
          {/* NAMES THE OUTCOME, not the widget. It said "Clear search", which
              is the accessible name the field's own ✕ already carries — two
              controls, one name, on screen together. Naming what you GET
              instead is both distinct and true of all three cases. */}
          Show all icons
        </button>
      )}

      {/* A FAILED SEARCH IS THE BEST MOMENT IN THE PRODUCT TO REACH CONTRIBUTE,
          and this screen led nowhere. The Contribute page's own copy says a
          missing icon somebody keeps reaching for is the most valuable thing
          they can send, "because the set grows by what people actually need" —
          and the person standing here is by definition that person.

          Quiet, and second: the reset above is still the primary way out, since
          most failed searches are a typo rather than a gap in the set. At 24
          icons the gap is the more likely of the two, which is exactly why this
          is worth the line. */}
      {onReset && (
        <Link
          href="/contribute"
          className="text-caption text-text-muted underline underline-offset-4 transition-colors hover:text-text"
        >
          Request an icon
        </Link>
      )}
    </div>
  );
}
