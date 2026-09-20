"use client";

import { hslToHex, hueName } from "@/engine/color";
import { ColorReadout } from "./ColorReadout";
import { useComposer, useComposerStore } from "./ComposerProvider";
import { ScopeKnob } from "./ScopeKnob";
import { SubPanel } from "./ScopeControls";

/**
 * THE COLOUR RAIL — the instrument, standing beside the screen (2026-09-19).
 *
 * Four fittings, top to bottom: the readout, then Hue, Saturation and
 * Lightness. It faces the four tool keys across the screen, and the two rails
 * are the same width with the same number of things in them, because the
 * request that produced this layout was SYMMETRY.
 *
 * IT WAS A FULL-WIDTH DECK ALONG THE BOTTOM, and before that a pad floating
 * under the screen. The deck was the right shape for a benchtop box, where the
 * bottom strip is structural — and this is a handheld now. A handheld has two
 * hands and therefore two sides, and anything not on one of them is either
 * under the screen or on the top edge.
 *
 * THE READING ORDER IS THE ONE YOU WORK IN: the value you are aiming at, then
 * the three axes that get you there.
 *
 * THE EYEDROPPER IS IN THE READOUT, and that is what keeps the count at four a
 * side. It could have been a fifth fitting here or a fifth key opposite, and
 * either would have broken the symmetry this layout exists for; it belongs
 * with the chip anyway, since both are about the colour you HAVE rather than
 * the axes that make one. See `ColorReadout.tsx`.
 */
/* THE RING STARTS WHERE THE POINTER RESTS — `from 0deg`, twelve o'clock, the
   same origin the pointer rotates from. It was `from 180deg`, which put the
   scale's zero at six o'clock while the pointer sat at twelve: the colour
   under the pointer was never the colour the knob was set to, on all three
   knobs at once. A preview ring that disagrees with its own pointer is worse
   than no ring.

   Fixed saturation and lightness, so the ring previews its own AXIS rather
   than the colour currently loaded — at #000000 every hue is the same black,
   and a ring built from the live value would ship dead. */
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} 85% 58%)`);

export function ColorColumn() {
  const store = useComposerStore();
  const hsl = useComposer((s) => s.hsl);

  /* THE KNOBS REPORT A COLOUR, NOT AN AXIS. `setHsl` merges the patch and
     re-derives the hex, so each knob hands it one number and the store owns the
     conversion — which is what keeps the cap, the chip and the readout showing
     one value with no second source of truth. */
  const set = (patch: Partial<typeof hsl>) => store.getState().setHsl(patch);

  return (
    /* TWO SECTIONS, NOT ONE RAIL (2026-09-20, by request). The display and the
       dials were four fittings on a single pad, which made the value you are
       aiming at look like a fourth axis. They are different KINDS of thing: one
       reports the colour you have, three set the colour you want.

       The module is its own section rather than a pad wrapped around one, so
       there is no recess inside a recess — the display housing IS the top
       section, and the dials get the pad. */
    <div className="scope-color-column">
      <ColorReadout />

      <SubPanel className="scope-dial-rail">
      <ScopeKnob
        label="Hue"
        legend="Hue"
        value={hsl.h}
        max={360}
        /* END STOPS, NOT CONTINUOUS (2026-09-19, by request). It wrapped, so
           turning past 360 came back round at 0 — which is true of hue and not
           true of a knob with a printed scale and a pointer on it. A dial that
           spins forever has nothing to print numbers against, and this one has
           `0` and `360` on the panel either side of it. The two ends are the
           same colour, which is the honest way a physical hue control resolves
           the circle: it does not close it. */
        wrap={false}
        ticks={13}
        sweep={300}
        labels={["0", "360"]}
        stops={HUE_STOPS}
        valueText={`${hueName(hsl.h)}, ${Math.round(hsl.h)} degrees`}
        onChange={(h) => set({ h })}
      />
      <ScopeKnob
        label="Saturation"
        legend="Sat"
        value={hsl.s}
        max={100}
        wrap={false}
        /* At a FIXED 50% lightness, not the current one. A ring built at the
           live lightness is a black ring on a black colour and a white one on
           white — honest and useless, since the board starts on #000000 and the
           knob would ship with a dead scale. A ring previews its own AXIS. */
        stops={[`hsl(${hsl.h} 0% 50%)`, `hsl(${hsl.h} 100% 50%)`]}
        valueText={`${Math.round(hsl.s)} percent`}
        onChange={(s) => set({ s })}
      />
      <ScopeKnob
        label="Lightness"
        legend="Lum"
        value={hsl.l}
        max={100}
        wrap={false}
        stops={["#000000", hslToHex({ ...hsl, l: 50 }), "#ffffff"]}
        valueText={`${Math.round(hsl.l)} percent`}
        onChange={(l) => set({ l })}
      />
      </SubPanel>
    </div>
  );
}
