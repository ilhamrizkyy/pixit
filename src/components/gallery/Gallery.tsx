"use client";

import { useMemo, useState } from "react";
import { Toast } from "@/components/Toast";
import { recolorCells } from "@/engine/color";
import { renderedIconSize } from "@/engine/constants";
import { searchIcons } from "@/registry/search";
import type { IconDef } from "@/engine/types";
import { useLocalIcons } from "@/composer/useLocalIcons";
import { mergeIcons } from "@/registry/merge";
import { THEME_ICON_COLOR, useResolvedTheme } from "@/lib/theme";
import { DetailBar } from "./DetailBar";
import { EmptyState } from "./EmptyState";
import { FilterSheet } from "./FilterSheet";
import { GallerySidebar } from "./GallerySidebar";
import {
  categoryTabId,
  CategoryChips,
  GalleryToolbar,
  ICON_PANEL_ID,
} from "./GalleryToolbar";
import { IconCard } from "./IconCard";
import { MiniScreen } from "./MiniScreen";
import { SizeScale } from "./SizeScale";
import {
  DEFAULT_SETTINGS,
  resolveGalleryColor,
  type GallerySettings,
} from "./settings";

/**
 * The public gallery — and, as of the board rebuild, THE TOY ITSELF.
 *
 * DESIGN.md §1 has claimed since it was rewritten that the whole product is the
 * toy, and until now only the chrome believed it. The board makes the mapping
 * literal:
 *
 *   the icon grid  IS the screen         — recessed, near-white, art on glass
 *   the mini screen IS a second display  — what replaced the detail modal
 *   the sidebar    IS the body           — moulded plastic, and it OPERATES the
 *                                          screen: colour, size, shape
 *
 * The split that keeps it coherent: the SCREEN carries what changes *which*
 * icons are shown (search, category, and the readout of the one you picked),
 * the BODY carries what changes *how* they are drawn (colour, size, shape).
 * Every control is on the surface whose job it shares, which is why nothing
 * needs a heading to explain where it lives.
 *
 * Read-only by design — browse, search, filter, copy, download. Nothing here
 * mutates an icon.
 */

type GalleryProps = { icons: readonly IconDef[] };

