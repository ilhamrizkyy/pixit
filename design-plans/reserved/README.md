# Reserved for the composer board

> **SPENT, 2026-09-18 — and spent AGAIN, properly, on 2026-09-19.** The first
> attempt put a moulded segment readout between the two knobs with saturation as
> a milled groove under it, and it was wrong in the way this file could not warn
> about: it restored the PARTS and not the OBJECT. A knob at each end of a lane,
> a readout and a groove between them is four fittings at four widths on three
> constructions. What the snapshot was a photograph of is one INSTRUMENT — a pad
> with a readout across the top and three identical dials under it — and a pad
> is the one thing in it that carries no construction of its own, so it was the
> one thing not in the file.
>
> The board now has that instrument. `.pixl-lcd` and `.pixl-swatch` are scoped
> under `.composer-scope` so the gallery keeps its flat version, and
> `.pixl-pad`'s recess is scoped the same way — it had been stripped to a bare
> radius when the gallery went pixel chrome, correctly, because a pad needs a
> case to be set into.
>
> **The lesson for the next reserved snapshot:** save the ASSEMBLY, or a note
> saying what the parts add up to. Seventeen rules restored faithfully still
> rebuilt the wrong thing, and the reviewer who caught it did it from a
> screenshot in one line.
>
> **What this file was actually protecting, and it called it correctly:** the
> classes were never deleted. Fifteen of the seventeen rules here turned out to
> be still live and byte-identical. Only `.pixl-lcd` and `.pixl-swatch` had
> drifted, and they had drifted into pixel chrome exactly as the note below
> predicted — *"globals.css is edited in place, so the moulded construction
> would otherwise survive only in git history."*
>
> **One thing it could not anticipate:** it used `var(--radius-sm)`, and that
> token became a named zero when the gallery went flat. Restored verbatim it
> gave the toy a square panel on a board of rounded parts, so the composer's
> rules carry an explicit 4px instead.
>
> **`ColorKnobs.tsx` IS NO LONGER ORPHANED, and the gallery's copy is deleted.**
> It was listed here on 2026-09-18 as "orphaned by decision", on the reading
> that two knobs plus a groove had been chosen over the three-knob H/S/L
> instrument. That reading was wrong and was corrected the next day: three knobs
> is the instrument, because H, S and L are three axes of ONE thing, and a
> slider between two dials is the single control that did not get to be
> hardware.
>
> The component lives at `src/composer/ColorKnobs.tsx` now — the composer is the
> only surface with a chassis, so there is no second home for it to have. The
> gallery's prop-driven copy went with the move rather than being kept beside
> it: what is genuinely shared is `@/components/Knob`, which both the composer's
> dials and the gallery's (were it ever to grow any) are built from, and two
> components differing only in where they read their state is the drift this
> project keeps paying for.
>
> Kept rather than deleted, because it is the record of what the construction
> was before the rebuild, and a diff against it is how the next drift gets
> caught.


Saved 2026-09-12, by request: *"i want you to save the exact shape of this
current color setter for the composser board."*

## What is here

`color-knobs.css` — the seventeen rules that draw the gallery's knob colour
setter, lifted verbatim from `src/app/globals.css` at commit `3a8ace2`, before
the gallery was rebuilt in pixel chrome. This is the part that was actually at
risk: `globals.css` is edited in place, so the moulded construction would
otherwise survive only in git history.

## What is NOT here, because it was never at risk

This section is **settled, 2026-09-19** — the retention it argued for is over,
because the destination arrived.

| File | Where it ended up |
|---|---|
| `src/components/gallery/ColorKnobs.tsx` | **deleted.** Its three knobs are the composer's now; two components differing only in where they read their state is the drift this project keeps paying for |
| `src/components/gallery/ColorKnobs.interaction.test.tsx` | deleted with the gallery's chassis on 2026-09-15 |
| `src/components/Knob.tsx` | **unchanged, and it is the real shared thing** — the gesture, the roles, the keys and both dial builds |
| `src/composer/ColorKnobs.tsx` | **the surviving instrument**: H, S and L, reading the composer's store directly |

It was a deliberate retention with a named destination, the same standing
`svgToCells`, `cellsBetween` and `applyOrientation` still have in BACKLOG §J —
and unlike those three it has now been spent, which is what that standing was
for.

## Where it goes

The composer keeps the chassis — it is the board now — so this is the surface
these were always moulded into. DESIGN.md §6 already recorded that the gallery's
three knobs were "built from the same component" the composer's were, which is
why this was a relocation rather than a port.

**It landed on 2026-09-19.** The board carries one `.pixl-pad` holding a swatch,
the segment readout and H / S / L on three identical dials. `.pixl-pad`'s own
recess had to be restored with them and was not in this file, which is the gap
worth remembering: a snapshot of the parts does not contain the panel they are
mounted in, and the panel is the thing that makes them one instrument.

The behaviour that travels with the CSS is documented where it was decided, not
restated here: the segment readout's per-character refresh and its 200ms
throttle under DESIGN.md §6 "THE SEGMENTS REFRESH", and the knob's two builds —
CSS and R3F — and why they must describe one object, in the same section.
