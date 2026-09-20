"use client";

import { Knob as BaseKnob } from "@/components/Knob";
import { ScaleRing } from "./ScopeControls";

/**
 * THE INSTRUMENT KNOB (2026-09-19).
 *
 * ONE KNOB, THREE TIMES. It was a large concentric assembly with two small
 * trims beside it, sized by importance — and that was the wrong hierarchy on
 * this deck: the flagship took a quarter of the instrument's width to say
 * something the legend under it already said, and the three axes of one colour
 * are peers whatever order you reach for them in. Uniform, at the SMALLER size,
 * is what the reference's own bottom row looks like and it gives the deck its
 * space back.
 *
 * Every one is the shared `@/components/Knob` with a drawn FACE passed in.
 * Nothing about turning, wrapping, clamping, the keys, the roles or the pointer
 * capture is restated here — that is one implementation on purpose.
 *
 * TWO RINGS, AND THEY SAY DIFFERENT THINGS. The printed SCALE is ruling on the
 * panel: fixed marks the pointer sweeps across, so you can take a reading. The
 * colour RING is the axis previewed — grey to this hue, black to this colour to
 * white — built from the CURRENT colour so it never shows one you cannot reach.
 *
 * BOTH ARE DRAWN ON THE SAME ARC AS THE POINTER, which took two goes. The ring
 * was a conic gradient from a fixed origin while the pointer rotated a full
 * turn across a scale printing 270 degrees, so the colour under the pointer was
 * never the colour the knob was set to. Everything angular here now derives
 * from `sweep`.
 *
 * KNURLING IS A `repeating-conic-gradient`: a gradient in polar coordinates
 * gives every flute a true radial edge, so the cut stays sharp at the rim where
 * you read it. A tiled bitmap or a linear gradient bent round a circle does
 * neither.
 */

export function ScopeKnob({
  legend,
  stops,
  cap,
  ticks = 9,
  sweep = 270,
  labels,
  ...knob
}: {
  label: string;
  value: number;
  max: number;
  wrap: boolean;
  valueText: string;
  onChange: (value: number) => void;
  legend: string;
  /** The axis previewed as an annulus: colours spread across the printed arc. */
  stops: string[];
  /** The live colour, when this knob is the one carrying it. */
  cap?: string;
  ticks?: number;
  sweep?: number;
  labels?: [string, string];
}) {
  /* THE POINTER SWEEPS THE PRINTED ARC, NOT A FULL TURN — and this is the
     fix for the ring and the pointer disagreeing. The face used to rotate
     `value/max * 360`, so on a non-wrapping knob 0 and max BOTH landed at
     twelve o'clock while the scale under it printed 270 degrees. Saturation at
     100% pointed at the tick marked 0.

     Mapped onto the sweep, the pointer starts at the arc's first tick and ends
     at its last, and the ring is painted across the same arc from the same
     origin — so the colour under the pointer is the colour the knob is set to,
     which is the whole job of a preview ring.

     The GESTURE is untouched: a full drag-turn still covers the whole range
     (`@/components/Knob` owns that). This is only how the value is drawn. */
  const start = -sweep / 2;
  const angle = start + (knob.value / knob.max) * sweep;
  const ring = `conic-gradient(from ${start}deg, ${stops
    .map((colour, i) => `${colour} ${(i / (stops.length - 1)) * sweep}deg`)
    .join(", ")}, transparent ${sweep}deg)`;

  return (
    <div className="scope-knob-mount">
      {/* The field the scale is printed on, with the knob standing in the
          middle of it. A wrapper rather than siblings, because the ticks pivot
          about the knob's centre and need a box that IS that centre. */}
      <div className="scope-knob-field">
        <ScaleRing ticks={ticks} sweep={sweep} labels={labels} />
        <span aria-hidden="true" className="scope-knob-ring" style={{ background: ring }} />
        <BaseKnob
          {...knob}
          className="scope-knob"
          face={
            <>
              {/* The body. It turns, so the knurl turns with it — which is what
                  tells you the control has moved at all. */}
              <span
                aria-hidden="true"
                className="scope-knob-skirt"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span className="scope-knob-knurl" />
              </span>

              {/* The centre cap. On hue it carries the live colour, which is
                  the reference's red centre doing a job: the board's most
                  important readout is also one of its controls. On the other
                  two it is plain metal — three caps all showing the same colour
                  would be one fact printed three times. */}
              <span
                aria-hidden="true"
                className="scope-knob-cap"
                data-live={cap !== undefined}
                style={cap === undefined ? undefined : { background: cap }}
              >
                <span className="scope-knob-cap-knurl" />
                <span className="scope-knob-cap-gloss" />
              </span>

              {/* The pointer, reading against the printed scale outside it. */}
              <span
                aria-hidden="true"
                className="scope-knob-pointer"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span className="scope-knob-pointer-tab" />
              </span>
            </>
          }
        />
        {/* THE LEGEND SITS IN THE SCALE'S OPENING. The printed arc covers 270
            degrees, which leaves a 90-degree gap at the bottom doing nothing —
            and the legend was under the knob, costing the deck a whole row of
            height to say one word. Printed in the gap it is the same word in
            space the scale was already reserving, which is exactly where a real
            panel puts it. */}
        <span aria-hidden="true" className="scope-legend scope-knob-legend">
          {legend}
        </span>
      </div>
    </div>
  );
}
