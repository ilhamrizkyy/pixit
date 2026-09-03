"use client";

import { useRef } from "react";
import { IconPreview } from "@/components/IconPreview";
import { CATEGORIES } from "@/engine/types";
import type { Category } from "@/engine/types";
import { getIcon } from "@/registry";
import { hasSheetFilters, type GallerySettings } from "./settings";

/**
 * The SCREEN'S HEADER — search on the first line, category chips on the second.
 *
 * Both lines answer one question: what is on the screen right now. Search
 * narrows which icons are there; the chips narrow it by category. Everything
 * that changes how an icon is DRAWN — colour, size, shape — is on the body,
 * because the body is what operates the screen.
 *
 * These are recesses in the SCREEN, not wells in the body: the header sits on
 * the pale surface the icons sit on, so it takes that surface's shallow dish
 * rather than the blue holes drilled through the toy's panel.
 */

/* The gallery searches with its own search icon. An icon set reaching for
   someone else's glyphs in its own chrome does not believe its own set. */
const SEARCH_ICON_CELLS =
  getIcon("search")?.cells.map((cell) => (cell === null ? null : "currentColor")) ??
  null;

type GalleryToolbarProps = {
  search: string;
  onSearch: (value: string) => void;
  settings: GallerySettings;
  onOpenFilters: () => void;
  filtersOpen: boolean;
};

export function GalleryToolbar({
  search,
  onSearch,
  settings,
  onOpenFilters,
  filtersOpen,
}: GalleryToolbarProps) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="pixl-field relative flex h-11 min-w-0 flex-1 items-center">
        {SEARCH_ICON_CELLS && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex text-text-muted"
          >
            <IconPreview cells={SEARCH_ICON_CELLS} size={16} />
          </span>
        )}
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search icons…"
          aria-label="Search icons by name or tag"
          className="w-full min-w-0 bg-transparent pr-2 pl-9 text-ui text-text placeholder:text-text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="shrink-0 px-2.5 text-caption text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        )}
      </div>

      {/* Below `lg` there is no body at all, so this is the only way to Colour
          and Size. */}
      <button
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
        aria-label="Display settings"
        className="pixl-key relative flex h-11 w-11 shrink-0 items-center justify-center text-text-muted lg:hidden"
      >
        <FilterGlyph />
        {/* A dot rather than a count: it answers "is anything in here set",
            not "how many". */}
        {hasSheetFilters(settings) && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 size-1.5 rounded-full bg-accent"
          />
        )}
      </button>
    </div>
  );
}

/**
 * Categories as CHIPS ON THE SCREEN — the header's second line.
 *
 * They used to be the mounted key rack; the rack now carries Shape. What moved
 * with them is the thing worth keeping: COLOUR IS AN INDEX, NOT AN ACCENT.
 * Every chip wears its own `--cat` tint at all times, so the row is a legend
 * you learn once and no tint ever means "this one". Selection is carried by
 * WEIGHT instead — an unselected chip is an outline in its tint, a selected one
 * is filled with it. Same colour, different mass.
 *
 * That is also the rule that separates the two controls: chips are flat because
 * they are on the screen, and keys have bodies because they are on the plastic.
 *
 * REAL TABS, so the keyboard matches the picture: one Tab stop for the whole
 * row, then ←/→ between categories and Home/End for the ends. ↑/↓ are left to
 * the page, so a keyboard user is never stranded on the row.
 *
 * Activation is AUTOMATIC — focusing a chip selects it. The APG only asks for
 * manual activation when revealing a panel is expensive, and this one is a
 * filter over an array already in memory.
 */

/** The panel the chips govern. Exported so the panel and the chips cannot
 *  drift apart — `aria-controls` and the element's own id come from one string. */
export const ICON_PANEL_ID = "icon-panel";

export function categoryTabId(id: Category | "all") {
  return `category-tab-${id}`;
}

const TAB_IDS: (Category | "all")[] = ["all", ...CATEGORIES.map((c) => c.id)];
const TAB_LABELS: Record<Category | "all", string> = {
  all: "All",
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
} as Record<Category | "all", string>;

type CategoryChipsProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
};

export function CategoryChips({ settings, onSettings }: CategoryChipsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = Math.max(
    TAB_IDS.findIndex((id) => id === settings.category),
    0,
  );

  function select(index: number) {
    // Wraps, as the APG suggests for a tablist: walking off one end is how you
    // reach the other without dragging a scrolling strip.
    const next = (index + TAB_IDS.length) % TAB_IDS.length;
    onSettings({ ...settings, category: TAB_IDS[next] });
    refs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") select(active + 1);
    else if (event.key === "ArrowLeft") select(active - 1);
    else if (event.key === "Home") select(0);
    else if (event.key === "End") select(TAB_IDS.length - 1);
    // Anything else is the page's — notably ↑/↓, which still have to scroll.
    else return;

    event.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label="Icon categories"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="pixl-chips"
    >
      {TAB_IDS.map((id, index) => {
        const selected = index === active;
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={categoryTabId(id)}
            aria-selected={selected}
            aria-controls={ICON_PANEL_ID}
            // The chip's own tint, bound in CSS rather than inline so no hex
            // reaches a component (DESIGN.md §6).
            data-category={id}
            // Roving tabindex: the row is one stop, arrows do the rest.
            tabIndex={selected ? 0 : -1}
            onClick={() => select(index)}
            className="pixl-chip text-ui"
          >
            {TAB_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

function FilterGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
      <rect x="2" y="4" width="14" height="2" />
      <rect x="4" y="8" width="10" height="2" />
      <rect x="6" y="12" width="6" height="2" />
    </svg>
  );
}
