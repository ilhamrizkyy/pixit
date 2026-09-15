# Reserved for the composer board

Saved 2026-09-12, by request: *"i want you to save the exact shape of this
current color setter for the composser board."*

## What is here

`color-knobs.css` — the seventeen rules that draw the gallery's knob colour
setter, lifted verbatim from `src/app/globals.css` at commit `3a8ace2`, before
the gallery was rebuilt in pixel chrome. This is the part that was actually at
risk: `globals.css` is edited in place, so the moulded construction would
otherwise survive only in git history.

## What is NOT here, because it was never at risk

These files are untouched in the tree and keep their tests:

| File | Why it is safe |
|---|---|
| `src/components/gallery/ColorKnobs.tsx` | the three-knob H/S/L instrument, unchanged |
| `src/components/gallery/ColorKnobs.interaction.test.tsx` | still runs, still passes |
| `src/components/Knob.tsx` | shared; the composer's own two knobs use it today |
| `src/composer/ColorKnobs.tsx` | the composer's existing Hue/Lightness pair |

**`ColorKnobs.tsx` will have no consumer** once the gallery stops rendering it,
so a dead-code sweep will offer to delete it. It is a deliberate retention with
a named destination, the same standing `svgToCells`, `cellsBetween` and
`applyOrientation` already have in BACKLOG §J. Do not delete it.

## Where it goes

The composer keeps the chassis — it is the board now — so this is the surface
these were always moulded into. DESIGN.md §6 already records that the gallery's
three knobs were "built from the same component" the composer's two are, which
is why this is a relocation rather than a port.

The behaviour that travels with the CSS is documented where it was decided, not
restated here: the segment readout's per-character refresh and its 200ms
throttle under DESIGN.md §6 "THE SEGMENTS REFRESH", and the knob's two builds —
CSS and R3F — and why they must describe one object, in the same section.