export function Gallery({ icons: registry }: GalleryProps) {
  // Icons the owner saved in the composer join the published set after mount.
  // They are browser-local until Phase 3 persists them for real.
  const local = useLocalIcons();
  const icons = useMemo(() => mergeIcons(registry, local), [registry, local]);
  // Only the local icons that actually SURVIVED the merge. Building this from
  // the raw local list would badge a published icon as local whenever an id
  // collided — the registry wins that collision, so it is a registry icon.
  const localIds = useMemo(() => {
    const published = new Set(registry.map((icon) => icon.id));
    return new Set(
      local.filter((icon) => !published.has(icon.id)).map((icon) => icon.id),
    );
  }, [registry, local]);

  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<GallerySettings>(DEFAULT_SETTINGS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<IconDef | null>(null);
  const [toast, setToast] = useState("");

  const theme = useResolvedTheme();
  const themeColor = THEME_ICON_COLOR[theme];
  const activeColor = resolveGalleryColor(settings.colorText, themeColor);

  /**
   * Search matches name + tags (INTERACTION.md §6). The rule itself lives in
   * `@/registry/search`, because the composer's import picker searches the same
   * set and two copies of one match rule is one copy that gets left behind.
   */
  const searched = useMemo(() => searchIcons(icons, search), [icons, search]);

  const visible = useMemo(
    () =>
      settings.category === "all"
        ? searched
        : searched.filter((icon) => icon.category === settings.category),
    [searched, settings.category],
  );

  /**
   * Display cells, keyed by icon id. The registry records are never modified —
   * this is a parallel map consulted only when drawing.
   */
  const displayCells = useMemo(() => {
    const map = new Map<string, IconDef["cells"]>();
    for (const icon of icons) {
      map.set(icon.id, recolorCells(icon.cells, activeColor));
    }
    return map;
  }, [icons, activeColor]);

  return (
    <main className="pixl-board">
      {/* `min-h-0` is what lets the grid inside scroll instead of the page.
          Without it a flex child refuses to shrink below its content and the
          whole board grows past the viewport.

          The gap is the SAME token as the board's own padding: they were
          different numbers, so the mini screen had air to the board's edge and
          none at all to the screen beside it — which reads as a missing gap
          rather than as two values. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[var(--board-gutter)] lg:flex-row lg:items-start">
        {/* ---- The board's left column: screen over body ------------------
            Hidden below `lg`, like the body it belongs to. Shape moved into the
            Display pad, so there is nothing left in this column that has to
            survive on a phone — the filter sheet carries all three controls
            down there. */}
        {/* `min-h-0` + `self-stretch` bound this column to the board, and the
            mini screen inside gives up height before anything scrolls — a
            device with a shorter case has a shorter screen. Only a genuinely
            small window gets past the screen's floor and scrolls the column;
            the board itself never grows past the viewport, which is the rule
            the whole layout is built on. */}
        <div className="relative z-10 hidden min-h-0 shrink-0 flex-col lg:flex lg:w-66 lg:self-stretch">
          {/* THE SCROLL IS THE CONTENT'S, NOT THE CASE'S. The screen and the
              pads scroll on a short window — the mini screen gives up height
              first, and only past its floor does anything move. The badge
              printed on the case is not part of that: it is moulding, so it
              sits OUTSIDE this box and stays on the bottom edge where it was
              printed. Inside it, it slid up over the controls. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <MiniScreen
              icon={selected}
              displayCells={
                selected
                  ? (displayCells.get(selected.id) ?? selected.cells)
                  : null
              }
              cellStyle={settings.cellStyle}
            />
            <GallerySidebar
              settings={settings}
              onSettings={setSettings}
              themeColor={themeColor}
            />
          </div>

          {/* ---- The case's own badge ---------------------------------------
              THE WORDMARK PRINTED INTO THE BOTTOM-LEFT CORNER, which is where
              most of the devices on the reference sheet carry theirs. It is
              what the slack under the controls is for: a panel with the
              product's name along its foot is a finished side, and the same
              panel without one is not.

              PRINTED, NOT ENGRAVED. A real cut was built first — a gradient
              inside each glyph, shaded wall to lit floor — and it worked and
              was still wrong for the object: the case this copies prints its
              badge in one flat ink. See globals.css for the three passes.

              Decorative and `aria-hidden`: the page's real wordmark is in the
              nav, and this is what is printed on the case. */}
          <p aria-hidden="true" className="pixl-board-legend">
            PIXIT
          </p>
        </div>

        {/* ---- The screen --------------------------------------------------
            Between the body and the size rail, so the board reads as one row of
            parts: controls, picture, scale. */}
        <div className="pixl-screen flex min-h-0 min-w-0 flex-1 flex-col self-stretch">
          {/* SEARCH AND CATEGORY ARE THE SCREEN'S HEADER. Both answer "what is
              on the screen right now", and both line up with the icons they
              filter. Colour, size and shape are on the body, because they are
              about how an icon is drawn rather than which ones are here. */}
          {/* More air than the panel started with. The header and the grid
              share one inset so the chips line up with the icons they filter,
              and the screen needs a margin the way a printed page does — at
              `p-2` the first row of icons sat against the glass. */}
          <div className="flex shrink-0 flex-col gap-2 p-3 lg:p-5">
            <GalleryToolbar
              search={search}
              onSearch={setSearch}
              settings={settings}
              onOpenFilters={() => setFiltersOpen(true)}
              filtersOpen={filtersOpen}
            />
            <CategoryChips settings={settings} onSettings={setSettings} />
          </div>

          {/* THE ONLY SCROLL ON THE PAGE. The board is sized to the viewport,
              so nothing outside the glass moves — the icons scroll under a
              fixed header the way content moves on a screen, rather than the
              whole device sliding up the page. */}
          <div
            id={ICON_PANEL_ID}
            role="tabpanel"
            aria-labelledby={categoryTabId(settings.category)}
            className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-5"
          >
            {/* Keyed on the category so the wave REPLAYS on every switch.
                Deliberately not keyed on the search text as well — that changes
                on each keystroke, and re-running an entrance animation per
                character is the flicker, not the cure. */}
            <div key={settings.category} className="pixl-grid-swap">
              {visible.length === 0 ? (
                <EmptyState
                  query={search.trim() || undefined}
                  // Clear whichever thing is actually hiding the icons: the
                  // search if there is one, otherwise the category filter.
                  onReset={
                    search.trim()
                      ? () => setSearch("")
                      : settings.category !== "all"
                        ? () => setSettings({ ...settings, category: "all" })
                        : undefined
                  }
                  resetLabel={
                    search.trim() ? "Clear search" : "Show all categories"
                  }
                />
              ) : (
                /* DENSITY IS THE POINT. A wall of icons is what an icon set
                   looks like; a sparse grid of big cards reads as a product
                   listing and leaves the page mostly whitespace.

                   THE TILE IS FIXED at 64px and does not track the size slider.
                   A grid whose cells resize when you drag Size reflows the whole
                   page under the cursor, and the thing you are trying to judge —
                   how the icon looks — moves while you judge it. 64px with 8px
                   padding leaves exactly 48px, the top of the size scale, so the
                   largest icon fills its seat without ever overflowing. */
                <ul
                  aria-label="Icons"
                  className="grid list-none grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2 p-1"
                >
                  {/* Each li IS the grid item. `display: contents` would be
                      tidier CSS but has a history of dropping list semantics
                      from the accessibility tree, so the card stretches
                      instead. */}
                  {visible.map((icon, index) => (
                    <li
                      key={icon.id}
                      /* Its place in the wave. A number, not a colour — the rule
                         DESIGN.md §6 sets about inline style is about keeping
                         palette out of components. */
                      style={{ "--i": index } as React.CSSProperties}
                    >
                      <IconCard
                        icon={icon}
                        cells={displayCells.get(icon.id) ?? icon.cells}
                        /* CAPPED. The seat is a fixed 64px, so 48 is the
                           largest art it holds — past that the scale is
                           setting the export size and the picture has already
                           stopped changing. */
                        size={renderedIconSize(settings.size)}
                        cellStyle={settings.cellStyle}
                        selected={selected?.id === icon.id}
                        local={localIds.has(icon.id)}
                        onSelect={setSelected}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* INSIDE THE GLASS, as the display's own bottom shelf — not a strip
              of chassis under it. It reports what is on the screen, so it is on
              the screen. It exists only while an icon is loaded: the panel above
              simply gets shorter, and because the grid scrolls inside itself
              nothing reflows. */}
          {selected && (
            <DetailBar
              icon={selected}
              displayCells={displayCells.get(selected.id) ?? selected.cells}
              cellStyle={settings.cellStyle}
              size={settings.size}
              onClose={() => setSelected(null)}
              onNotify={setToast}
            />
          )}
        </div>

        {/* ---- The size rail ----------------------------------------------
            ON THE BOARD'S RIGHT EDGE, past the screen — the one side of the
            chassis that carried nothing. It is on the CHASSIS and not on the
            glass because size changes HOW an icon is drawn, which is the body's
            job; a slider printed on a display would be the one control claiming
            to be hardware sitting on top of the picture.

            It stands here rather than in the Display pad because a scale wants
            LENGTH: fourteen stops need the screen's full height to print
            without crowding, and the pad is 264px wide. Hidden below `lg` with
            the rest of the body — the filter sheet carries the horizontal
            build. */}
        <div className="hidden shrink-0 self-stretch lg:flex lg:items-center">
          <SizeScale
            size={settings.size}
            onSize={(size) => setSettings({ ...settings, size })}
            orientation="vertical"
            id="board-size"
          />
        </div>
      </div>

      {filtersOpen && (
        <FilterSheet
          settings={settings}
          themeColor={themeColor}
          onApply={setSettings}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </main>
  );
}
