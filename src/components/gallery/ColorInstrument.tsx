"use client";

import { useEffect, useRef } from "react";
import { galleryColorFromInput, hexToHsl, hslToHex } from "@/engine/color";
import { ColorField } from "./ColorField";
import {
  resolveGalleryColor,
  resolveGalleryHsl,
  type GallerySettings,
} from "./settings";

/**
 * THE COLOUR INSTRUMENT — the field, the hue strip, the hex readout and the
 * swatch, as one part.
 *
 * EXTRACTED 2026-09-13, when the controls left the sidebar. It is mounted in
 * two places now and they are different shapes: the desktop toolbar opens it in
 * a POPOVER off a swatch button, because a 264px square cannot stand in a 64px
 * bar; the mobile filter sheet renders it inline in a column, where there is
 * room. One implementation either way, which is what stops the two surfaces
 * becoming two answers to the same question.
 *
 * Stateless, like everything else in this family: it renders `settings` and
 * reports every change up. That is what lets the sheet hand it a DRAFT while
 * the toolbar hands it the live values.
 */

type ColorInstrumentProps = {
  settings: GallerySettings;
  onChange: (next: GallerySettings) => void;
  /**
   * The theme's own icon colour. Passed in rather than read here so the SHEET
   * resolves its DRAFT's colour, not the live one: the swatch has to show what
   * Apply would do, not what is on screen.
   */
  themeColor: string;
  /** Disambiguates input ids when both surfaces exist in one test render. */
  idPrefix?: string;
};

/**
 * The floor between one character's refreshes, in ms.
 *
 * LONGER THAN THE ANIMATION (180ms), and that is the whole trick. Dragging in
 * the field is not one change, it is a stream of them for as long as the
 * pointer moves — so a recipe that replays on every change replays sixty times
 * a second and never finishes anything, which reads as flicker rather than as
 * motion. With the floor above the duration, a character's animation always
 * completes before it can start again.
 */
const DIGIT_RETRIGGER_MS = 200;

/**
 * Replay the segment animation on the characters that CHANGED.
 *
 * Per character rather than per group: moving lightness on a grey moves two
 * digits, and the stock number pop-in would shake all six. The value itself is
 * already on screen — this only decides which spans get the class back, so a
 * skipped animation costs appearance and never correctness.
 */
function useDigitRefresh(value: string, active: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const lastAt = useRef<number[]>([]);

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    const root = ref.current;
    if (root === null || before === value || !active) return;

    const now = performance.now();
    for (let i = 0; i < root.children.length; i++) {
      if (before[i] === value[i]) continue;
      if (now - (lastAt.current[i] ?? 0) < DIGIT_RETRIGGER_MS) continue;
      lastAt.current[i] = now;

      const span = root.children[i] as HTMLElement;
      span.classList.remove("is-changed");
      // The reflow is what makes the animation replay; without it the class is
      // already there and the browser sees no change at all.
      void span.offsetWidth;
      span.classList.add("is-changed");
    }
  }, [value, active]);

  return ref;
}

