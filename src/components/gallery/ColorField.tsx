"use client";

import { useCallback, useRef } from "react";
import type { Hsl } from "@/engine/color";

/**
 * The gallery's colour control — a SATURATION/LIGHTNESS FIELD with a HUE STRIP
 * under it, replacing the three knobs on 2026-09-12 by request.
 *
 * WHY IT REPLACED THE KNOBS, and it is not that the knobs were wrong. They were
 * the toy's own instrument on a board that was the toy; the board is gone, and
 * three moulded dials standing on a plain page are the last parts of a chassis
 * that no longer exists. They are not deleted — they are RESERVED for the
 * composer, which keeps the chassis and is the surface they were always moulded
 * into. See `design-plans/reserved/`.
 *
 * IT IS AN HSL FIELD, NOT THE HSV ONE THE REFERENCE SHOWS. Every picker of this
 * shape looks alike and they are not: the reference's square runs white at the
 * top-left to black along the bottom, which is saturation against VALUE. This
 * product's colour model is HSL throughout — `Hsl`, `hslToHex`, `hexToHsl`, the
 * composer's own knobs — so the field's vertical axis is LIGHTNESS. Building
 * the HSV square instead would mean converting on every pointer sample and
 * storing a value the rest of the app cannot read, to arrive at the same
 * colours by a longer route.
 *
 * The visible difference is small and worth knowing: on an HSL field full
 * saturation sits at the vertical MIDDLE of the right edge rather than at the
 * top corner, because lightness 50% is where a hue is most itself.
 *
 * THE HUE STRIP IS A REAL `<input type="range">`; THE FIELD CANNOT BE. A native
 * range has one value and the field has two, so the square is a focusable
 * `slider` reporting both through `aria-valuetext` and moving on all four
 * arrows. That is the compromise this shape always makes, and it is only
 * acceptable because the hex input beside it reaches every colour with a
 * keyboard and no pointer at all.
 */

type ColorFieldProps = {
  hsl: Hsl;
  onChange: (next: Hsl) => void;
  /** Disambiguates ids when the board and the sheet both render in one test. */
  idPrefix?: string;
};

/** Arrow step, and Shift multiplies it — the step every other control uses. */
const STEP = 1;
const SHIFT_STEP = 10;

const clamp = (n: number, lo: number, hi: number) =>
  n < lo ? lo : n > hi ? hi : n;

export function ColorField({
  hsl,
  onChange,
  idPrefix = "display",
}: ColorFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);

  /**
   * Read a pointer into saturation/lightness.
   *
   * The pointer goes where the pointer is, with no clock in between to be wrong
   * about — the rule the size rail's marker and the shape drum both follow, and
   * for the same measured reason recorded in DESIGN.md §6. A 2D field has no
   * detents to settle onto, so it is the whole behaviour rather than half of it.
   */
  const readPointer = useCallback(
    (clientX: number, clientY: number) => {
      const box = fieldRef.current?.getBoundingClientRect();
      if (box === undefined || box.width === 0 || box.height === 0) return;
      onChange({
        h: hsl.h,
        s: Math.round(clamp((clientX - box.left) / box.width, 0, 1) * 100),
        // Inverted: light at the top is which way up every field of this shape
        // is drawn, and the one that matches the reference.
        l: Math.round(
          (1 - clamp((clientY - box.top) / box.height, 0, 1)) * 100,
        ),
      });
    },
    [hsl.h, onChange],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Capture on the element, so a drag that leaves the square keeps steering it
    // and a release outside still ends the gesture.
    event.currentTarget.setPointerCapture(event.pointerId);
    readPointer(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    readPointer(event.clientX, event.clientY);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SHIFT_STEP : STEP;
    let { s, l } = hsl;
    switch (event.key) {
      case "ArrowLeft":
        s -= step;
        break;
      case "ArrowRight":
        s += step;
        break;
      case "ArrowUp":
        l += step;
        break;
      case "ArrowDown":
        l -= step;
        break;
      case "Home":
        s = 0;
        break;
      case "End":
        s = 100;
        break;
      default:
        return;
    }
    // Only after a key we actually handled, so ↑/↓ still scroll the page from
    // anywhere else and Tab is never swallowed.
    event.preventDefault();
    onChange({ h: hsl.h, s: clamp(s, 0, 100), l: clamp(l, 0, 100) });
  };

  const hueId = `${idPrefix}-hue`;

  return (
    <div className="pixl-picker">
      {/* ---- The saturation / lightness field ---------------------------
          TWO GRADIENTS, NOT A CANVAS. The horizontal ramp runs mid-grey to the
          fully saturated hue; the vertical one washes white down to black over
          it. That is the field's definition rather than a picture of it, so it
          can never drift from the value underneath — and it costs no raster,
          which on the public route is the same argument that keeps three.js off
          this page. */}
      <div
        ref={fieldRef}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and lightness"
        /* ROUNDED, because a typed hex lands on fractions. `hexToHsl` returns
           real numbers, so #e11d48 is 82.6039215686% saturated — and a screen
           reader reads every one of those digits aloud. The VALUE keeps its
           precision; only the announcement is rounded. */
        aria-valuetext={`Saturation ${Math.round(hsl.s)}%, lightness ${Math.round(hsl.l)}%`}
        aria-valuenow={Math.round(hsl.s)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="pixl-picker-field"
        style={
          {
            "--hue": `hsl(${hsl.h} 100% 50%)`,
          } as React.CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        {/* THE RETICLE. Four arms around an open centre, on an 11-cell grid —
            the same lattice an icon is drawn on, so the handle is made of the
            product's own material even though the set has no crosshair to
            borrow. The stylesheet carries why the centre prints nothing and why
            each arm is white inside a dark outline.

            Positioned with `left`/`top` on the same box the gradients are
            measured in, so the three can never disagree about where 50% is. */}
        <span
          aria-hidden="true"
          className="pixl-picker-thumb"
          /* FRACTIONS, NOT PERCENTAGES: the stylesheet insets the travel by
             half a handle so the reticle never hangs outside the field and
             never cuts its border, and that arithmetic needs a unitless 0..1 to
             multiply the inset span by. */
          style={
            {
              "--s": hsl.s / 100,
              "--l": 1 - hsl.l / 100,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 22 22">
            {/* The outline first, three cells thick, so the white arms sit
                inside it rather than over it. */}
            <g fill="#000" fillOpacity="0.85">
              <rect x="8" y="0" width="6" height="8" />
              <rect x="8" y="14" width="6" height="8" />
              <rect x="0" y="8" width="8" height="6" />
              <rect x="14" y="8" width="8" height="6" />
            </g>
            {/* One cell of white down the middle of each arm, inset a cell at
                the outer end so the dark caps it. */}
            <g fill="#fff">
              <rect x="10" y="1" width="2" height="6" />
              <rect x="10" y="15" width="2" height="6" />
              <rect x="1" y="10" width="6" height="2" />
              <rect x="15" y="10" width="6" height="2" />
            </g>
          </svg>
        </span>
      </div>

      {/* ---- The hue strip ----------------------------------------------
          A REAL RANGE, unlike the field above it: hue is one value, so it gets
          the native control and everything that comes with it — arrows, Home,
          End, PageUp/PageDown, and a screen reader that already knows what to
          say. The track and thumb are drawn in CSS over it. */}
      <div className="pixl-picker-hue">
        <input
          id={hueId}
          type="range"
          min={0}
          max={359}
          step={1}
          value={hsl.h}
          aria-label="Hue"
          onChange={(event) =>
            onChange({ ...hsl, h: Number(event.target.value) })
          }
        />
      </div>
    </div>
  );
}
