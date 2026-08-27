# INTERACTION.md — Interaction Spec

> How everything behaves. Keep behavior consistent with this while building;
> expect small updates once it's in real code. Visuals live in @docs/DESIGN.md.

---

## 0. Access & routing (critical)

- **Public** can use: Gallery, icon detail modal (copy/download), Guide,
  Resources. Read-only.
- **Owner only** (authenticated as Ilham): the Create/composer route and, later,
  curation. The "+ Create" entry and the composer route are hidden/blocked for
  everyone else (server-side check, not just a hidden button). See @docs/TECH-STACK.md.

## 1. Composer — drawing

- **Tap a cell** → fill with the current color. **Tap a filled cell** → clear it
  (no separate eraser). From the keyboard: arrows move a cell cursor and
  **Space** fills or clears it.
- **Drag = rectangle fill** (decided 2026-08-18). Press one corner and drag to
  the opposite one; the whole axis-aligned rectangle fills, following the
  pointer live. Mode is decided on press and fixed for the gesture: start on an
  empty cell → the rectangle paints; start on a filled cell → it erases. A paint
  drag **overwrites** filled cells it covers.
  - The rectangle is recomputed against the **pre-gesture** drawing on every
    pointer sample, so it **shrinks** when the pointer comes back toward the
    origin. Building on the running result instead would make a drag a one-way
    ratchet that keeps everything it ever touched.
  - Corners are normalised: dragging up-left covers the same cells as dragging
    down-right.
  - The whole drag is **one undo step**, committed on release.
  - This replaced freehand line-drag. `cellsBetween` (Bresenham) is retained in
    the engine, unused, so a freehand mode can be added later without rework.
- **Hover** (no press) → faint preview of the current color on the hovered cell.
- **Mirror** (toggle): while on, painting one side mirrors live to the other
  across the vertical center. It's a drawing aid — not stored on the icon.
- **Grid guide** (toggle): show/hide the faint cell gridlines.
- **Eyedropper** (the droplet button): activate, then tap any filled cell to set
  its color as the current color (also syncs the knobs/sliders); deactivates
  after one pick.

## 2. Composer — transforms & history

- **Flip H / Flip V / Rotate**: one-shot transforms of the whole drawing.
  Rotate is **90° clockwise per press** only.
- **Undo / Redo**: buttons on the toy + keyboard (Ctrl/Cmd+Z, Ctrl+Y or
  Ctrl/Cmd+Shift+Z). Every mutating action (draw stroke, transform, clear,
  slide-erase) is one undo step.

## 3. Composer — slide to clear

- A groove the width of the board. Dragging the handle left→right **erases the
  drawing progressively by column** (follows the handle), not all-at-once.
- Release snaps the handle back to 0; whatever was wiped stays wiped. The whole
  wipe is a single undo step.

## 4. Composer — color (full HSL picker)

- **Left knob = Hue** (full 360°, wraps). **Right knob = Lightness** (black →
  color → white). Knobs physically turn on drag; only the dial rotates. Each
  knob's ring previews what it controls.
- **Saturation slider** in the color panel (0 = neutral gray → full color).
- **Hex field**: type any 6-digit hex; the knobs + slider snap to the nearest
  match and the exact hex becomes the paint color.
- **No preset swatches** (removed 2026-08-18). A row of fixed colours under
  the screen is a second, competing colour control next to two knobs, a
  saturation slider and a hex field — true black and true white are one knob
  turn away.
- **Rule**: changing the color affects only the **next** cells drawn; existing
  cells keep their color.

## 5. Composer — metadata, import, save (bottom dock)

- **Name / Category / Tags** fields and a live current-color chip. (No
  pixel/cell counter — removed.)
