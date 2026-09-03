"use client";

import { useEffect, useRef } from "react";
import { galleryColorFromInput, hexToHsl } from "@/engine/color";
import { ColorKnobs } from "./ColorKnobs";
import { SizeScale } from "./SizeScale";
import { ShapeWheel } from "./ShapeWheel";
import {
  resolveGalleryColor,
  resolveGalleryHsl,
  type GallerySettings,
} from "./settings";

/**
 * The body's Display controls — COLOUR and SHAPE on the board, plus SIZE in the
 * sheet — shared by the desktop sidebar and the mobile filter sheet.
 *
 * SIZE IS A RAIL IN THE GUTTER on the board (SizeScale.tsx), because a scale
 * wants length and this pad is 264px wide. The sheet has no gutter to stand one
 * in, so it renders the horizontal build here instead; `showSize` is which.
 *
 * Deliberately stateless: it renders `settings` and reports every change up.
 * That is what lets the sheet hand it a DRAFT while the body hands it the live
 * values — same controls, two commit models, one implementation. It is also
 * what keeps the two surfaces from becoming two answers to the same question:
 * only one of them is ever mounted.
 *
 * COLOUR IS THE TOY'S OWN CONTROL as of 2026-08-29 — three knobs, the same
 * component the composer turns. See ColorKnobs.tsx. The hex field stayed, under
 * them: knobs are how you FIND a colour and a field is how you enter one you
 * already know, and an icon set whose users arrive with a brand hex needs both.
 * That is also the composer's split, where the knobs are on the board and the
 * hex is in the dock.
 *
 * NO HEADING AND NO RESET. Both went on 2026-08-29. The pad is the only thing
 * on the body and every control on it is labelled, so "DISPLAY" was a heading
 * over a panel with nothing to distinguish itself from; the section Reset
 * duplicated a job the ✕ on the colour field and the tick labels already do
 * one control at a time, and the sheet's footer does wholesale.
 *
 * COLOUR LIVES HERE, not on the screen's header. The board makes the argument
 * the old layout could not: the body is what operates the screen, and the
 * colour every icon renders in is the most screen-changing thing there is.
 * Search stays on the screen because it changes WHICH icons are there, not how
 * they are drawn.
 *
 * Padding and Transform were removed with the rebuild — see settings.ts.
 */

type GalleryControlsProps = {
  settings: GallerySettings;
  onChange: (next: GallerySettings) => void;
  /**
   * The theme's own icon colour — #000 in light, #fff in dark. Passed in rather
   * than read here so the SHEET resolves its DRAFT's colour, not the live one:
   * the swatch has to show what Apply would do, not what is on screen.
   */
  themeColor: string;
  /** Disambiguates input ids when both surfaces exist in one test render. */
  idPrefix?: string;
  /**
   * Render the Size control here. FALSE on the board, where Size is the rail in
   * the gutter; true in the sheet, which is the one surface with no gutter to
   * stand a rail in.
   */
  showSize?: boolean;
};

/**
 * The floor between one character's refreshes, in ms.
 *
 * LONGER THAN THE ANIMATION (180ms), and that is the whole trick. A knob turn
 * is not one change, it is a stream of them for as long as the pointer moves —
 * so a recipe that replays on every change replays sixty times a second and
 * never finishes anything, which reads as flicker rather than as motion. With
 * the floor above the duration, a character's animation always completes before
 * it can start again, and a fast drag becomes a steady five-a-second shimmer
 * instead of a strobe.
 */
const DIGIT_RETRIGGER_MS = 200;

