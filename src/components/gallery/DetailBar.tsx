"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  COPY_FORMATS,
  FORMAT_LABELS,
  type CopyFormat,
} from "@/engine/formats";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import type { Cells, IconDef } from "@/engine/types";
import type { ToastTone } from "@/components/Toast";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { useIconActions } from "./useIconActions";

/**
 * THE DETAIL SHELF — along the bottom of the screen, inside the glass.
 *
 * A device puts its readout on the screen and its controls on the chassis under
 * it. Keeping both inside the mini screen's frame is what made the board's left
 * column fat: a four-tag icon added ~110px of text to a panel 264px wide, and
 * the whole side of the device grew to hold it. Down here the same content has
 * the full width of the board.
 *
 * TWO COLUMNS, NOT THREE LINES (2026-09-03). It stacked readout / tabs / source
 * down the full width, which left the name and the category adrift in a mostly
 * empty line while the source under them ran the whole board. Split, the shelf
 * reads as the two things it actually holds: an IDENTITY on the left — name,
 * tags, category, and the one action almost everyone came for, in that reading
 * order — and the SOURCE on the right with the tabs that choose its format
 * sitting on top of it and the Close at the far end of them.
 *
 * FORMATS, NOT FRAMEWORKS. See engine/formats.ts: Lucide can offer eight
 * framework tabs because it ships eight packages, and we ship none.
 *
 * ONE SURFACE AT EVERY WIDTH. It was split into a desktop panel and a phone bar
 * for one pass, which is two accessibility trees for one readout. Below `lg`
 * the two columns simply stack.
 *
 * ESCAPE LIVES HERE, at the document. This component is mounted exactly when
 * something is selected, so the listener's lifetime is the state it clears. It
 * has to be at the document because nothing here ever takes focus: after
 * clicking a card the focus is still on the card. It steps aside for anything
 * inside a real dialog, so the filter sheet still owns its own — and for the
 * copy MENU below, which closes on Escape before the selection does.
 *
 * WHAT YOU SEE IS WHAT YOU COPY. Every format is built from `displayCells` and
 * the same `cellStyle` the screen draws with, so the gallery's colour, cell
 * shape and size travel with whatever leaves.
 */

type DetailBarProps = {
  /** True while the shelf is playing its exit, before Gallery unmounts it. */
  closing?: boolean;
  icon: IconDef;
  /** Cells with the gallery's display settings already applied. */
  displayCells: Cells;
  cellStyle?: CellStyle;
  /** The gallery's size scale, in px. Sets the export's dimensions. */
  size: number;
  onClose: () => void;
  onNotify: (message: string, tone?: ToastTone) => void;
};

