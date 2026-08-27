"use client";

import { useComposer, useComposerStore } from "./ComposerProvider";

/**
 * What sits between the two knobs.
 *
 * Saturation only. Hue and lightness are the knobs; the hex and its swatch
 * moved to the dock; the hue/L/S readout was dropped — it restated three
 * controls that are all visible anyway, and it cost the board the height.
 */
export function ColorPanel() {
  const store = useComposerStore();
  const saturation = useComposer((s) => Math.round(s.hsl.s));

  return (
    /* Label ABOVE the track, not beside it: alongside, it stole width from the
       slider on every screen size, and the abbreviation only existed to pay for
       that width. */
    <label className="flex flex-col gap-1.5 text-caption text-white/70">
      <span className="text-center">Saturation</span>
      <input
        type="range"
        min={0}
        max={100}
        value={saturation}
        onChange={(event) => store.getState().setHsl({ s: Number(event.target.value) })}
        className="min-w-0 flex-1 accent-white"
      />
    </label>
  );
}
