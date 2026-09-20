/**
 * The colour itself, as a plain square.
 *
 * Decorative on purpose: it shows what the readout beside it already says in
 * text, and the knobs and the groove are what set it. `aria-hidden` for the
 * same reason.
 *
 * IT WAS THE SECOND EXPORT OF `HexField.tsx`, which is gone (2026-09-18). The
 * hex field moved onto the board as a moulded segment panel — see
 * `ColorReadout.tsx` — and a file named for a component it no longer contains
 * is worse than one more file.
 *
 * The compact dock still uses this: below `lg` the dock's first cell is the
 * live paint colour, which is the one dock value that changes while you draw.
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
