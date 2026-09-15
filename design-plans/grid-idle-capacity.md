# The icon screen shows mostly bare glass at ordinary desktop sizes

Written against: working tree on branch `fresh`, base commit `3a8ace272a0f3622888b1c219612a30203f58cab` — `src/components/gallery/Gallery.tsx` and `src/app/globals.css` both carry uncommitted changes on top of that commit at audit time; re-check line numbers below against the current file before editing.

## Evidence chain

- Surface: the gallery board's icon screen, `/` — `<ul aria-label="Icons">` in `src/components/gallery/Gallery.tsx:319-322`, painted on `.pixl-screen` (`src/app/globals.css`, `.pixl-screen {` at line 1189 at audit time — `globals.css` was under concurrent edit during this audit; re-grep `^\.pixl-screen {` before editing).
- Problem: at the registry's real size (24 icons), the icon grid fills a small fraction of the screen's height at every desktop viewport measured, including DESIGN.md's own reference size (1440×900). Measured with the icon panel's header (search + chips) at a fixed ~128px, so `empty = screen.height - 128 - grid.height`:

  | Viewport | Screen height | Grid height | Empty below icons | % of screen empty |
  |---|---|---|---|---|
  | 1440×900 (the doc's own reference size, DESIGN.md §5) | 739px | 154.7px | 584.3px | **79%** |
  | 1100×900 (ordinary laptop) | 739px | 225.5px | 513.5px | **69%** |
  | 1920×1080 | 919px | 155.1px | 763.9px | **83%** |
  | 1440×1600 (tall) | 1439px | 154.7px | 1284.3px | **89%** |

  Screenshots: `shot-1440x900.png`, `shot-1100x900.png`, `shot-1920x1080.png`, `shot-tall-1440x1600.png` in the scratchpad used for this audit — each shows a small cluster of icons in the top-left of an otherwise blank `--grid-bg` rectangle.

  A second, independent symptom of the same mechanism: the grid uses `grid-cols-[repeat(auto-fill,minmax(64px,1fr))]` (`Gallery.tsx:321`). `auto-fill` reserves every track that fits the container width whether or not an icon exists to fill it, so an incomplete last row shows dead track-width trailing the final card rather than the cards absorbing the leftover space. At 1920×1080 the grid fits 18 columns; 24 icons fill row 1 completely and only 6 of 18 tracks in row 2 — **12 of 18 tracks (67% of that row's width) sit visibly empty** to the right of the last icon (measured `rowCounts: [18, 6]`).

- Design evidence: DESIGN.md §5 sets the grid's density rule and names this exact risk in its own words — *"Density is what makes a set look like a set — but it also makes a small set look emptier, so it is the right call only while the set grows."* That sentence accepts some emptiness as a temporary cost of a 24-icon set. It does not anticipate the measured severity: 79-89% of the *display itself* rendering nothing, at the plan's own reference resolution, which cuts against §1's thesis in the same document — *"the board IS the toy... a wall of icons is what an icon set looks like."* A wall that is 80% missing does not read as a wall.
- Owner: `.pixl-screen`'s background (`background: var(--grid-bg)`, inside the `.pixl-screen` rule above) is a single flat fill with no idle treatment. The product already has a built-in vocabulary for "a display that is on and has nothing on it" one component over: the mini screen's idle state (`src/components/gallery/MiniScreen.tsx:32-35`, `PixelReveal.tsx`) — "a pixel display that is on with nothing on it," built from a faint, low-contrast dot matrix at the 4-unit cell pitch. That pattern exists, is tested, and is never applied to the big screen.
- Scope and affected surfaces: the icon grid container and `.pixl-screen`'s background only. Does not touch `MAX_RENDERED_SIZE`, the 64px seat, stored `cells`, or any `IconDef`.
- Uncertainty: whether the owner treats this as urgent now or accepts it as a known cost that recedes as the registry grows (DESIGN.md's own framing leans toward the latter). The three directions below are ordered by leverage-to-cost, not by a single asserted "correct" answer — this is a compositional judgment call, not a rule violation with one determinable fix.

## Design decision

No single change is asserted as *the* fix; three directions are specified below at build-ready precision, ranked by leverage-to-cost. Recommended starting point is **Direction 1** (cheapest, reversible, no layout change) — build it, look at it on a real screen at 1440×900 and 1920×1080, and only reach for Direction 2 if the sparseness still reads as broken rather than as "a big display with room to grow."

## Reuse

- `--grid-bg`, `--grid-card` (defined per-theme in `globals.css`'s `:root` and dark-theme token blocks — re-grep `--grid-bg:`/`--grid-card:` for current line numbers, the file was under concurrent edit during this audit) — existing screen/card tokens, untouched.
- The mini screen's idle dot-matrix treatment — `src/components/gallery/PixelReveal.tsx`, `src/components/gallery/MiniScreen.tsx:32-35` — exemplar for Direction 1's texture and its "on, showing nothing" framing.
- `src/engine/constants.ts:52` (`MAX_RENDERED_SIZE`) and `DEFAULT_ICON_SIZE` (`:41`) — read, not changed, by Direction 3.

No new primitive is required for Directions 1 or 3. Direction 2 needs one new value (a column cap) with no existing token to hold it — see Direction 2's own note.

## Changes

### Direction 1 — idle dot-matrix ground behind the grid (recommended first)

1. `src/app/globals.css` (near `.pixl-screen`, `:1177`)
   - Change: add a repeating dot pattern to `.pixl-screen`'s background, at the same visual weight and pitch as the mini screen's idle unlit-cell dots, sitting *behind* the `<ul>` grid (z-index below `.pixl-card`, which already elevates on hover/focus via `li:has(.pixl-card:hover)` — do not change that stacking order). A tileable `radial-gradient`/`background-image` at low opacity against `--grid-bg`, matching whatever alpha the mini screen's own idle dots use so the two screens read as one material.
   - Preserve: `--grid-card`'s contrast against `--grid-bg` (§2's measured pairing) — the new texture sits *under* both, so it must not raise `--grid-bg`'s luminance enough to shift that measured relationship. Verify against the existing contrast test for the card/screen pair before shipping.
   - Verify: at 1440×900 and 1920×1080, the area below/beside the icons reads as "more of the display" rather than "blank space" — a visual judgment call, confirm by eye, not by a new automated assertion.

- Behaviour on hover/focus/selection: none. This is a static ground layer with no interactive state — it never receives hover, focus, or selection, and must not intercept pointer events (`pointer-events: none` if implemented as a pseudo-element or overlay rather than a `background` property, though a plain `background-image` on `.pixl-screen` needs no such guard since it is not a separate box).
- Trade-off: cheap, CSS-only, reversible in one line, and keeps the "density is the point" framing honest without touching layout. It does not reduce the actual sparseness — it reframes it. Risk: a tiled dot pattern across ~750px of empty height (the 1920×1080 case) may read as visual noise rather than texture at that scale; sample it on a real screen before committing, and consider a mask that fades the pattern's opacity further from the last row of icons rather than tiling it at uniform strength indefinitely.

### Direction 2 — cap the grid's stretch so leftover width becomes symmetric margin, not one-sided overflow

1. `src/components/gallery/Gallery.tsx:321`
   - Change: replace `grid-cols-[repeat(auto-fill,minmax(64px,1fr))]` with a grid whose track is genuinely fixed (e.g. `grid-cols-[repeat(auto-fill,64px)]`) and add a `max-width` to the `<ul>` (or a centering wrapper) capped at a deliberately chosen column count. Center the `<ul>` horizontally in the panel (`justify-self: center` or `margin-inline: auto`) so any leftover width becomes even left/right margin instead of trailing space after the last card in a row.
   - Preserve: the 64px seat and `renderedIconSize`'s 48px cap (`Gallery.tsx:342`) are untouched — this only changes how the *tile* is measured, not how large the *art* inside it may be.
   - Verify: card width becomes a true, constant 64px at every viewport (today it measures 64.5-68.5px because `1fr` stretches every track — this also quietly resolves the mismatch between `Gallery.tsx:313`'s own comment, *"THE TILE IS FIXED at 64px,"* and its current, variable, on-screen behaviour).

- Behaviour on hover/focus/selection: unaffected — `.pixl-card`'s hover/selected states are unchanged; only the track-sizing function changes.
- Trade-off: converts the 1920×1080 case's "6 icons then a 67%-empty row" into "6 centered icons with even margins either side" — reads as composed rather than incomplete. It reduces peak column count at very wide viewports (a real cost against "density is the point" at the high end) and needs an explicit cap value, which is a product decision this evidence does not determine on its own — the prior audit's Batch 1 owner feedback already settled on "12 columns at 1440" as a target density, which is one reasonable anchor for the cap. Does not address the *vertical* emptiness (Direction 1 or a paired `align-content` change would still be needed for that half).

### Direction 3 — raise the default render size (considered, likely insufficient on its own)

1. `src/components/gallery/settings.ts` (`DEFAULT_SETTINGS.size`, currently `DEFAULT_ICON_SIZE = 24`, `src/engine/constants.ts:41`)
   - Change: raise the gallery's default `size` toward `MAX_RENDERED_SIZE` (48), so each icon draws at the largest size its fixed 64px seat allows, by default.
   - Preserve: `MAX_RENDERED_SIZE` itself, and the seat — this only changes the *default value* of an existing, user-adjustable setting.
- Trade-off: nearly free, but does not touch row count or the trailing dead area — a 48px icon in a 64px tile leaves exactly the same number of empty tracks and rows as a 24px one. Included so a future plan does not re-propose it as if it addressed this specific, measured problem; it does not.

**Rejected outright:** growing the grid's tile past 64px, or the art past 48px, to fill space. This directly collides with the locked constraint that the 64px seat is fixed and `MAX_RENDERED_SIZE` derives from it (`src/engine/constants.ts:44-52`, CLAUDE.md).

## Scope

- Inherit: the public gallery board only (`/`). No composer, no engine, no `IconDef` change in any direction.
- Verify: the filter sheet's own copy of the grid does not exist (the icon grid itself is not duplicated in `FilterSheet.tsx` — only the Colour/Size/Shape controls are) — confirm no second grid instance needs the same texture/cap applied.
- Exclude: the mini screen's own idle treatment (already correct, do not modify); the size rail; the breakpoint behaviour covered in the companion plan `board-breakpoint-density-cliff.md`.

## Validation

- Product: load `/` with the real 24-icon registry at 1440×900 and 1920×1080; confirm the screen no longer reads as mostly blank on first impression.
- Interface: check both themes (light/dark — `--grid-bg` differs per theme, `globals.css:747` vs `:875`), and re-run at the viewports in the evidence table above plus a very tall window (e.g. 1440×1600) to confirm the fix scales with content height, not just width.
- System: confirm no new colour token was introduced (Direction 1's dot pattern must resolve from `--grid-bg`/`--grid-card` tones only — no new hex, no second accent, per CLAUDE.md rule and DESIGN.md §7).
- Repository: `grep -n "grid-cols-\[repeat(auto-fill" src/components/gallery/Gallery.tsx` → confirms which direction (1 vs 2) is live, since only Direction 2 touches this line.

## Stop conditions

- Stop if Direction 1's dot texture measurably lowers `--grid-card` vs `--grid-bg` contrast below the pairing's existing measured value (§2) — re-tune opacity rather than ship a regression on a token pair DESIGN.md calls out by name.
- Stop if a column cap (Direction 2) is being chosen without the owner's input — the cap value is a product decision, not one this evidence determines.

## Design documentation

- After acceptance and validation: whichever direction ships, record the outcome in DESIGN.md §5 alongside the existing "makes a small set look emptier" sentence, since that sentence is what the next reader will otherwise cite as the entire design position. State when the density cost was addressed and how, or state that it was deliberately deferred until the registry grows.
