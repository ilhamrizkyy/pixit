"use client";

import { useMemo, useState } from "react";
import { IconPreview } from "@/components/IconPreview";
import { recolorCells } from "@/engine/color";
import type { IconDef } from "@/engine/types";
import { THEME_ICON_COLOR, useResolvedTheme } from "@/lib/theme";
import { useDialog } from "@/lib/useDialog";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { icons as registryIcons } from "@/registry";
import { searchIcons } from "@/registry/search";
import { mergeIcons } from "@/registry/merge";
import { useLocalIcons } from "./useLocalIcons";

/**
 * Import — pick an icon from the set and bring its art onto the board.
 *
 * This REPLACED a file picker that read an SVG off disk. Reaching an icon that
 * is already in the gallery by exporting it and uploading it back is a round
 * trip through the filesystem to arrive where you started, and it was the only
 * route to editing published art.
 *
 * It brings the ART ONLY — name, category and tags are left alone. That is
 * exact parity with the file import it replaces, and it is what keeps the
 * action from dead-ending: an id is immutable once published, so loading
 * `arrow-right`'s NAME would hand you a board that Save and Copy entry both
 * refuse. Editing a published icon in place is a separate feature (the update
 * half of owner CRUD) and is not this.
 *
 * Locally saved icons appear alongside the registry, marked, because an icon
 * you saved in this browser is one you are most likely to want back.
 */

type ImportPickerProps = {
  onPick: (icon: IconDef) => void;
  onClose: () => void;
};

export function ImportPicker({ onPick, onClose }: ImportPickerProps) {
  const [query, setQuery] = useState("");
  const local = useLocalIcons();
  const theme = useResolvedTheme();
  const { closing, requestClose } = useDismissible(onClose, CLOSE_MS.modal);
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(requestClose);

  const all = useMemo(() => mergeIcons(registryIcons, local), [local]);
  const results = useMemo(() => searchIcons(all, query), [all, query]);
  // Published ids, for marking the rest as browser-only. Computed once: the
  // registry is a module constant and cannot change while this is open.
  const published = useMemo(() => new Set(registryIcons.map((icon) => icon.id)), []);

  // The stored art is baked near-black, which is invisible on a dark ground.
  // Recolouring is DISPLAY ONLY and never reaches what gets imported — the
  // icon handed to `onPick` carries its own cells, untouched (CLAUDE.md §2).
  const ink = THEME_ICON_COLOR[theme];

  return (
    <div
      className={`pixl-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-text/45 p-4 ${
        closing ? "is-closing" : ""
      }`}
      onClick={requestClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-picker-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className={`pixl-modal flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-bg shadow-[var(--shadow-overlay)] outline-none ${
          closing ? "is-closing" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="import-picker-title" className="text-h3">
            Import icon
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close without importing"
            className="rounded-sm px-2 text-body text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <label htmlFor="import-search" className="sr-only">
            Search icons
          </label>
          <input
            id="import-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or tag"
            autoComplete="off"
            className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-ui text-text focus:border-accent focus:outline-none"
          />
        </div>

        {results.length === 0 ? (
          <p className="px-5 py-10 text-center text-ui text-text-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul className="grid list-none grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-5">
            {results.map((icon) => {
              const isLocal = !published.has(icon.id);
              return (
                <li key={icon.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(icon);
                      requestClose();
                    }}
                    /* The name is VISIBLE here, unlike the gallery card. A
                       gallery card hides it to stay square in a lattice; a
                       picker exists to find one named thing, so hiding the
                       name behind hover would be hiding the only thing you
                       are scanning for — and hover does not exist on touch. */
                    aria-label={isLocal ? `${icon.name} (saved locally)` : icon.name}
                    className={`flex w-full flex-col items-center gap-1.5 rounded-md border p-2.5 transition-colors hover:border-accent hover:bg-accent-subtle focus-visible:border-accent focus-visible:outline-none ${
                      isLocal ? "border-dashed border-text-faint" : "border-border"
                    }`}
                  >
                    <IconPreview cells={recolorCells(icon.cells, ink)} size={32} />
                    <span className="w-full truncate text-center font-data text-caption text-text-muted">
                      {icon.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
