"use client";

import { useState } from "react";
import { normalizeHex } from "@/engine/grid";
import { ToolGlyph } from "./ToolGlyph";
import { useComposer, useComposerStore } from "./ComposerProvider";

/**
 * THE CALIBRATOR WINDOW — the paint colour, read out on the deck (2026-09-19).
 *
 * Modelled on the little printed readout an instrument carries beside its
 * controls: a silkscreen frame routed into the panel, a small lit window, and
 * the value in it. It was a full-width segment panel on a pad of its own before
 * the scope reskin; on a front panel a readout is a small window near the
 * controls it reports on, not a display competing with the screen above it.
 *
 * IT IS STILL THE FIELD YOU TYPE INTO, and everything about that is unchanged:
 * the accessible name is still `Paint color, hex`, the draft-while-typing rule
 * is the same, and the store still normalises. The reskin is the frame around
 * it. Its tests therefore keep testing the same behaviour at the same address.
 *
 * THE EYEDROPPER IS PART OF THIS GROUP NOW (2026-09-19, by request). It was a
 * magenta cap in the left tool column, shouting at the same volume as Undo and
 * the transforms — and it is not one of those: every other tool ACTS ON THE
 * DRAWING, and this one produces a COLOUR. It belongs with the instrument that
 * produces colours, beside the chip showing the one currently loaded.
 *
 * SO IT IS DRAWN QUIET, which was the other half of the request. A small flush
 * key routed into the panel rather than a domed cap standing in a well: it is
 * reached occasionally and it is not what your hand rests on. The one time it
 * is loud is the one time that matters — ARMED, it takes the accent and lights,
 * because an eyedropper that is waiting for your next tap and does not say so
 * is a mode you have forgotten you are in.
 *
 * TWO SCREENS SIDE BY SIDE (2026-09-19, by request): the number, and the colour
 * it names in a window of its own beside it.
 *
 * IT WAS A ROUND CHIP, which put an indicator LAMP next to a DISPLAY — two
 * vocabularies for one value. As a rectangle it is the same KIND of thing as
 * the number: a reading, on the same glass, with the same cut around it. They
 * were stacked for one pass, which is the version that gave the hex its full
 * width; side by side the digits pay for the swatch and come down to 9px.
 *
 * THE VALID LAMP IS GONE with it. It lit whenever the typed value parsed, which
 * is a thing the window already says by showing six legible characters.
 *
 * THE LIT WINDOW TAKES THE PHOSPHOR, NOT THE PAINT COLOUR. A readout that
 * printed its value IN that value would be unreadable at black, at white, and
 * at every low-saturation colour in between — which is most of the ones you
 * actually draw with. The colour is reported by the chip beside it and by the
 * knob's own cap; this reports the NUMBER, which is a different job and the
 * reason the two were split in the first place.
 */
export function ColorReadout() {
  const store = useComposerStore();
  const currentColor = useComposer((s) => s.currentColor);
  const armed = useComposer((s) => s.eyedropperArmed);

  /* THE FIELD IS A DRAFT WHILE IT IS BEING TYPED. Committing every keystroke
     would reject "#ff" on the way to "#ff0000" and fight the typist, so the
     colour only moves when what is typed actually parses. */
  const [text, setText] = useState(currentColor);
  const [syncedFrom, setSyncedFrom] = useState(currentColor);
  if (currentColor !== syncedFrom) {
    setSyncedFrom(currentColor);
    /* ONLY WHEN THE CHANGE CAME FROM SOMEWHERE ELSE — a knob, the eyedropper.
       If the field's own text already resolves to the new colour, overwriting
       would expand "#00f" to "#0000ff" under the cursor and the rest of what is
       being typed would land on the end of that. It is the one non-obvious
       thing about driving a text input from a store that also drives it back. */
    if (normalizeHex(text) !== currentColor) setText(currentColor);
  }

  /* THE INPUT HOLDS THE WHOLE HEX, `#` INCLUDED. This is the field you TYPE a
     colour into, and with the hash printed outside it "#111111" pasted or typed
     arrives as "##111111" and parses as nothing. */
  const invalid = normalizeHex(text) === null;

  return (
    <div className="scope-readout">
      {/* THE FRAME IS NOT `aria-hidden`, and that is correctness rather than
          style: the input lives inside the window, and `aria-hidden` on an
          ancestor takes every descendant out of the tree with it — the field
          would be invisible to a screen reader while looking perfectly fine.
          Only the decorative parts carry it. */}
      {/* THE DISPLAY MODULE — one housing routed into the pad, carrying the
          glass and the key that works on it (2026-09-20). The eyedropper used
          to sit OUTSIDE this, alone on the pad between the readout and the
          dials, and it was the one control on the board that was neither a
          round key, a dial, nor a window: a rounded square floating on bare
          plastic with a legend under it, which read as a leftover.

          Inside the module it is what it actually is — a function key on a
          display's own bezel, the shape every instrument gives the control that
          loads a value INTO its readout. It also lines up under the colour
          window, same width, which is what makes the two read as one fitting
          rather than two things that happen to be near each other. */}
      <span className="scope-readout-housing">
        <span className="scope-readout-frame">
        <span className="scope-readout-window" data-invalid={invalid}>
          {/* The glyphs are an overlay; the input under them paints nothing but
              the caret. An `<input>` has no per-character boxes, and
              per-character is the only honest way to draw a lit readout. */}
          <span aria-hidden="true" className="scope-readout-digits">
            {text.split("").map((character, index) => (
              <span key={index} className="scope-readout-digit">
                {character}
              </span>
            ))}
          </span>

          <input
            id="pixl-paint-hex"
            type="text"
            inputMode="text"
            /* SEVEN, THE LENGTH OF "#FFFFFF" — a layout fix, not a validation
               one. A text input's default `size` is 20, and that is its
               INTRINSIC width: inside a rail sized to its contents, twenty
               phantom characters make the panel wider than the controls
               mounted through it. `width: 100%` does not help, because an
               intrinsic size is what the parent measures before there is a
               100% to resolve against. */
            size={7}
            spellCheck={false}
            autoComplete="off"
            value={text}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              // `setColor` normalises and ignores anything that does not
              // parse, so a half-typed value simply does not move the paint.
              store.getState().setColor(next);
            }}
            aria-invalid={invalid}
            aria-label="Paint color, hex"
            className="scope-readout-input"
          />
        </span>

        {/* THE COLOUR, as a lit window beside the number. `aria-hidden`: the
            field says the same value in text, and two readings of one fact in
            the accessibility tree is one too many. */}
        <span
          aria-hidden="true"
          className="scope-swatch-window"
          style={{ "--chip": currentColor } as React.CSSProperties}
        />
        </span>

        {/* THE KEY, on the module's own bezel under the glass. `aria-pressed`
            rather than a lamp: armed is this control's own state, and it is the
            only state left in this group to report. */}
        <span className="scope-readout-foot">
          <span aria-hidden="true" className="scope-legend">
            Pick
          </span>
          <button
            type="button"
            onClick={() => store.getState().armEyedropper()}
            aria-label="Pick color (eyedropper)"
            aria-pressed={armed}
            title="Then tap a filled cell to take its color"
            className="scope-pick"
          >
            <ToolGlyph name="eyedropper" size={16} />
          </button>
        </span>
      </span>
    </div>
  );
}