export function DetailBar({
  closing = false,
  icon,
  displayCells,
  cellStyle = DEFAULT_CELL_STYLE,
  size,
  onClose,
  onNotify,
}: DetailBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  /* THE MENU IS HELD FOR ITS CLOSE. It unmounts on close, so a closing
     animation has nothing to play on unless the unmount is deferred — and
     `useDismissible` already skips the wait for anyone who asked for less
     motion, which is the half a bare `setTimeout` gets wrong. */
  const { closing: menuClosing, requestClose: closeMenu } = useDismissible(
    () => setMenuOpen(false),
    CLOSE_MS.menu,
  );

  /* THE LIVE TAB'S RULE SLIDES. JS measures, CSS tweens — and the FIRST
     position is written with the transition suspended, or the rule animates in
     from zero width at the left edge every time an icon is selected. */
  const stripRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  const actions = useIconActions({
    icon,
    displayCells,
    cellStyle,
    size,
    onNotify,
  });

  useLayoutEffect(() => {
    const rule = ruleRef.current;
    const tab = stripRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (rule === null || tab === null || tab === undefined) return;

    /* `scaleX` OFF A 1px BASE, not a width tween: a width tween runs layout on
       every frame. Safe here and not on the category chips, because this rule is
       square-cornered and has no radius for the scale to distort. */
    const move = () => {
      rule.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
    };
    /* FIRST PAINT WRITES THE POSITION WITH THE TRANSITION SUSPENDED, or the
       rule tweens in from zero width at the left edge every time an icon is
       selected. Suspend, write, force a reflow, restore. */
    if (placed.current) {
      move();
      return;
    }
    const previous = rule.style.transition;
    rule.style.transition = "none";
    move();
    void rule.offsetWidth;
    rule.style.transition = previous;
    placed.current = true;
  }, [actions.format]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if ((event.target as HTMLElement | null)?.closest?.('[role="dialog"]'))
        return;
      /* THE MENU CLOSES FIRST. Escape means "back out of the thing that just
         opened", and clearing the whole selection instead would take the board
         two steps back for one press. */
      if (menuOpen) {
        closeMenu();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose, menuOpen, closeMenu]);

  // A menu that only closes on its own items is a menu you cannot dismiss.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen, closeMenu]);

  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + COPY_FORMATS.length) % COPY_FORMATS.length;
    actions.setFormat(COPY_FORMATS[next] as CopyFormat);
  };

  /* Read once, so the two buttons cannot drift apart in how they ask. */
  const primaryLabel = actions.labelFor("primary");
  const blockLabel = actions.labelFor("block");

  const run = (job: () => void | Promise<void>) => () => {
    closeMenu();
    void job();
  };

  return (
    <section
      aria-label="Selected icon"
      className={`pixl-detailbar ${closing ? "is-closing" : ""}`}
    >
      {/* ---- The identity column --------------------------------------
          Name, tags, category, action: what it is called, what it is near,
          which shelf it came off, and then what to do about it. */}
      <div className="pixl-detail-read">
        {/* The DATA face, because the name is a code identifier — the string
            you paste, not a title. At readout scale: it was the same 14px as
            the tabs and the menu items, so the one thing the shelf is ABOUT
            was the quietest thing on it. */}
        <h2 className="pixl-detail-name">{icon.name}</h2>

        {/* THE TAGS, AS PRINTING RATHER THAN CHIPS. A row of tag pills under
            the category pill would be several capsules saying several
            different kinds of thing, and only one of them carries a colour. */}
        {icon.tags.length > 0 && (
          <p className="pixl-detail-tags">{icon.tags.join(", ")}</p>
        )}

        {/* THE CATEGORY IN ITS OWN TINT — the same index the chip row is, so
            the shelf says which shelf the icon came off in the colour that
            already means it. Filled rather than outlined, because this states
            a fact and an outline is what the chips use for "not chosen". */}
        <span className="pixl-cat capitalize" data-category={icon.category}>
          {icon.category}
        </span>

        <div ref={menuRef} className="pixl-menu-wrap">
          {/* THE SPLIT BUTTON. Copy is the one almost everyone came for, so it
              is one press away and carries the live format's name; everything
              else is behind the chevron. */}
          <button
            type="button"
            onClick={() => actions.copy("primary")}
            className="pixl-panel-action pixl-panel-primary pixl-split-main"
          >
            {/* KEYED ON THE LABEL, which is what replays the swap: React
                remounts the span, and a remount is the reflow the recipe
                otherwise needs by hand.

                `labelFor("primary")`: this button reports only its OWN press.
                Both buttons read one shared label until 2026-09-04, so copying
                from the source block turned this one to "Copied" as well —
                feedback for an action nobody took on it, a column away. */}
            <span key={primaryLabel} className="pixl-swap">
              {primaryLabel === "Copy"
                ? `Copy ${FORMAT_LABELS[actions.format]}`
                : primaryLabel}
            </span>
          </button>
          <button
            type="button"
            aria-label="More export options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            className="pixl-panel-action pixl-panel-primary pixl-split-more"
          >
            <span aria-hidden="true">▾</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className={`pixl-menu ${menuClosing ? "is-closing" : ""}`}
            >
              {COPY_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  role="menuitem"
                  onClick={run(() => {
                    actions.setFormat(format);
                    void actions.copyAs(format);
                  })}
                  className="pixl-menu-item"
                >
                  Copy {FORMAT_LABELS[format]}
                </button>
              ))}
              <span className="pixl-menu-rule" />
              <button
                type="button"
                role="menuitem"
                onClick={run(actions.saveSvg)}
                className="pixl-menu-item"
              >
                Download SVG
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={run(actions.savePng)}
                className="pixl-menu-item"
              >
                Download PNG
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- The source column ----------------------------------------- */}
      <div className="pixl-detail-source">
        <div className="pixl-source-head">
          <div
            ref={stripRef}
            role="tablist"
            aria-label="Copy format"
            className="pixl-formats"
          >
            {/* The rule the live tab sits under, as ONE element that slides —
                it was a `border-bottom` per tab, so it teleported. Decorative:
                the selection is already on the tabs themselves. */}
            <span
              ref={ruleRef}
              aria-hidden="true"
              className="pixl-format-rule"
            />
            {COPY_FORMATS.map((format, index) => (
              <button
                key={format}
                type="button"
                role="tab"
                aria-selected={actions.format === format}
                tabIndex={actions.format === format ? 0 : -1}
                onClick={() => actions.setFormat(format)}
                onKeyDown={(event) => onTabKey(event, index)}
                className="pixl-format"
              >
                {FORMAT_LABELS[format]}
              </button>
            ))}
          </div>

          {/* THE CLOSE IS NOT ONE OF THE ACTIONS, and three things say so: it
              is the only glyph-only control on the shelf, the only rounded
              RECTANGLE among capsules, and it is a whole column away from the
              chevron — which used to sit one gap from it, putting "open more
              options" and "throw all of this away" within a trackpad slip of
              each other. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="pixl-panel-close"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* THE SOURCE, and it HUGS ITS CONTENT — no cap, no inner scrollbar.
            It was capped at 7rem, which put a scroll region inside a shelf
            that sits inside the one scrolling thing on the page. The shelf
            takes the height the markup needs and the grid above gives it up,
            which is what the grid is for. */}
        <div className="pixl-code">
          {/* KEYED ON THE FORMAT, so changing tab swaps the source in rather
              than cutting to it — the same move the labels make, at the scale
              of the block the tabs govern. */}
          <pre key={actions.format} className="pixl-code-text pixl-swap">
            {actions.source}
          </pre>
          {/* THE BLOCK'S OWN COPY, in its top-right corner, which is where the
              reference puts it and where anyone reading the source will look
              for it. It duplicates the split button's main half on purpose: by
              the time you have read a line of markup, the button that started
              it is at the other end of the shelf. */}
          <button
            type="button"
            onClick={() => actions.copy("block")}
            /* "Copy source", NOT "Copy SVG". The split button already carries
               that name, and two buttons with the same accessible name doing
               the same thing leave a screen-reader user no way to tell which
               one they are on. This one is named for where it is. */
            aria-label="Copy source"
            className="pixl-panel-action pixl-code-copy"
          >
            <span key={blockLabel} className="pixl-swap">
              {blockLabel}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