- **Below `lg` the dock is one row and a sheet.** The bar keeps the colour
  swatch, Name and Save; a chevron beside them opens a **Details** sheet
  holding Category, Tags, the hex field, the help toggle, and Import / Export.
  Nothing appears in both places.
  - The sheet edits **live**, with no draft and no Apply — unlike the gallery's
    filter sheet, which defers because it covers the grid it is changing. These
    fields change metadata, which is not on screen either way.
  - A **view toggle** (help) leaves the sheet open; its own pressed state is
    the feedback. **Export** closes it, because it ends in a toast and a toast
    behind the backdrop is a confirmation nobody sees. **Import** closes it
    too, but for a different reason: it opens the picker, and two stacked modal
    surfaces means two focus traps and no way to tell which Escape belongs to
    which.
  - Dismiss with the backdrop, ✕, or Escape. Nothing is discarded — there is
    no draft to discard.
- **Import icon** (owner action, lives in this dock): opens a **picker over the
  set** — the published registry plus anything saved in this browser, with a
  search field — and puts the chosen icon's art on the board.
  - It brings the **art only**. Name, category and tags are left alone, which
    is parity with the file import it replaced and is what keeps the action
    from dead-ending: an id is immutable once published, so loading
    `arrow-right`'s *name* would hand you a board that Save and Copy entry both
    refuse. Editing a published icon in place is the update half of owner CRUD
    and is a separate feature.
  - It is **one undo step**. Import commits to history rather than resetting
    it, so Ctrl/Cmd+Z gives back whatever was on the board. Choosing from a
    grid is one click, so importing over work in progress is easy to do by
    accident — a reset history could not undo it.
  - Locally saved icons appear alongside the registry, marked, since an icon
    you saved in this browser is one you are likely to want back.
  - **Replaced the SVG file picker (2026-08-21).** Reaching art that is already
    in the gallery meant exporting it and uploading it back — a round trip
    through the filesystem to arrive where you started, and the only route to
    editing published art. `svgToCells` is retained in the engine, tested and
    unused, the way `cellsBetween` is.
- **Export**: download the current drawing as SVG (baked colors).
- **Copy entry** (owner action): puts the icon on the clipboard as the
  `defineIcon({ ... })` source you paste into `src/registry/icons.ts` — art map
  and palette, not a 121-element array, so the diff shows the drawing.
  - This is what makes a drawn icon PUBLIC. Save keeps it in this browser;
    nothing but the registry reaches the gallery everyone else sees.
  - A string on the clipboard rather than a commit, deliberately: the registry
    is reviewed in a diff, and an `id` is immutable once published, so a person
    looks at it before it becomes permanent.
  - Refused if the id already exists in the **published** registry. A collision
    with a locally saved icon is fine and expected — that is usually the entry
    for the icon you just saved.
- **Save icon**: requires a **unique** name and a non-empty drawing. A name
  already used by the registry or by a locally saved icon is **refused** with an
  inline error rather than auto-suffixed — an id is immutable once published,
  so a name the owner did not choose would be permanent. Save then writes an `IconDef` into the set and confirms with a toast.

## 6. Gallery interactions

- **Search**: matches name + tags; category counts reflect the active search.
- **Category filter**: All + fixed categories.
- **Display**:
  - **Color** — a free-text hex field (3 or 6 digits; the swatch beside it
    opens the OS picker) recolors **every** icon in the gallery. Defaults to
    #000000 in light and #ffffff in dark, and follows the theme; ✕ returns to
    that default. Icons are **never** shown multi-color.
  - On narrow screens everything except Search moves into a **bottom sheet**,
    opened from a button inline with the search field.
  - **Size** (16/24/32/40/48) applies to every card; drag the slider or click
    a tick label. Default 24.
  - **Padding** — 0–3 **cells** of empty space around the art, applied to
    every icon. Grows the viewBox rather than scaling the art, so cells stay
    on-grid and crisp at any padding.
  - **Cells** — **Solid** / **Gap** / **Dots**, applied to **every** icon at
    once. Gap insets each cell so the grid shows between neighbours; Dots does
    the same and draws a circle instead of a square. Display only, like Color:
    stored cells stay square, and the mode is never part of an `IconDef`.
  - **Transform** — Flip H / Flip V toggles and Rotate (+90° clockwise per
    press) apply to **every** icon at once. Display only, like Color. Reset
    returns to the unflipped, unrotated view.
  - **No Stroke or Cap/Join controls.** Pixel icons are filled cells with no
    strokes, so those Nucleo-style controls have nothing to act on.
  - **No Bg control.** Backgrounds are **always transparent**, in the preview
    and in both the SVG and PNG exports.
