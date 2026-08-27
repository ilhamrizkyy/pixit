"use client";

import { hueName } from "@/engine/color";
import { useComposer, useComposerStore } from "./ComposerProvider";
import { Knob } from "./Knob";

/**
 * The two knobs (INTERACTION.md §4). Left is hue and wraps through the full
 * circle; right is lightness and stops at black and white.
 *
 * Each ring previews what its own knob controls, so the toy explains itself
 * without a label — and the lightness ring is built from the CURRENT hue, so it
 * shows the actual black -> this colour -> white run rather than a generic ramp.
 *
 * BOTH turn the full circle. Lightness genuinely has ends where hue wraps, so a
 * shorter sweep with a visible gap would let you see those stops coming — but a
 * knob you cannot turn all the way round stops feeling like a knob, and that is
 * the trade chosen here.
 */

const HUE_RING = `conic-gradient(from 0deg, ${[0, 60, 120, 180, 240, 300, 360]
  .map((h) => `hsl(${h} 90% 55%)`)
  .join(", ")})`;

export function HueKnob() {
  const store = useComposerStore();
  const hsl = useComposer((s) => s.hsl);

  return (
    <Knob
      label="Hue"
      side="left"
      value={hsl.h}
      max={360}
      wrap
      ring={HUE_RING}
      valueText={`${hueName(hsl.h)}, ${Math.round(hsl.h)} degrees`}
      onChange={(h) => store.getState().setHsl({ h })}
    />
  );
}

export function LightnessKnob() {
  const store = useComposerStore();
  const hsl = useComposer((s) => s.hsl);

  return (
    <Knob
      label="Lightness"
      side="right"
      value={hsl.l}
      max={100}
      wrap={false}
      /* From 0deg, NOT 180: conic angles start at 12 o'clock, and the dial's
         mark sits at (l/100)*360 from the same origin. Starting the ramp half a
         turn away pointed the mark at the wrong colour at every position. */
      /* From 0deg, matching the dial's own origin at twelve o'clock, so the
         pointer always reads the colour it is actually selecting. */
      ring={`conic-gradient(from 0deg, #000000, hsl(${hsl.h} ${hsl.s}% 50%), #ffffff)`}
      valueText={`${Math.round(hsl.l)} percent`}
      onChange={(l) => store.getState().setHsl({ l })}
    />
  );
}
