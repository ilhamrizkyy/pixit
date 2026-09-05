"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast, type ToastTone } from "@/components/Toast";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { recolorCells } from "@/engine/color";
import { renderedIconSize } from "@/engine/constants";
import { searchIcons } from "@/registry/search";
import { CATEGORIES, type IconDef } from "@/engine/types";
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
  /* THE SHELF LEAVES THE WAY IT ARRIVED. It animated in and then vanished on
     frame one, while the mini screen beside it dematerialises over 310ms — so
     one press of ✕ read as two unrelated events. §5b asks for closes that are
     FASTER than opens, not absent, and every other overlay on this board already
     defers its unmount for exactly this.

     `cancel` is what makes it safe to overtake: picking another icon during the
     150ms must keep the new selection rather than have a pending timer null it.
     Selecting is the common case, so the shelf simply swaps. */
  const shelf = useDismissible(() => setSelected(null), CLOSE_MS.modal);
  const selectIcon = useCallback(
    (icon: IconDef | null) => {
      shelf.cancel();
      setSelected(icon);
    },
    [shelf],
  );
  /* THE GALLERY COULD NOT SHOW A REFUSAL. It held the toast as a bare string
     and rendered `<Toast>` with no `tone`, so everything defaulted to `info` —
     while `useIconActions` sends real refusals through the same channel. "Could
     not copy" arrived bottom-centre, `role="status"`, for 2.2s, when
     INTERACTION.md §7 asks for top-centre, `role="alert"`, for 4.5s. The
     composer has done this correctly since it was built; the public route, which
     almost all traffic lands on, had no error path at all.

     THE NONCE is the other half. `setToast("SVG copied")` twice in a row is a
     no-op in React state, so a second copy produced no new toast and no second
     announcement, and the first toast's clock kept running from the first press.
     §7 names this case exactly: an identical repeated message is a NEW toast. */
  const [notice, setNotice] = useState<{
    text: string;
    tone: ToastTone;
    nonce: number;
  } | null>(null);
  const notify = useCallback((text: string, tone: ToastTone = "info") => {
    setNotice((previous) => ({ text, tone, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  /* THE WAVE IS DEBOUNCED, NOT KEYED ON THE CATEGORY (2026-09-04).

     The grid keyed on `settings.category`, so every category change unmounted
     and remounted all 24 items and restarted `pixl-icon-in` from `opacity: 0`.
     The chips are an AUTOMATIC-ACTIVATION tablist, so holding an arrow key
     fires a change every 30-90ms — and the wave takes 676ms to land its last
     item. Holding the key restarted it roughly seven times, flashing the grid
     empty on each restart, and finished none of them.

     So the FILTER stays instant and the WAVE waits. `--duration-micro` (80ms)
     is transitions.dev's documented intent-delay beat, for exactly this: filter
     the accidental triggers. A fast scrub through the categories now swaps with
     no animation at all, which is what a scrub should look like, and one wave
     lands when you stop. */
  const [wave, setWave] = useState(0);
  const firstWave = useRef(true);
  useEffect(() => {
    // The first render already plays the entrance; bumping it here would
    // replay the whole grid 80ms after load.
    if (firstWave.current) {
      firstWave.current = false;
      return;
    }
    const timer = setTimeout(() => setWave((n) => n + 1), 80);
    return () => clearTimeout(timer);
  }, [settings.category]);

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
      {/* THE PAGE'S HEADING, AND IT CANNOT BE VISIBLE. axe reported
          `page-has-heading-one` on the public route: the board is an OBJECT, and
          every word printed on it is a legend moulded into a part — a title bar
          across the top would be the one piece of web page on a device that has
          spent every other decision not being one. The board's own badge is the
          wordmark and it is `aria-hidden`, being decoration cut into the case.

          So the heading is real, first in the reading order, and off-screen. It
          is the one place the product gets to say what it is to a screen reader
          and to a search engine, both of which arrive with no idea. */}
      <h1 className="sr-only">Pixit pixel icons</h1>

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
          <div className="flex shrink-0 flex-col gap-2 p-3 pb-1 lg:p-5 lg:pb-1">
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
            <div key={wave} className="pixl-grid-swap">
              {visible.length === 0 ? (
                <EmptyState
                  query={search.trim() || undefined}
                  category={
                    settings.category === "all"
                      ? undefined
                      : CATEGORIES.find((c) => c.id === settings.category)
                          ?.label
                  }
                  /* CLEARS BOTH, in one press. It used to clear whichever one
                     it guessed was responsible, which meant that with a query
                     AND a category active it cleared the query and left you on
                     the same dead end. One button, everything off. */
                  onReset={
                    search.trim() || settings.category !== "all"
                      ? () => {
                          setSearch("");
                          setSettings({ ...settings, category: "all" });
                        }
                      : undefined
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
                  className="grid list-none grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-3 p-1"
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
                        onSelect={selectIcon}
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
              nothing reflows.

              BELOW `lg` ONLY, since 2026-09-03. The desktop board has a detail
              PANEL in a column of its own, which can show the source; a strip
              inside the glass cannot, without growing. Down here it is the only
              surface there is — the whole left side of the board is hidden on a
              phone (BACKLOG §J) — so it stays, and it keeps the document-level
              Escape for every width, because it is mounted at every width. */}
          {/* THE DETAIL SHELF, inside the glass and along the bottom of the
              screen. It reports what is on the screen, so it is on the screen.

              IT WAS A RIGHT-HAND SIDEBAR FOR TWO PASSES and neither worked: a
              fourth CHASSIS column that rebuilt the case to hold a readout
              about the display, then a panel floating on the glass that covered
              the icons it was describing. Horizontal at the foot is where a
              readout about the picture goes.

              It exists only while an icon is loaded: the grid above simply gets
              shorter, and because it scrolls inside itself nothing reflows. */}
          {selected && (
            <DetailBar
              closing={shelf.closing}
              icon={selected}
              displayCells={displayCells.get(selected.id) ?? selected.cells}
              cellStyle={settings.cellStyle}
              size={settings.size}
              onClose={shelf.requestClose}
              onNotify={notify}
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

      {notice && (
        <Toast
          key={notice.nonce}
          message={notice.text}
          tone={notice.tone}
          onDismiss={() => setNotice(null)}
        />
      )}
    </main>
  );
}
