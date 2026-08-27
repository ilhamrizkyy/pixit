"use client";

import { useState } from "react";
import type { Category } from "@/engine/types";
import { useDialog } from "@/lib/useDialog";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { GalleryControls } from "./GalleryControls";
import {
  DEFAULT_SETTINGS,
  resolveGalleryColor,
  type GallerySettings,
} from "./settings";

/**
 * Mobile filter surface: a bottom sheet with Reset and Apply.
 *
 * DRAFT SEMANTICS. An Apply button only means something if changes are held
 * until it is pressed, so the sheet edits a copy and commits on Apply.
 * Dismissing — backdrop, ✕, or Escape — discards. Reset commits the defaults
 * and closes, which is why it does not simply clear the draft: since
 * dismissing discards, clearing-and-closing would change nothing at all.
 *
 * The draft is seeded from `settings` at mount, and the sheet is only rendered
 * while open, so every open starts from the live values with no effect needed
 * to resynchronise.
 */

type FilterSheetProps = {
  settings: GallerySettings;
  onApply: (next: GallerySettings) => void;
  onClose: () => void;
  /** Icon color for the current theme, for resolving the draft's swatch. */
  themeColor: string;
  counts: Record<Category, number>;
  total: number;
};

export function FilterSheet({
  settings,
  onApply,
  onClose,
  themeColor,
  counts,
  total,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<GallerySettings>(settings);
  const { closing, requestClose } = useDismissible(onClose, CLOSE_MS.sheet);
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(requestClose);

  // The swatch has to track the DRAFT, not the committed settings.
  const draftColor = resolveGalleryColor(draft.colorText, themeColor);

  return (
    <div
      className={`pixl-sheet-backdrop fixed inset-0 z-50 flex items-end bg-text/45 lg:hidden ${
        closing ? "is-closing" : ""
      }`}
      onClick={requestClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className={`pixl-sheet relative flex max-h-[85vh] w-full flex-col rounded-t-lg bg-bg shadow-[var(--shadow-overlay)] outline-none ${
          closing ? "is-closing" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="filter-sheet-title" className="text-h3">
            Filters
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close without applying"
            className="rounded-sm px-2 text-body text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
          <GalleryControls
            settings={draft}
            onChange={setDraft}
            color={draftColor}
            counts={counts}
            total={total}
            showSectionReset={false}
          />
        </div>

        {/* Sits below the scroll area, so the actions stay reachable however
            long the controls get. */}
        <div className="flex gap-3 border-t border-border px-6 py-4">
          {/* Reset COMMITS defaults and closes. It cannot merely reset the
              draft: dismissing discards, so a reset that closed without
              committing would be a no-op. */}
          <button
            type="button"
            onClick={() => {
              onApply(DEFAULT_SETTINGS);
              requestClose();
            }}
            className="flex-1 rounded-sm border border-border bg-surface px-4 py-3 text-ui text-text"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              requestClose();
            }}
            className="flex-1 rounded-sm border border-accent bg-accent px-4 py-3 text-ui font-bold text-bg"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