/**
 * Replay the segment animation on the characters that CHANGED.
 *
 * Per character rather than per group: turning Lightness on a grey moves two
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

export function GalleryControls({
  settings,
  onChange,
  themeColor,
  idPrefix = "display",
  showSize = false,
}: GalleryControlsProps) {
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

  // Where the knobs point. Held in settings once a colour is chosen, read off
  // the theme until then — see `resolveGalleryHsl`.
  const hsl = resolveGalleryHsl(settings, themeColor);

  /**
   * A typed hex snaps the knobs to the nearest match while the exact hex
   * becomes the colour, which is the composer's rule (INTERACTION.md §4). An
   * unparseable string leaves the knobs where they were rather than throwing
   * them to black on the way through "#f".
   */
  const setColorText = (text: string) => {
    const parsed = galleryColorFromInput(text);
    set(
      parsed === null
        ? { colorText: text }
        : { colorText: text, hsl: hexToHsl(parsed) },
    );
  };

  /* The readout animates when the KNOBS move it and not when you type into it:
     while the field has focus the characters are arriving one at a time under a
     caret, and animating them fights the thing the caret is doing. */
  const inputId = `${idPrefix}-color`;
  const digitsRef = useDigitRefresh(
    fieldValue,
    typeof document === "undefined" || document.activeElement?.id !== inputId,
  );

  return (
    /* ONE PAD ON THE BOARD, AND IT IS COLOUR'S (2026-08-30). A pad says "these
       belong together" (§5c), and that was first used to split one pad into two
       — COLOUR is one instrument, a readout and the three knobs that drive it,
       while Size and Shape are settings that merely sit next to each other.

       Followed through, the same rule takes the second pad away entirely: with
       Size gone to the rail in the gutter, that panel was drawn around a SINGLE
       control, grouping it with nothing. Shape stands on the case now, at the
       column's own width. The sheet is the one surface where Size is really
       mounted, so it is the one surface that still has two pads.

       The mini screen above them is a third section, and it always was: it is a
       separate part of the moulding, not a region of one. */
    <>
      <section className="pixl-pad px-4 pt-4 pb-4">
        {/* ---- Colour ----------------------------------------------------
          THE READOUT IS ABOVE THE KNOBS, as it is on the device this copies:
          the display is what the case shows you, and the controls sit under it.
          It was below them, which put the answer beneath the question.

          There is no "Colour" heading. The panel reads the colour out and the
          three knobs are legended H / S / L on the plastic — a label over that
          is a caption for something already saying its own name. */}
        <div>
          {/* TWO PANELS CUT INTO THE SAME FACE: the colour on one, the number
              on the other. They were one — a swatch chip sitting on the readout
              — which is a single display showing two unrelated things, and a
              readout is for the number. */}
          <div className="flex gap-2">
            {/* The colour's own screen, and the OS picker behind it. */}
            <label
              className="pixl-swatch"
              style={{ backgroundColor: resolved }}
              title="Pick a colour"
            >
              <input
                type="color"
                value={resolved}
                onChange={(event) => setColorText(event.target.value)}
                className="sr-only"
                aria-label="Pick a colour"
              />
            </label>

            {/* A SEGMENT PANEL, not a well. It was a hole with text lying in
                it; the reference device puts a DISPLAY in the case instead —
                the same part the mini screen already is, at readout scale. */}
            <div
              className={`pixl-lcd flex-1 ${invalid ? "outline outline-danger" : ""}`}
            >
              {/* The # and the digits are one string, so they sit flush —
                  "#000000", not "# 000000". No unit label beside them: "#"
                  already says hex, and a panel with one value on it does not
                  need to be told what kind of value it is. */}
              <div className="pixl-lcd-value">
                <span aria-hidden="true">#</span>
                <span className="pixl-lcd-slot">
                  {/* The glyphs. The input under this paints nothing — it has
                      no per-character boxes to animate, and this does. */}
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
                    aria-label="Icon colour, as a hex value"
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
          </div>

          <div className="mt-4">
            <ColorKnobs
              hsl={hsl}
              onChange={(next, hex) => set({ hsl: next, colorText: hex })}
              idPrefix={idPrefix}
            />
          </div>
        </div>
      </section>

      {/* ---- Size (sheet only) ------------------------------------------- */}
      {showSize ? (
        <section className="pixl-pad px-4 pt-4 pb-4">
          {/* SIZE IS HERE ONLY IN THE SHEET. On the board it is a full-height
            rail standing in the gutter beside the screen — see SizeScale.tsx —
            and a phone has no gutter to stand it in, so the sheet keeps the
            horizontal build. One of the two is ever mounted, which is the same
            arrangement the whole of this component already lives under. */}
          <div>
            {/* THE VALUE IS READ OUT HERE, and only here. The bar prints every
                other stop so its numbers do not collide on a phone, which
                leaves seven values with no printed number of their own — so the
                label carries the exact one. The rail needs no readout: it
                prints all fourteen. */}
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label
                htmlFor={`${idPrefix}-size`}
                className="text-caption text-text-muted"
              >
                Size
              </label>
              <span className="font-data text-caption tabular-nums text-text">
                {settings.size}
              </span>
            </div>
            <SizeScale
              size={settings.size}
              onSize={(next) => set({ size: next })}
              orientation="horizontal"
              id={`${idPrefix}-size`}
            />
          </div>

          <div className="mt-4">
            <ShapeWheel settings={settings} onSettings={onChange} />
          </div>
        </section>
      ) : null}

      {/* ---- Shape --------------------------------------------------------
          NO PAD ON THE BOARD, AND FULL WIDTH (2026-08-30). It shared one with
          Size, and with Size gone to the rail in the gutter that pad was a
          panel drawn around a SINGLE control: a pad says "these belong
          together" (§5c) and there was nothing to group. Its own 16px of
          padding also held the switch inset from the screen and the colour pad
          both, which reads as a control that did not quite fit rather than one
          mounted through the case.

          THE SHEET KEEPS IT, and for a different reason than the one that took
          it off the board. The drum's window and grip are HOLES CUT IN A PANEL
          — walls in the chassis's own tones, per §6 — and the sheet is a white
          surface, not a case. On the board the pad was redundant because the
          case is already there; in the sheet it IS the case. Size is in it too,
          which is the 2026-08-29 grouping still standing on the one surface
          where Size is really mounted.

          One of the two is ever rendered, which is the arrangement the whole of
          this component already lives under. */}
      {showSize ? null : (
        <ShapeWheel settings={settings} onSettings={onChange} />
      )}
    </>
  );
}
