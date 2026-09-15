"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ColorInstrument } from "./ColorInstrument";
import { resolveGalleryColor, type GallerySettings } from "./settings";

/**
 * COLOUR IN THE BAR — the segment panel, reading the hex, opening the
 * instrument behind it.
 *
 * THE KEY IS THE LCD (2026-09-13, by request). It was a plain outlined pill
 * with a swatch and a number for half a day, which is what the reference uses
 * and is the one control on this page that had an established form already: the
 * sage segment panel the hex has been read out on since 2026-08-29, and which
 * the mini screen is made of. Losing it to a generic pill threw away the thing
 * that made the colour readout look like part of this product.
 *
 * IT IS A BUTTON THAT LOOKS LIKE A PANEL, which is a real tension and the right
 * side of it. A display is not normally pressable. But the alternative is a
 * panel with a separate affordance beside it, which is two objects for one
 * control — and the whole argument for the LCD was that a colour and its number
 * belong to one instrument.
 *
 * THE FIELD CANNOT STAND IN THE BAR, which is why there is a popover at all. A
 * saturation square is 264px and the bar is 44px tall. Size is fourteen blocks
 * and Shape is a word, so both fit at full size and neither opens; this one is
 * the exception and it is the only one.
 */

type ColorControlProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
  themeColor: string;
};

export function ColorControl({
  settings,
  onSettings,
  themeColor,
}: ColorControlProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const resolved = resolveGalleryColor(settings.colorText, themeColor);

  /* ESCAPE AND AN OUTSIDE PRESS BOTH CLOSE IT, and the listeners live only
     while it is open — a document listener mounted for the life of the page is
     one that has to decide whether it applies, every time.

     `pointerdown` rather than `click`: a press that starts inside the
     saturation field and releases outside it is a DRAG, and on `click` that
     release would close the panel mid-gesture. Pointerdown asks where the
     gesture BEGAN, which is the question that matters. */
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      // Focus goes back to what opened it, or it lands on <body> and the next
      // Tab restarts from the top of the page.
      buttonRef.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div className="pixl-color-slot">
      <button
        ref={buttonRef}
        type="button"
        className="pixl-lcd pixl-lcd-key"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        /* The hex is IN the accessible name, so a screen reader user gets the
           value without opening anything — the printed copy is `aria-hidden`
           for exactly that reason. */
        aria-label={`Icon color, ${resolved.toUpperCase()}. Choose a color`}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true" className="pixl-lcd-value">
          {resolved.toUpperCase()}
        </span>
        {/* THE SWATCH IS ON THE PANEL, not beside it. Two cut-outs in one face
            was the board's construction, and there is no face here — so the
            colour sits on the display as the one thing on it that is not
            type. */}
        <span
          aria-hidden="true"
          className="pixl-lcd-chip"
          style={{ backgroundColor: resolved }}
        />
      </button>

      {open && (
        <div
          ref={popRef}
          id={panelId}
          role="group"
          aria-label="COLOR"
          className="pixl-pop"
        >
          <ColorInstrument
            settings={settings}
            onChange={onSettings}
            themeColor={themeColor}
            idPrefix="display"
          />
        </div>
      )}
    </div>
  );
}
