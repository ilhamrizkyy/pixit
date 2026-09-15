"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CELL_STYLES, type CellStyle } from "@/engine/render";
import { SHAPE_LABELS, type GallerySettings } from "./settings";

/**
 * Shape — A DROPDOWN (2026-09-13, by request, against the reference's own
 * weight selector).
 *
 * THE SIXTH BUILD, and the first that is the same SHAPE of control as the thing
 * it sits beside. What each earlier one got right, since this inherits from all
 * of them:
 *   1. Three transport keys — mute. A row of caps says nothing about which is
 *      on until you compare the depth of their faces.
 *   2. A mode list beside a ribbed wheel — a control next to a picture of a
 *      control: the wheel turned and the list did not.
 *   3. A thumbwheel with the values printed on the barrel — one object at last,
 *      and it needed a chassis to be mounted through.
 *   4. Three cells in a row — the right vocabulary, and three equal boxes is a
 *      toolbar rather than a selector.
 *   5. `◀ SQUARE ▶`, a character select — familiar, and it makes the far value
 *      two presses away while showing you neither of the others.
 *
 * A DROPDOWN SHOWS ALL THREE AT ONCE AND REACHES ANY OF THEM IN ONE PRESS,
 * which is what the stepper could not do. It also fixes the thing build 4 and
 * build 5 traded against each other: the menu has room for BOTH the name and
 * the drawing, so nothing has to be chosen between them.
 *
 * NO GLYPH BESIDE THE NAME (2026-09-13, by request), and the cost is worth
 * stating because it is the one this control keeps paying. Each row carried a
 * 2x2 patch drawn by the engine's own `cellNode`, which is the property §6
 * records the drum losing when it replaced glyphs with words: a drawing cannot
 * go stale against a geometry change and a word can. That guarantee is gone
 * again, and `SHAPE_HINTS` now carries the behaviour alone with nothing
 * checking it against the engine.
 *
 * What it buys is a row of three names that read as three names. At 16px a
 * 2x2 patch of an 11x11 grid is four marks two pixels across, which is too
 * small to distinguish Inset from Fill at a glance — so it was a decoration
 * claiming to be information. Restoring it is one element per row.
 */

type ShapeDropdownProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
};

/** What each style does, under the name in the menu. */
const SHAPE_HINTS: Record<CellStyle, string> = {
  solid: "Cells fill edge to edge",
  gap: "Cells inset, grid between",
  dots: "Cells inset and round",
};

export function ShapeDropdown({ settings, onSettings }: ShapeDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const live = settings.cellStyle;

  const choose = (style: CellStyle) => {
    onSettings({ ...settings, cellStyle: style });
    setOpen(false);
    buttonRef.current?.focus();
  };

  /* A MENU, SO THE ARROWS MOVE THE FOCUS RATHER THAN THE VALUE. That is the
     difference from every earlier build: the stepper and the radiogroup both
     CHANGED the shape as you arrowed, because in those the focused thing was
     the chosen thing. Here the menu is open over a value that has not changed
     yet, and moving through it must not redraw every icon on the page. */
  useEffect(() => {
    if (!open) return;
    const items = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitemradio']") ??
          [],
      );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      const all = items();
      const at = all.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        // Wraps: a three-item menu with two dead ends would spend most of its
        // arrow presses doing nothing.
        all[(at + step + all.length) % all.length]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        all[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        all[all.length - 1]?.focus();
      }
    };
    /* `pointerdown`, not `click`: a press that begins inside the menu and
       releases outside it is still a choice made inside. */
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    // Focus the live value, so the menu opens where you already are.
    items()
      .find((item) => item.getAttribute("aria-checked") === "true")
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div className="pixl-drop">
      <button
        ref={buttonRef}
        type="button"
        className="pixl-drop-key"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Shape, ${SHAPE_LABELS[live]}`}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true" className="pixl-drop-value">
          {SHAPE_LABELS[live]}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Shape"
          className="pixl-shapes"
        >
          {CELL_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="menuitemradio"
              aria-checked={style === live}
              className="pixl-shapes-item"
              onClick={() => choose(style)}
            >
              <span className="pixl-shapes-text">
                <b>{SHAPE_LABELS[style]}</b>
                {/* The behaviour, which the tooltip used to carry alone. A menu
                    has the room a 64px bar does not. */}
                <i>{SHAPE_HINTS[style]}</i>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The chevron, drawn on the 2px cell like everything else.
 *
 * IT IS NOT THE SET'S `play` GLYPH TURNED SIDEWAYS. That was the instinct the
 * stepper's carets followed and it is wrong here: `play` is a solid triangle
 * and a disclosure chevron is an open one, so borrowing it would put a filled
 * arrowhead where every menu on every platform draws a stroke. It flips rather
 * than rotating, which passes through a flat line at the midpoint and is the
 * move that works in every engine.
 */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={open ? "pixl-drop-chevron is-open" : "pixl-drop-chevron"}
      viewBox="0 0 8 8"
      width="8"
      height="8"
    >
      {/* Five cells in a V, stepped one cell at a time — an antialiased
          diagonal is the one thing this register refuses. */}
      <rect x="0" y="2" width="2" height="2" fill="currentColor" />
      <rect x="2" y="4" width="2" height="2" fill="currentColor" />
      <rect x="4" y="4" width="2" height="2" fill="currentColor" />
      <rect x="6" y="2" width="2" height="2" fill="currentColor" />
    </svg>
  );
}
