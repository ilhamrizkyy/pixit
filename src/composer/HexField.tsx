"use client";

import { useState } from "react";
import { normalizeHex } from "@/engine/grid";
import { useComposer, useComposerStore } from "./ComposerProvider";

/**
 * The paint colour: a live swatch and the exact hex behind it.
 *
 * Lives in the dock rather than on the toy. It is the one colour control that
 * is a VALUE rather than a gesture — the knobs and the saturation slider are
 * the toy's, this is the readout you copy and paste — and moving it off the
 * frame gives the board the height back.
 *
 * `stacked` is the sheet's form: a visible label and a field that takes the
 * width it is given, since a sheet is a column and nothing beside it explains
 * what the hex is for.
 */
export function HexField({ stacked = false }: { stacked?: boolean }) {
  const store = useComposerStore();
  const currentColor = useComposer((s) => s.currentColor);

  // The field is a DRAFT while it is being typed. Committing every keystroke
  // would reject "#ff" on the way to "#ff0000" and fight the typist; the colour
  // only moves when what is typed actually parses.
  const [text, setText] = useState(currentColor);
  const [syncedFrom, setSyncedFrom] = useState(currentColor);
  if (currentColor !== syncedFrom) {
    setSyncedFrom(currentColor);
    // Only when the change came from SOMEWHERE ELSE — a knob, the eyedropper.
    // If the field's own text already resolves to the new colour, overwriting
    // would expand "#00f" to "#0000ff" under the cursor and the rest of what is
    // being typed would land on the end of that.
    if (normalizeHex(text) !== currentColor) setText(currentColor);
  }

  const invalid = normalizeHex(text) === null;

  const field = (
    <div className="flex items-center gap-2">
      <ColorSwatch color={currentColor} className={stacked ? "size-11" : "size-7"} />
      <input
        id="pixl-hex"
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          setText(event.target.value);
          store.getState().setColor(event.target.value);
        }}
        className={`rounded-sm border bg-surface px-2 font-data text-caption text-text focus:outline-none ${
          stacked ? "h-11 min-w-0 flex-1" : "w-24 py-1.5"
        } ${invalid ? "border-danger" : "border-border focus:border-accent"}`}
      />
    </div>
  );

  if (!stacked) {
    return (
      <div className="shrink-0">
        <label htmlFor="pixl-hex" className="sr-only">
          Paint colour, hex
        </label>
        {field}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="pixl-hex" className="text-caption text-text-muted">
        Paint colour
      </label>
      {field}
    </div>
  );
}

/**
 * The colour itself, as a plain square. Decorative on purpose: it shows what
 * the hex beside it already says, and the toy's knobs are what set it.
 */
export function ColorSwatch({ color, className }: { color: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-sm border border-border ${className}`}
      style={{ background: color }}
    />
  );
}
