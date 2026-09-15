"use client";

import { MAX_RENDERED_SIZE, SIZE_STOPS } from "@/engine/constants";
import { Caret } from "./Caret";

/**
 * SIZE — a fourteen-block meter (2026-09-12).
 *
 * IT REPLACED A BRAUN TUNING SCALE, and the scale was not badly built: a milled
 * channel with the whole scale printed on its floor, major and minor
 * graduations flanking every number, and a magnifier riding over them enlarging
 * the real printing rather than drawing a second copy of it. All of that was
 * designed for a 700px rail standing vertically in a chassis. Lying down in a
 * 264px control column it became a thin track wearing decoration, and that is
 * what the owner called weird.
 *
 * A METER IS THE HONEST SHAPE AND THE ARCADE ONE. The control has fourteen
 * stops, so it draws fourteen stops — nothing is printed between them because
 * there is nothing between them, which is the thing the minor graduations were
 * always slightly lying about (they were "printed subdivisions, not reachable
 * values"). A run of filled blocks is also what every arcade meter has always
 * been, and it is readable at a glance in a way a pointer on a scale is not.
 *
 * THE NATIVE RANGE STILL DOES THE WORK. It is transparent and covers the whole
 * meter, so drag, click and every key a range answers come free, along with the
 * accessibility tree. The blocks are painted under it. That is the same split
 * the rail made — the marker was drawn over a kept, transparent thumb — and the
 * reason is the same: `::-webkit-slider-thumb` cannot be an arbitrary shape,
 * and a div cannot be a slider.
 *
 * WHAT WENT WITH THE RAIL, and is worth knowing before rebuilding any of it:
 * the 45ms follow bridge, the travel clock that scaled with distance, the
 * settle-on-release, and the "marker is placed where the pointer is" rule. All
 * of them existed because a POINTER travels between detents and needs to look
 * like it does. A meter has no pointer. A block is on or it is off, so there is
 * nothing to animate between two stops and nothing to get wrong about it.
 */

type SizeMeterProps = {
  size: number;
  onSize: (size: number) => void;
  /** Unique per mount: the board and the filter sheet both render one. */
  id: string;
};

/* THE ENDS ARE NOT PRINTED. `16` and `120` sat under the meter for one pass and
   were the third thing on a row that already had two: the eyebrow prints the
   exact value and the run of blocks shows how far along it is, so the labels
   named two stops out of fourteen and collided with the carets besides. */
/**
 * THE BLOCKS ARE ALL ONE SIZE (2026-09-13, by request), and this is the third
 * shape of this control in two days. Worth keeping the arithmetic that killed
 * each one.
 *
 * IT WAS A WEDGE: block `i` drawn `MIN_CELLS + i` cells tall, so the run
 * climbed a staircase and the control said "bigger" in its own shape. Two
 * things were wrong with it.
 *
 *   1. THE FIRST BLOCKS WERE UNREADABLE. A three-cell block carries a 2px
 *      keyline top and bottom, which leaves two pixels of interior — so at the
 *      bottom of the scale an ON block and an OFF block differ by two pixels
 *      and the state they are supposed to report is invisible.
 *   2. THE WEDGE WAS SAYING WHAT THE RUN ALREADY SAYS. Height and length were
 *      two encodings of one number, and only one of them can also carry
 *      on/off.
 *
 * (The build BEFORE the wedge failed differently and is the reason the wedge
 * was one cell per step rather than a range: `4 + round(10 * i / 13)` maps
 * fourteen blocks onto eleven whole-cell heights, which is a pigeonhole — at
 * least three pairs MUST come out equal, and they did, at indices 2/3, 6/7 and
 * 10/11. That is what "not getting bigger at some points" looked like.)
 *
 * Uniform blocks give the whole scale one legible on/off step, and the RUN
 * carries the magnitude on its own — which is what a segment meter has always
 * been. Every block is drawn by the stylesheet now, so this component hands
 * down only the stop count.
 */

/**
 * THE WIDTH IS STATIC, and that is a property of the drawing rather than of the
 * value. Each block is a fixed number of cells wide, so the meter is exactly as
 * wide at 16 as it is at 120 — the bar cannot reflow as you drag, and the
 * controls either side of it never move. A `1fr` column track would have made
 * the meter share out whatever width was going, which is how a control ends up
 * a different size on two pages.
 */
const MIN = SIZE_STOPS[0];
const MAX = SIZE_STOPS[SIZE_STOPS.length - 1];
const STEP = SIZE_STOPS[1] - SIZE_STOPS[0];

export function SizeMeter({ size, onSize, id }: SizeMeterProps) {
  /* THE CARETS STEP ONE STOP, and they exist for a POINTER. The range already
     answers every arrow key, so this is not a keyboard path — it is the only
     way a mouse can move one stop without aiming at a 16px block, which on a
     fourteen-stop meter is most of what you want to do. They clamp rather than
     wrap: a size scale has two real ends, unlike the shape cycle. */
  /* `SIZE_STOPS` is a readonly tuple of literal sizes, so its own `indexOf`
     only accepts one of those literals — and `size` is a plain number off
     settings. Widening the view rather than casting the value keeps the check
     honest: an unknown size gives -1 and both carets clamp to the ends. */
  const at = (SIZE_STOPS as readonly number[]).indexOf(size);
  const step = (by: number) => {
    const next =
      SIZE_STOPS[Math.min(Math.max(at + by, 0), SIZE_STOPS.length - 1)];
    if (next !== size) onSize(next);
  };

  return (
    <div className="pixl-meter-row">
      <button
        type="button"
        className="pixl-meter-key"
        aria-label="Smaller"
        disabled={at <= 0}
        onClick={() => step(-1)}
      >
        <Caret back />
      </button>

      <div className="pixl-meter">
        <input
          id={id}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={size}
          onChange={(event) => onSize(Number(event.target.value))}
          aria-label="Size"
          /* THE BREAK IS ANNOUNCED, NOT DRAWN. The grid's seat is a fixed 64px, so
           48 is the largest art it can draw and every stop above it sets the
           exported FILE's size instead. DESIGN.md §6 settled that this region is
           announced rather than drawn, on the grounds that one mark unlike all
           the others reads as damage before it reads as information.
           A meter could draw it as a zone, the way a tachometer draws a
           redline — which is a different thing from one odd mark, and is worth
           raising rather than deciding here. */
          aria-valuetext={
            size > MAX_RENDERED_SIZE
              ? `${size} pixels, export size only`
              : `${size} pixels`
          }
        />
        <span
          aria-hidden="true"
          className="pixl-meter-blocks"
          /* The column count comes from the scale itself, so adding a stop to
           `SIZE_STOPS` adds a block. A hard-coded 14 is how the ruler and the
           numbers came apart twice on the rail. */
          style={{ "--stops": SIZE_STOPS.length } as React.CSSProperties}
        >
          {/* ON UP TO THE VALUE, OFF AFTER IT. That is the whole readout: a
              run of filled blocks against empty ones, which is the oldest one
              there is and has never needed a colour to say which half is
              which. */}
          {SIZE_STOPS.map((stop) => (
            <i key={stop} className={stop <= size ? "is-on" : undefined} />
          ))}
        </span>
      </div>

      <button
        type="button"
        className="pixl-meter-key"
        aria-label="Larger"
        disabled={at >= SIZE_STOPS.length - 1}
        onClick={() => step(1)}
      >
        <Caret />
      </button>
    </div>
  );
}
