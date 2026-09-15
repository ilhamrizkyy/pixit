"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast, type ToastTone } from "@/components/Toast";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { groundFor, recolorCells } from "@/engine/color";
import { renderedIconSize } from "@/engine/constants";
import { searchIcons } from "@/registry/search";
import { CATEGORIES, type IconDef } from "@/engine/types";
import { useLocalIcons } from "@/composer/useLocalIcons";
import { mergeIcons } from "@/registry/merge";
import { THEME_ICON_COLOR, useResolvedTheme } from "@/lib/theme";
import { DetailBar } from "./DetailBar";
import { EmptyState } from "./EmptyState";
import { FilterSheet } from "./FilterSheet";
import { ColorControl } from "./ColorControl";
import { GalleryHero } from "./GalleryHero";
import { ShapeDropdown } from "./ShapeDropdown";
import { SizeControl } from "./SizeControl";
import {
  categoryTabId,
  CategoryChips,
  GalleryToolbar,
  ICON_PANEL_ID,
} from "./GalleryToolbar";
import { IconCard } from "./IconCard";
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

  /* THE DEFAULT COLOUR FOLLOWS THE PAGE THEME AGAIN (2026-09-13).
     It was seeded straight off the OS for one day, by `useSystemIconColor`,
     and that hook existed to break a cycle: while the ground was PAGE-WIDE the
     theme was a function of the colour, so a colour read back off the theme
     closed the loop and the ✕ became a no-op that locked you into whichever
     ground you had landed on.

     Scoping the ground to the region cuts the loop at the other end. The theme
     no longer depends on the colour at all, so the colour is free to depend on
     the theme — which is what keeps the empty field showing black on a light
     page and white on a dark one. The hook was deleted with the cycle. */
  const themeColor = THEME_ICON_COLOR[useResolvedTheme()];
  const activeColor = resolveGalleryColor(settings.colorText, themeColor);

  /**
   * THE GROUND THE ICONS ARE DRAWN ON, derived from the colour they are drawn
   * in (2026-09-13). Phosphor's rule: the display colour is a free choice, so
   * the surface under it cannot also be one — pick white and the region has to
   * go dark or the art is invisible. `groundFor` solves the crossover.
   *
   * IT WENT PAGE-WIDE FOR A DAY AND CAME BACK, and the reference is what
   * settled it. Phosphor writes its palette on <html>, which reads as page-wide
   * and is not: measured, picking white moves the grid from #eeeae3 to #3e3d3a
   * while the hero and the footer stay exactly where they were, because both
   * paint their own ground. With a hero on this page the same logic binds —
   * a wordmark that inverted on every colour pick is not a brand mark, it is a
   * flicker — so the attribute goes on the REGION and the page keeps the
   * theme the OS asked for.
   *
   * A plain attribute rather than an effect: it is derived state, so it belongs
   * in the render. The `setTheme` call this replaced wrote localStorage and
   * fired an event on every change, which was a storage write per keystroke in
   * the hex field.
   */
  const ground = groundFor(activeColor);

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
    /* A PAGE, AND IT SAYS SO (2026-09-13). `.pixl-board` was the last name
       left over from the chassis: a "board" is an object you see all of at
       once, and this is a hero, a gallery and a footer stacked down a document
       that scrolls. */
    <main className="pixl-page">
      {/* THE HEADING IS VISIBLE AGAIN. It was `sr-only` for as long as the page
          was a device — axe demanded a level-one heading and a title bar was
          the one piece of web page a board could not carry, so the product's
          name was hidden from everyone who could see. The hero is where it
          goes. */}
      <GalleryHero count={icons.length} />

      {/* ---- THE GALLERY REGION -----------------------------------------
          `data-ground` repoints the WHOLE palette inside this element and
          nowhere else, so the icons always land on a surface they read against
          while the hero and the footer keep the theme the OS asked for. See the
          note on `ground` above, and the token blocks in globals.css. */}
      <section
        className="pixl-gallery"
        data-ground={ground}
        aria-label="Icon gallery"
      >
        {/* SELECTION IS ANNOUNCED FROM HERE, because this is the one element
            that is mounted whatever is selected.

            It lived on the mini screen while that was the head of the left
            column, then moved into the detail shelf with it — and the shelf
            exists only while an icon is loaded, so the announcer went inside
            the thing that unmounts. A region that unmounts cannot announce that
            it has gone. Politely, because what changed is not where you
            clicked. */}
        <span className="sr-only" aria-live="polite">
          {selected ? `${selected.name} loaded` : "No icon selected"}
        </span>

        {/* ---- The sticky bar -------------------------------------------
            SEARCH AND CATEGORY CHANGE WHICH ICONS ARE HERE; COLOUR, SIZE AND
            SHAPE CHANGE HOW THEY ARE DRAWN. That split was argued from surfaces
            — glass versus plastic — and it turns out to have been about
            information all along, which is why it outlived the board and now
            the sidebar too. Both halves are in one bar because there is no
            second surface to put either on, and the bar keeps them on separate
            rows.

            IT STICKS, which is the one thing the old layout genuinely could not
            do: the board was locked to the viewport, so there was nothing to
            stick to. A page that scrolls can keep the controls with the icons
            they govern. */}
        <div className="pixl-bar">
          {/* SHAPE IS LEFTMOST, then search, then size, then colour (by
              request, 2026-09-13). It is the reference's order with our own
              control in the first seat — and the seat is earned: Shape is the
              only one of the three whose chosen value is a DRAWING, so it reads
              as a mode the row is in rather than a number the row carries.

              EVERY CONTROL IS ONE HEIGHT. They were three different ones, each
              sized to its own contents under its own caption, which made the
              row read as four unrelated widgets that happened to be adjacent.
              The captions went with the unevenness: see SizeControl.tsx for why
              the VALUE stayed when the word went.

              Below `lg` the three display controls are in the filter sheet
              instead, and only one of the two surfaces is ever mounted — which
              is what keeps them from becoming two answers to one question. */}
          <div className="hidden lg:contents">
            <ShapeDropdown settings={settings} onSettings={setSettings} />
          </div>

          <GalleryToolbar
            search={search}
            onSearch={setSearch}
            settings={settings}
            onOpenFilters={() => setFiltersOpen(true)}
            filtersOpen={filtersOpen}
          />

          <div className="hidden lg:contents">
            <SizeControl settings={settings} onSettings={setSettings} />
            <ColorControl
              settings={settings}
              onSettings={setSettings}
              themeColor={themeColor}
            />
          </div>
        </div>

        {/* THE CHIPS LEFT THE BAR (2026-09-13, by request) and sit directly on
            the icons they filter.

            They were on the bar's second row, which made one sticky object out
            of two different questions: the bar changes HOW every icon is drawn,
            the chips change WHICH ones are here. Out of the bar the row is also
            free to scroll horizontally on a phone without dragging the controls
            with it, and the bar goes back to being one line high. */}
        <div className="pixl-chiprow">
          <CategoryChips settings={settings} onSettings={setSettings} />
        </div>

        <div
          id={ICON_PANEL_ID}
          role="tabpanel"
          aria-labelledby={categoryTabId(settings.category)}
          className="pixl-panel"
          /* The hero's "Explore icons" jumps here, and a jump target that is a
             tabpanel is already focusable for the keyboard path. */
          tabIndex={-1}
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
                    : CATEGORIES.find((c) => c.id === settings.category)?.label
                }
                /* CLEARS BOTH, in one press. It used to clear whichever one it
                   guessed was responsible, which meant that with a query AND a
                   category active it cleared the query and left you on the same
                   dead end. One button, everything off. */
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
              /* DENSITY IS THE POINT. A wall of icons is what an icon set looks
                 like; a sparse grid of big cards reads as a product listing and
                 leaves the page mostly whitespace.

                 THE TILE IS FIXED at 64px and does not track the size control.
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
                    tidier CSS but has a history of dropping list semantics from
                    the accessibility tree, so the card stretches instead. */}
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
                      /* CAPPED. The seat is a fixed 64px, so 48 is the largest
                         art it holds — past that the scale is setting the
                         export size and the picture has already stopped
                         changing. */
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

        {/* THE DETAIL SHELF, at the foot of the region rather than inside a
            display's glass. It reports what is on the grid, so it sits under
            it. It exists only while an icon is loaded, and because the page
            scrolls now that is a plain layout change with nothing to reflow
            around it. */}
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
      </section>

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
