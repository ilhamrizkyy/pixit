"use client";

import { SizeMeter } from "./SizeMeter";
import type { GallerySettings } from "./settings";

/**
 * SIZE IN THE BAR — the value printed, then the meter.
 *
 * THE EYEBROW IS GONE (2026-09-13, by request) AND THE VALUE IS NOT. The label
 * said "SIZE" over a control that is visibly a size control; the number is the
 * one thing on it that cannot be inferred from looking. That is the reference's
 * own split too: `32px` printed at the head of the slider, no caption above it.
 *
 * It reads `24`, not `24px`. Every number on this page is pixels and nothing
 * else is, so the unit is the kind of thing the hex panel refuses to print for
 * the same reason: a display with one value on it does not need to be told what
 * kind of value it is.
 */

type SizeControlProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
};

export function SizeControl({ settings, onSettings }: SizeControlProps) {
  return (
    <div className="pixl-size-slot">
      {/* A LABEL, NOT A CAPTION. It still names the slider for a screen
          reader — the meter's own `aria-label` is "Size" and this is the
          visible text tying the printed number to it — but it sits INSIDE the
          control rather than over it. */}
      <label className="pixl-size-value" htmlFor="display-size">
        {settings.size}
      </label>
      <SizeMeter
        size={settings.size}
        onSize={(next) => onSettings({ ...settings, size: next })}
        id="display-size"
      />
    </div>
  );
}
