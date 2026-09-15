"use client";

import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import type { Cells, IconDef } from "@/engine/types";
import { PixelReveal } from "./PixelReveal";

/**
 * THE MINI SCREEN — and, since 2026-08-29, ONLY a screen.
 *
 * It used to carry the name, the tags, the four export actions and an SVG
 * disclosure, which made it a panel with a picture at the top rather than a
 * display. It also made the board's left column enormous: the readout grew with
 * the tag list and the whole side of the device went fat to hold it. All of
 * that moved to the detail bar along the board's bottom edge, which is where a
 * device puts its controls.
 *
 * What is left is the hardware: a black bezel with the glass recessed into it
 * and a THICKER BOTTOM BAND carrying the moulded legend, exactly as the Braun
 * this is modelled on does. The band is not decoration hung on the frame — it
 * is why the frame is that shape. Brand at the left, model at the right.
 *
 * IT IS SET INTO THE CHASSIS, and that takes TWO elements, which is why the
 * bezel is no longer this component's outermost node. `.pixl-mini` is now the
 * CUT — a ring of chassis showing the walls of the hole — and `.pixl-mini-body`
 * is the module sitting in it. One element could not do it: the module is
 * near-black, so every shadow painted on it is invisible, and a recess is read
 * from the material AROUND the opening. Under a light from above the hole's
 * upper wall faces down and goes dark; its lower wall faces up and catches the
 * light. That pair is the whole effect, and it is the same thing the composer's
 * screen does with four real sloped walls in R3F.
 *
 * IDLE IS A LIT SCREEN, NOT AN EMPTY BOX. With nothing loaded it draws the bare
 * 11×11 grid — a pixel display that is on and has nothing on it. That is both
 * truer to the object and better than the faint wordmark it replaced, which
 * duplicated the legend now printed on the bezel below it.
 *
 * ITS BEZEL PRINTS NOTHING, and the band that used to carry the printing went
 * with it (2026-09-03). Three things sat there and each was argued from the
 * object and each was worse on the board than in the argument: a maker credit
 * (a second NAME on a column that already carries the brand twice), a power
 * lamp (a component with nothing to do, since this screen is lit whether or not
 * an icon is loaded), and the panel's own resolution (true, specific, and still
 * one more thing to read on a face whose job is to be quiet).
 *
 * The thicker bottom band existed BECAUSE something was printed on it, so it
 * had no reason to survive the printing: an even bezel on all four sides, and
 * its 32px back to the glass.
 *
 * IT IS A DOT MATRIX NOW, NOT A LATTICE OF LINES (2026-08-30), because the
 * reveal needed somewhere for a cell to arrive FROM. An unlit cell that is the
 * same shape as a lit one is what a pixel display actually shows, and it is the
 * case DESIGN.md's own argument against a ghost readout allows: the dot sits
 * inside the cell that covers it rather than drawing a second figure over it.
 *
 * AND SELECTING AN ICON MATERIALISES IT. See PixelReveal.tsx.
 *
 * A REGION, not a dialog. It is part of the board and never opens, so the cards
 * carry no `aria-haspopup` and nothing here claims `aria-modal`. The state
 * change is announced from a visually-hidden live region: it has to cover BOTH
 * directions, and the detail bar — which holds the name — does not exist to
 * announce its own disappearance.
 */

type MiniScreenProps = {
  icon: IconDef | null;
  /** Cells with the gallery's display settings already applied. */
  displayCells: Cells | null;
  cellStyle?: CellStyle;
};

export function MiniScreen({
  icon,
  displayCells,
  cellStyle = DEFAULT_CELL_STYLE,
}: MiniScreenProps) {
  return (
    <section aria-label="Preview screen" className="pixl-mini">
      {/* The module, seated in the cut: an even bezel and the glass, and
          nothing printed on either. */}
      <div className="pixl-mini-body">
        <div className="pixl-mini-glass">
          <PixelReveal
            cells={icon !== null ? displayCells : null}
            seed={icon?.id ?? null}
            cellStyle={cellStyle}
            className="size-full"
          />
        </div>
      </div>

      {/* THE LIVE REGION IS NOT HERE ANY MORE (2026-09-12). It was, and the
          reason was explicit: it has to announce CLEARING as well as loading,
          and the detail bar does not exist to announce its own removal — so it
          went on the screen, which was mounted at all times.

          This module moved INTO the bar, which put the announcer inside the
          thing that unmounts: the exact defect that rule was written to
          prevent, reintroduced by relocating the element it protected rather
          than by editing it. It is on the icon panel now, which is the surface
          that is genuinely always there. See Gallery.tsx. */}
    </section>
  );
}
