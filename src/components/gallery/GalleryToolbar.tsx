"use client";

import { useLayoutEffect, useRef } from "react";
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
 * BOTH ARE DRAWN, NOT MOULDED. They sit on the glass, and the board's rule is
 * that depth belongs to the plastic — so the field's boundary is a real line
 * rather than a fake recess, and the chips carry no raised face. That rule was
 * being read as "therefore generic", which is what left this header as the last
 * piece of the pre-board design still standing. It is not what the rule says:
 * the dot matrix, the segment readout and Pixel Materialize are all flat, all
 * drawn on glass, and all unmistakably this device.
 */

/* The gallery draws its own chrome from its own set. An icon set reaching for
   someone else's glyphs does not believe its own set — so the search field
   carries `search`, and every category chip is indexed by `play`.

   Cells remapped to `currentColor`, which is what lets one drawing serve seven
   categories: the mark inherits `--cat-ink` from the chip it sits in, so no hex
   ever reaches a component (DESIGN.md §6). */
const asChrome = (id: string) =>
  getIcon(id)?.cells.map((cell) => (cell === null ? null : "currentColor")) ??
  null;

const SEARCH_ICON_CELLS = asChrome("search");
const CHIP_ICON_CELLS = asChrome("play");

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
    /* GROWS INTO THE BAR. It was sized to its own content, which on the
       sticky row left the search field at ~220px beside 500px of display
       controls — the widest control on the page being the narrowest one. */
    <div className="pixl-searchbar flex min-w-0 flex-1 items-stretch gap-2">
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
          /* THE USEFUL HALF WAS HIDDEN IN THE ACCESSIBLE NAME, where sighted
             users never see it: the placeholder said "Search icons…" while only
             a screen reader was told it matches tags. The field's own glyph
             already says "search", so the word was doing no work. It also now
             matches the composer's import picker, which has said this all
             along — two search fields on one product saying two things. */
          placeholder="Search by name or tag"
          aria-label="Search icons"
          className="w-full min-w-0 bg-transparent pr-2 pl-9 text-ui text-text placeholder:text-text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            /* 24x24 MINIMUM (WCAG 2.5.8 AA). It measured 27x18 at a 12px glyph,
               inside a 44px-tall container with the room to spare. */
            className="grid size-6 shrink-0 mr-2 place-items-center rounded-sm text-caption text-text-muted transition-colors hover:text-text"
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
        className="pixl-screen-key relative flex h-11 w-11 shrink-0 items-center justify-center text-text-muted lg:hidden"
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
 * THE FILL TRAVELS (2026-09-04). It repainted in place while the board's other
 * tablist — the detail shelf's format tabs — slides, so one device spoke two
 * selection languages. It cannot borrow that build as-is, because a travelling
 * accent bar would be a second accent and §7 forbids it; a travelling FILL
 * breaks neither rule. It is a transition on `transform`, never on `width`, so
 * a held arrow key produces one continuous slide that retargets rather than
 * restarting — which matters here more than anywhere, because this is an
 * automatic-activation tablist and key repeat fires it every 30-90ms.
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
  const fillRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const active = Math.max(
    TAB_IDS.findIndex((id) => id === settings.category),
    0,
  );

  /* THE FILL IS MEASURED, NOT GUESSED. Same mechanism the detail shelf's format
     rule uses: JS writes the live chip's box, CSS owns the tween.

     THE TINT IS SET INSTANTLY AND ONLY THE GEOMETRY ANIMATES. Tweening the
     background between two tints would paint unmeasured intermediate colours
     under a label, and DESIGN.md §6 measured these tints for AA. */
  useLayoutEffect(() => {
    const fill = fillRef.current;
    const chip = refs.current[active];
    if (fill === null || chip === null || chip === undefined) return;

    const move = () => {
      fill.style.transform = `translateX(${chip.offsetLeft}px)`;
      fill.style.width = `${chip.offsetWidth}px`;
    };
    /* FIRST PAINT WRITES THE POSITION WITH THE TRANSITION SUSPENDED, or the
       fill grows out of the row's left edge every time the gallery mounts. */
    if (placed.current) {
      move();
      return;
    }
    const previous = fill.style.transition;
    fill.style.transition = "none";
    move();
    void fill.offsetWidth;
    fill.style.transition = previous;
    placed.current = true;
  }, [active]);

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
      {/* Behind every chip, wearing the LIVE category's tint. Decorative: the
          selection is already on the chips themselves via `aria-selected`. */}
      <span
        ref={fillRef}
        aria-hidden="true"
        data-category={TAB_IDS[active]}
        className="pixl-chip-fill"
      />
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
            className="pixl-chip"
          >
            {/* THE MARK. Decorative: the chip's accessible name is already the
                category, and a second reading of it would be noise. Rendered on
                every chip and revealed only on the live one — see the CSS for
                why it is not conditionally mounted. */}
            {CHIP_ICON_CELLS && (
              <span aria-hidden="true" className="pixl-chip-mark flex">
                <IconPreview cells={CHIP_ICON_CELLS} size={14} />
              </span>
            )}
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
