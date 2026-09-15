# Widening the board's window from 1023px to 1024px halves its visible icon columns

Written against: working tree on branch `fresh`, base commit `3a8ace272a0f3622888b1c219612a30203f58cab` — `src/components/gallery/Gallery.tsx` and `src/app/globals.css` both carry uncommitted changes on top of that commit at audit time; re-check line numbers below against the current file before editing.

## Evidence chain

- Surface: the gallery board's chassis reveal — the point where the left column (mini screen + colour pad) and the size rail switch from hidden to shown, `src/components/gallery/Gallery.tsx:205` (`hidden ... lg:flex lg:w-66`) and `:403` (`hidden ... lg:flex`), gated by Tailwind's `lg` = `64rem` = 1024px, matched in `src/app/globals.css` at the time of writing (line numbers drift — the file was under concurrent edit during this audit; re-grep before editing) by `.pixl-mini { display: none }` inside `@media (width < 64rem)` and `.pixl-board`'s margin/gutter step inside `@media (width >= 64rem)`. **Re-verify with `grep -n "@media (width < 64rem)\|@media (width >= 64rem)\|^\.pixl-mini {\|^\.pixl-board {" src/app/globals.css` before editing** — at audit time this returned three separate `(width < 64rem)` blocks (one for `.pixl-mini`, one for `.pixl-chips`'s edge-fade mask, one for `.pixl-detailbar`'s column-stacking) and one `(width >= 64rem)` block (`.pixl-board`); only the `.pixl-mini` and `.pixl-board` ones govern the chassis reveal this plan is about — see step 3 below for why the other two are excluded, not renamed alongside them.
- Problem: at 1023px viewport width the board is in its stacked/mobile layout (no left column, no rail) and the screen alone occupies almost the full board width. At 1024px — one pixel wider — the three-part layout switches on atomically: a 264px column and a 60px rail, plus wider gutters and board margin, are all subtracted from the screen at once. Net effect, measured directly:

  | Viewport | Layout | Grid width | Card size | Rows for 24 icons | Columns |
  |---|---|---|---|---|---|
  | 1023×800 | stacked | 951px | 67.6px | **2** (`[12, 12]`) | 12 |
  | 1024×800 | three-part | 532px | 64.6px | **4** (`[7, 7, 7, 3]`) | 7 |

  Widening the viewport by one pixel **removes 5 visible columns and doubles the row count** for the current 24-icon registry. Screenshots `shot-just-under-lg-1023x800.png` and `shot-just-at-lg-1024x800.png` (this audit's scratchpad) show the qualitative version of the same thing: a plain rectangle with two full rows of icons, versus — one pixel wider — a hardware device with the same icons now needing four rows.

  This resolves by ~1440px: measured `1440×900` already shows `grid.width: 948px`, `rowCounts: [12, 12]` — parity with the stacked layout's row count. **The discontinuity is real only in roughly the 1024-1300px window**, not across the whole 768-1024px range a first read of the task might suggest — that whole range is uniformly the stacked/mobile layout (`mini`, `pad`, and `rail` all measure a zero rect at both 768px and 1023px). The switch is a single pixel, not a zone.

- Design evidence: DESIGN.md §5 fixes the grid at "a FIXED 64px track" and states "Density is what makes a set look like a set" as the reason for it; nothing in DESIGN.md analyzes or accepts a viewport range where widening the window reduces visible density. §5's "THE BOARD IS SIZED TO THE VIEWPORT" rule and §6's extensive, numerically-locked chassis geometry (the 264px column, the 60px rail, the gutter token) are all specified only for the two settled tiers (`< 64rem` and `≥ 64rem`); no intermediate or transitional chassis state is described anywhere in either document.
- Owner: a single Tailwind breakpoint (`lg` / `64rem`) simultaneously controls three independent things — chassis visibility, board margin, and board padding — with no staged reveal between them.
- Scope and affected surfaces: the gallery board's layout only, in the 1024-1300px viewport window. No change to the chassis parts' own geometry, the size rail's internal math, or the mini screen's aspect-ratio floor in the recommended direction.
- Uncertainty: which of the three directions below the owner prefers is a product call about how often the hardware chassis should be visible versus how smooth the resize should feel — the evidence establishes the problem and its magnitude, not a single determined fix. Direction 1 is recommended as the lowest-risk starting point.

## Design decision

**Recommended: Direction 1 — relocate the existing breakpoint from `lg` (1024px) to `xl` (1280px).** This is a pure threshold change (no new chassis geometry, no new token), using Tailwind's own next standard breakpoint, and it is grounded in this audit's own measurements: at 1280px the stacked tier would show ~15 columns (2 rows for 24 icons) and the three-part tier measures 10 columns (`shot`/measurement at `1280×800`: `grid.w: 788`, `rowCounts: [10, 10, 4]`, 3 rows) — a one-row jump instead of today's two-row jump, for zero new engineering beyond a class/media-query rename.

## Reuse

- Tailwind's `xl` breakpoint (`80rem` / 1280px) — already defined in the toolchain, no `@theme` addition needed.
- Every existing chassis rule under `@media (width >= 64rem)` / `(width < 64rem)` in `src/app/globals.css` (`:1277`, `:3529`, and the rail/bar split in `SizeScale.tsx`'s consuming CSS) — reused verbatim, only the threshold value changes.
- Exemplar for the "should this be staged instead" alternative: the composer dock's own measured breakpoint reasoning — `TECH-STACK.md`/DESIGN.md record `lg` there as "measured, not chosen: the full row is 973px, so it fits at 1024 with room" — i.e. this project already has precedent for picking a breakpoint from a measured content width rather than a convention, which is exactly the method used here to justify 1280 over 1024.

No new primitive is required for the recommended direction.

## Changes

1. `src/components/gallery/Gallery.tsx:205`
   - Change: `lg:flex lg:w-66 lg:self-stretch` → `xl:flex xl:w-66 xl:self-stretch` (and `hidden` stays paired with the same prefix change so the element is hidden below `xl` instead of below `lg`).
   - Preserve: the column's own internal layout, width (264px / `w-66`), and everything inside it (`MiniScreen`, `GallerySidebar`) — unchanged.
   - Verify: below 1280px the column is `display: none`; at and above 1280px it renders exactly as it does today at 1024px.

2. `src/components/gallery/Gallery.tsx:403`
   - Change: `hidden shrink-0 self-stretch lg:flex lg:items-center` → `hidden shrink-0 self-stretch xl:flex xl:items-center`.
   - Preserve: `SizeScale`'s own internals, unchanged.

3. `src/app/globals.css`: the `.pixl-mini` hide rule (inside a `@media (width < 64rem)` block) and the `.pixl-board` margin/gutter step (inside a `@media (width >= 64rem)` block) — confirmed at audit time to be two of four total `64rem` board-related media queries in this file.
   - Change: move only these two to `80rem` (`< 80rem` / `>= 80rem`).
   - **Do NOT move these two, confirmed separate at audit time**, without independently re-deriving whether they should track this breakpoint at all:
     - `.pixl-chips`'s edge-fade `mask-image`, inside its own `@media (width < 64rem)` block — this exists because the category-chip row overflows and needs a scroll-fade cue; that depends on the **screen's own width**, not on whether the chassis is visible. Since the screen is wider, not narrower, in the 1024-1279px range once the chassis reveal moves to 1280px (no column/rail yet subtracting from it), the chip row very likely has *more* room there than it does today at 1024px+ — moving this rule too could turn off a fade that is now needed for longer, or leave it on past the point it is needed. Test the chip row's overflow behavior at 1024-1279px after step 1-2 land, independently, before touching this rule.
     - `.pixl-detailbar`'s two-column-to-stacked collapse, inside its own `@media (width < 64rem)` block (comment there says "NO COLUMN TO SPLIT at 390px", i.e. it was tuned for phone width, not for chassis presence). The detail bar renders inside `.pixl-screen`, which is *wider*, not narrower, in the 1024-1279px range after this change (975px there today at 1023px, and the chassis reveal moving out to 1280px means the screen stays that wide rather than being cut to ~532px) — so its two-column layout likely still fits and this rule should probably stay at `64rem` (or be re-measured against the new, wider screen at that range) rather than move to `80rem` in lockstep.
   - Preserve: the values assigned inside the two moved blocks (`--board-gutter: 1.25rem`, `margin: 1.5rem`, etc.) — only the trigger width changes, not what happens at it.
   - Verify: `grep -n "@media (width < 64rem)\|@media (width >= 64rem)" src/app/globals.css` after the change shows exactly two remaining `64rem` board-area occurrences (`.pixl-chips`, `.pixl-detailbar`), both deliberately left in place per the note above, plus whatever unrelated `64rem` usages exist elsewhere in the file (nav, composer, etc. — untouched, out of scope).

4. `src/components/gallery/GalleryToolbar.tsx:103` — **required, not optional.** The mobile filter button (`aria-expanded={filtersOpen}`, opens `FilterSheet`) carries `lg:hidden`, i.e. it disappears at exactly 1024px today, the same point the sidebar appears. If step 1-2 move the sidebar/rail reveal to `xl` (1280px) without also moving this button's threshold, **the 1024-1279px range loses every way to reach Colour, Size, and Shape** — the sidebar is not yet shown and the button that opens the sheet holding the same controls has already hidden. This is the single most important companion change in this plan; verify it before anything else.
   - Change: `lg:hidden` → `xl:hidden` on this element.
   - Verify: at 1024px and 1279px, the filter button is visible and opens `FilterSheet` with working Colour/Size/Shape controls; at 1280px it is gone and the sidebar/rail are present instead. There must be no pixel width where neither is available.

5. Any other `lg:` utility that exists *specifically* to coordinate with this same reveal (re-grep `lg:` across `src/components/gallery/*.tsx` rather than assuming the list above is exhaustive — the file set was under concurrent edit during this audit). Do **not** rename unrelated `lg:` usages elsewhere in the app (e.g. the nav's hamburger collapse, or the composer's own, separately-justified 1024px threshold) — this change is scoped to the gallery board's own chassis, not a global breakpoint redefinition.

## Scope

- Inherit: the gallery board's chassis reveal only.
- Verify: the mobile filter sheet (`FilterSheet.tsx`) must still be the *only* way to reach Colour/Size/Shape between 1024px and 1280px after this change (today it already is, below 1024px) — confirm its own open/close trigger is not itself gated at `lg` in a way that would leave a gap where neither the sidebar nor the sheet is reachable.
- Exclude: the global nav's hamburger breakpoint, the composer's own `lg` usage (a *different*, already-measured 1024px threshold for a *different* piece of content — do not touch it), and the icon-grid capacity problem covered in the companion plan `grid-idle-capacity.md`.

## Validation

- Product: resize a browser window slowly from 1000px to 1300px; confirm there is no point at which widening the window reduces the number of visible icon rows for the current 24-icon set (there will still be a one-row change at 1280px under the recommended direction — the goal is reducing the jump from two rows to one, not eliminating it, see "Stop conditions").
- Interface: re-run this audit's measurement viewports (`1023×800`, `1024x800` renamed to `1279×800`/`1280×800`, plus `1280×800`, `1440×900`) and confirm the new numbers match the table above; check both themes.
- System: `grep -rn "64rem" src/components/gallery src/app/globals.css` to confirm no stray reference to the old threshold was missed in a file this plan did not enumerate.
- Repository: `grep -c "xl:flex" src/components/gallery/Gallery.tsx` → expect 2 (the column and the rail wrapper), matching the two `lg:flex` occurrences removed.

## Stop conditions

- Stop if moving to 1280px is rejected because it delays the hardware chassis's appearance across a viewport range (1024-1279px) the owner considers common and important to show the toy on — in that case fall back to one of the two alternatives below rather than force this one:
  - **Alternative A — stage the reveal.** Bring in the left column (mini screen + colour pad) at 1024px as today, but delay only the size rail (and its ~80px of screen-width subtraction) to a later breakpoint (e.g. 1280px). Softens the cut from ~420px of subtracted chrome to ~340px (roughly 4-5 columns lost instead of 5-6) at the 1024px mark, at the cost of a chassis with a visibly bare right edge for that range — the exact gap the rail was built to fill (DESIGN.md §6: "the one side of the chassis carrying nothing"). Reintroducing that gap for an intermediate width range is a real identity cost, not a free partial fix.
  - **Alternative B — interpolate the chassis width continuously (rejected as disproportionate for this problem).** Use `clamp()` to shrink the column's width, the mini screen's square size, and the rail's width smoothly across a defined range instead of snapping. This is the only direction that turns the cliff into a true ramp, but it requires re-deriving every piece of DESIGN.md's exhaustive, numerically-locked chassis math for a state that document never describes — the mini screen's `aspect-ratio` floor arithmetic, the rail's magnifier/graduation alignment (explicitly "two tokens and its travel is a third, scoped to the RAIL"), and the badge/legend positioning all assume one of exactly two fixed widths today. Disproportionate engineering cost for a transition zone that only exists while a user is actively mid-drag on their window's edge.
- Stop if any `lg:` occurrence renamed in step 4 turns out to be shared with non-board UI (e.g. a utility class reused elsewhere by coincidence of Tailwind's atomic classes) — confirm each occurrence's owning component before renaming, since Tailwind's utility classes are not scoped to a single component by name.

## Design documentation

- After acceptance and validation: record the chosen breakpoint (1280px) and the measured reasoning behind it (the row-count parity table above) in DESIGN.md §5, next to the existing board-sizing rules — the document currently states only that the board switches at `lg` with no discussion of why 1024 was chosen for the chassis reveal specifically (as opposed to the composer dock's own, separately-justified 1024px threshold). If Alternative A or B is chosen instead, record that decision and its trade-off there instead.