export function ColorInstrument({
  settings,
  onChange,
  themeColor,
  idPrefix = "display",
}: ColorInstrumentProps) {
  const set = (patch: Partial<GallerySettings>) =>
    onChange({ ...settings, ...patch });

  const { colorText } = settings;

  // The colour actually in effect — never null, since icons always render in
  // exactly one colour. Parse rather than compare strings when judging the
  // field: "#FF0000" is valid but not equal to the normalized "#ff0000".
  const resolved = resolveGalleryColor(colorText, themeColor);
  const invalid =
    colorText !== null &&
    colorText.trim() !== "" &&
    galleryColorFromInput(colorText) === null;
  /* The stored value keeps whatever was typed. The readout PRINTS it in
     capitals, and that is `text-transform` on the layer that draws the glyphs
     rather than a transform of the value — see `.pixl-lcd-digits`. */
  const fieldValue = (colorText ?? resolved).replace(/^#/, "");

  // Where the field points. Held in settings once a colour is chosen, read off
  // the theme until then — see `resolveGalleryHsl`.
  const hsl = resolveGalleryHsl(settings, themeColor);

  /**
   * A typed hex snaps the field to the nearest match while the exact hex
   * becomes the colour, which is the composer's rule (INTERACTION.md §4). An
   * unparseable string leaves the field where it was rather than throwing it to
   * black on the way through "#f".
   */
  const setColorText = (text: string) => {
    const parsed = galleryColorFromInput(text);
    set(
      parsed === null
        ? { colorText: text }
        : { colorText: text, hsl: hexToHsl(parsed) },
    );
  };

  /* The readout animates when the FIELD moves it and not when you type into it:
     while the input has focus the characters are arriving one at a time under a
     caret, and animating them fights the thing the caret is doing. */
  const inputId = `${idPrefix}-color`;
  const digitsRef = useDigitRefresh(
    fieldValue,
    typeof document === "undefined" || document.activeElement?.id !== inputId,
  );

  return (
    <div className="pixl-color">
      {/* THE FIELD IS FIRST AND THE READOUT IS UNDER IT. It was the other way
          up — a readout above three knobs — on the reference device's rule that
          the display is what the case shows you and the controls go beneath it.
          That rule was about a CASE. On a picker the field is not a control
          beside the answer, it IS the answer, drawn: you point at the colour you
          want. The hex under it is the way in for someone who arrives already
          knowing it, which is the same split the knobs and the field had. */}
      <ColorField
        hsl={hsl}
        onChange={(next) => set({ hsl: next, colorText: hslToHex(next) })}
        idPrefix={idPrefix}
      />

      <div className="pixl-hexrow flex gap-2">
        {/* A SEGMENT PANEL, not a well. It was a hole with text lying in it;
            the reference device puts a DISPLAY in the case instead. */}
        <div
          className={`pixl-lcd flex-1 ${invalid ? "outline outline-danger" : ""}`}
        >
          {/* The # and the digits are one string, so they sit flush —
              "#000000", not "# 000000". No unit label beside them: "#" already
              says hex, and a panel with one value on it does not need to be
              told what kind of value it is. */}
          <div className="pixl-lcd-value">
            <span aria-hidden="true">#</span>
            <span className="pixl-lcd-slot">
              {/* The glyphs. The input under this paints nothing — it has no
                  per-character boxes to animate, and this does. */}
              <span
                aria-hidden="true"
                ref={digitsRef}
                className="pixl-lcd-digits"
              >
                {fieldValue.split("").map((character, index) => (
                  <span key={index} className="pixl-lcd-digit">
                    {character}
                  </span>
                ))}
              </span>
              <input
                id={inputId}
                type="text"
                inputMode="text"
                spellCheck={false}
                autoComplete="off"
                value={fieldValue}
                onChange={(event) => setColorText(event.target.value)}
                aria-invalid={invalid}
                aria-label="Icon color, as a hex value"
                className="pixl-lcd-input"
              />
            </span>
          </div>

          {colorText !== null && (
            <button
              type="button"
              onClick={() => set({ colorText: null })}
              aria-label="Reset to theme default"
              className="pixl-lcd-clear"
            >
              ✕
            </button>
          )}
        </div>

        {/* THE SWATCH SITS AFTER THE NUMBER, which is the reference's order and
            the better one: the field above already shows the colour at size, so
            this is a second reading of it and a second reading goes last.

            AND IT IS NOT A CONTROL. It held a hidden `<input type="color">`, so
            clicking it opened the OS picker — a second colour control hidden
            behind a swatch, on a panel whose top half is a colour control.
            `aria-hidden`, because the readout beside it says the value in
            text. */}
        <span
          aria-hidden="true"
          className="pixl-swatch"
          style={{ backgroundColor: resolved }}
        />
      </div>
    </div>
  );
}