- **Card**: always square, showing the icon alone. The name appears as an
  overlay on hover or keyboard focus; on touch it is reached by tapping through
  to the detail modal. Screen readers get the name from the button's own label
  either way.
- **Filter sheet (mobile)**: edits a **draft**. Changes do not affect the grid
  until **Apply** is pressed, which commits and closes. **Reset** commits the
  defaults and closes. Dismissing (backdrop, ✕, or Escape) **discards**. On `lg` and up the
  same controls sit in the sidebar and apply **live** — only the sheet defers,
  because only the sheet covers the grid it is changing.
- **Nav**: below `lg` the links collapse behind a hamburger, which closes on
  navigation. The theme toggle stays visible in the bar.
- **Theme**: Light/Dark in the top nav, themeing the whole app. No System
  button — system is simply the default until a choice is made.
- **Card click** → a **docked detail panel** at the bottom of the content area
  (copy SVG / download SVG+PNG / copy name). It is **not modal**: nothing dims,
  the grid stays scrollable and clickable, and clicking another icon swaps the
  panel's contents rather than closing it. Escape or ✕ closes; focus returns to
  the card.
- **What you see is what you copy.** Every export is built from the displayed
  cells, so the gallery's color, flip, rotation, padding, and cell style all
  travel with a copied or downloaded icon. Stored `IconDef` data is still never
  modified.
  - A **Gap or Dots export is a picture, not a description.** An inset or a
    circle cannot be read back as cells, so `svgToCells` refuses one outright
    rather than importing something quietly wrong — same principle as any other
    unrecognised SVG (BACKLOG.md §D). **Solid still round-trips**, which is the
    guarantee v1 actually makes.
- The **filter sheet** IS modal (it owns the screen while you edit a draft), so
  it dims, traps Tab, and closes on backdrop click, ✕, or Escape.
- Every overlay animates out before unmounting, on a close clock shorter than
  its open clock. Under `prefers-reduced-motion` the wait is skipped entirely.

## 7. Feedback & states

- **Toasts, in two tones, and they do not share a corner.**
  - A *confirmation* (save / import / copy / export) is ambient: it reports
    something you already know you did, so it sits at the **bottom centre**
    near the controls that caused it, leaves after ~2.2s, and is announced
    politely.
  - A *refusal* is not ambient — the thing you asked for did not happen. It
    takes the **top centre**, clear of the dock it is about (which on a phone is
    under your own thumb), stays ~4.5s, and interrupts (`role="alert"`).
  - An identical repeated message is a NEW toast, not the old one still
    standing: it restarts its clock and re-announces. Saving twice without
    fixing the name otherwise looks like the first refusal never left.
- Disabled states for Undo/Redo when stacks are empty.
- Empty gallery state when a search/filter yields nothing.
- Errors (e.g., unnamed save, a rejected import) are **error-toned toasts**,
  not inline text. Inline, they grew the floating dock upward into the toy at
  the exact moment you were trying to read them.

## 8. Accessibility

- All controls keyboard-reachable with visible focus rings.
- Tool buttons and knobs carry `aria-label`s / tooltips.
- Respect `prefers-reduced-motion` for knob/animation motion.
- The 3D toy (Phase 3) must keep the editing grid operable via DOM/keyboard —
  never trap interaction inside a canvas with no fallback.
