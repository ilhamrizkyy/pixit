"use client";

import { Knob } from "@/components/Knob";
import { hslToHex, hueName, type Hsl } from "@/engine/color";

/**
 * THE COLOUR SETTER — the pixit board's own control, on the gallery's body.
 *
 * The board is the toy (DESIGN.md §1) and the body is what operates the screen,
 * so the most screen-changing control there is has no business being a text
 * field when the device it is moulded into already has an instrument for it.
 * These are the composer's knobs: same component, same gesture, same rings.
 *
 * THREE KNOBS, NOT TWO AND A SLIDER. The composer runs hue and lightness on
 * knobs and saturation on a rail because the rail spans the lane between them
 * and has a whole board's width to live in. A 264px column has no such lane,
 * and a slider dropped between two knobs would read as the one control that did
 * not get to be hardware. Three of the same object is also simply the truer
 * reading of the colour: H, S and L are three axes of one thing.
 *
 * NO MESH. `mesh={false}` keeps three.js — around 600KB — off the public route
 * almost all traffic lands on. DESIGN.md §6 already requires the WebGL and CSS
 * dials to describe ONE object and shares their proportions by name for exactly
 * this reason, so this is the same knob rather than a degraded one. Flip the
 * prop if the gallery ever wants the dish.
 *
 * Each ring previews what its own knob controls, and each is built from the
 * CURRENT colour rather than from a generic ramp: the saturation ring runs grey
 * to this hue, the lightness ring black to this colour to white. A ring that
 * ignored the other two axes would be showing a colour you cannot reach.
 */

const HUE_RING = `conic-gradient(from 0deg, ${[0, 60, 120, 180, 240, 300, 360]
  .map((h) => `hsl(${h} 90% 55%)`)
  .join(", ")})`;

type ColorKnobsProps = {
  hsl: Hsl;
  /** Reports the whole colour, since a knob turn is a new hex as well. */
  onChange: (hsl: Hsl, hex: string) => void;
  idPrefix: string;
};

export function ColorKnobs({ hsl, onChange, idPrefix }: ColorKnobsProps) {
  const set = (patch: Partial<Hsl>) => {
    const next = { ...hsl, ...patch };
    onChange(next, hslToHex(next));
  };

  return (
    <div className="flex items-start justify-between gap-1">
      <KnobCell label="Hue" legend="H" idPrefix={idPrefix}>
        <Knob
          label="Hue"
          value={hsl.h}
          max={360}
          wrap
          mesh={false}
          className="size-16"
          ring={HUE_RING}
          valueText={`${hueName(hsl.h)}, ${Math.round(hsl.h)} degrees`}
          onChange={(h) => set({ h })}
        />
      </KnobCell>

      <KnobCell label="Saturation" legend="S" idPrefix={idPrefix}>
        <Knob
          label="Saturation"
          value={hsl.s}
          max={100}
          wrap={false}
          mesh={false}
          className="size-16"
          /* From 0deg, like the others: the dial's mark sits at (value/max)*360
             from twelve o'clock, so a ramp starting anywhere else points the
             mark at a colour it is not selecting. */
          /* At a FIXED 50% lightness, not the current one. A ring built at the
             live lightness is a black ring on a black colour and a white one on
             white — which is honest and useless: the default colour is #000000,
             so the saturation knob would ship with a dead scale. A ring
             previews its own AXIS, which is what the hue ring has always done
             at a fixed 90%/55%. */
          ring={`conic-gradient(from 0deg, hsl(${hsl.h} 0% 50%), hsl(${hsl.h} 100% 50%))`}
          valueText={`${Math.round(hsl.s)} percent`}
          onChange={(s) => set({ s })}
        />
      </KnobCell>

      <KnobCell label="Lightness" legend="L" idPrefix={idPrefix}>
        <Knob
          label="Lightness"
          value={hsl.l}
          max={100}
          wrap={false}
          mesh={false}
          className="size-16"
          ring={`conic-gradient(from 0deg, #000000, hsl(${hsl.h} ${hsl.s}% 50%), #ffffff)`}
          valueText={`${Math.round(hsl.l)} percent`}
          onChange={(l) => set({ l })}
        />
      </KnobCell>
    </div>
  );
}

/**
 * A knob and its moulded legend.
 *
 * The legend is printed on the plastic rather than being the knob's only name:
 * the control already carries the full word in its accessibility tree, so this
 * is `aria-hidden` and free to be the mark a case is silkscreened with. Single
 * letters, because H/S/L is what the axes are called and three three-letter
 * abbreviations under three knobs was more text than the row could carry at
 * 264px — it read as a caption rather than as a legend.
 *
 * It is spelled out per knob rather than sliced off the label, which is how the
 * first pass produced "LIG".
 */
function KnobCell({
  legend,
  idPrefix,
  children,
}: {
  legend: string;
  label: string;
  idPrefix: string;
  children: React.ReactNode;
}) {
  return (
    /* The legend stands off the dial. At `gap-1` it sat against the knob's
       housing shadow and read as part of the control rather than as printing on
       the case beside it. */
    <div className="flex flex-col items-center gap-2">
      {children}
      <span
        aria-hidden="true"
        id={`${idPrefix}-knob-${legend.toLowerCase()}`}
        className="text-[10px] tracking-wide text-text-muted"
      >
        {legend}
      </span>
    </div>
  );
}
