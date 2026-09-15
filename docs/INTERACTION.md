# INTERACTION.md — Interaction Spec

> How everything behaves. Keep behavior consistent with this while building;
> expect small updates once it's in real code. Visuals live in @docs/DESIGN.md.

---

## 0. Access & routing (critical)

- **Public** can use: Gallery, the mini screen (copy/download), Guide,
  Resources. Read-only.
- Both boards draw on the **same segment panel** — the gallery's mini screen and
  the composer's screen are one part in two places, so a drawing looks the same
  on the board you made it on and the screen it lands in.
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

- **The homepage boots (2026-09-15).** On every load of `/`, the hero comes up
  like an arcade screen before it settles: a blinking cursor, the grid powering
  on, the sprites rastering in row by row, PIXIT typing out, and the rest of the
  hero wiping in under it. A little over two seconds, then it simply is the
  hero.
  - **Any key or press skips it** to the finished hero at once.
  - **Every load, including a refresh.** `?intro` forces it in an automated
    browser, which otherwise skips it.
  - **Reduced motion never boots.**
- **Hover a hero sprite to x-ray it.** Its neon drawing goes out and the 11 by
  11 lattice it is drawn on comes up, with a tag naming the icon. Desktop only,
  like the art itself; the cursor is a cell.
- **The detail shelf floats at the foot of the screen (2026-09-15).** Choosing
  an icon opens it pinned to the bottom of the viewport while you scroll the
  icons, and it settles below the grid at the end of the page, so the last row
  is never trapped under it. It is capped at about half the screen and scrolls
  inside itself past that.
- **Explore icons scrolls** to the gallery on an eased flight (about 700ms for
  one screen, longer for more), and moves keyboard focus to the icon panel when
  it lands. Any wheel, touch or key during the flight hands the scroll back.
  Under reduced motion it jumps.
- **The page does not scroll.** The board is sized to the window, so the whole
  device is visible at once and the **icon grid is the only scrolling thing on
  the page** — the picture moves inside the glass rather than the device sliding
  up the page. The screen's header (search, chips) stays put while it does.
- **Search**: matches name + tags, and says so in its own placeholder rather
  than only in its accessible name. **No counts, anywhere.** This entry read
  "category counts reflect the active search" until 2026-09-04 and no count of
  any kind existed, with a test pinning their absence. A combined readout was
  built in the field's empty right end and removed the same day by request: it
  reads as a status line on a surface whose whole job is to be quiet.
- **Category chips**: All + the six fixed categories, as **flat tinted chips on
  the screen**, the header's second line under Search. Both lines answer one
  question — what is on the screen right now.
  - **Each chip keeps its own tint in both states.** Selection is carried by
    MASS: unselected is an outline in the tint, selected is filled with it. The
    colour identifies the category and never means "this one".
  - **The fill TRAVELS.** It is one capsule behind the row that slides to
    whichever chip is live, wearing that category's tint. It moves on
    `transform`, so holding an arrow key produces one continuous slide rather
    than restarting, which matters because focusing a chip selects it.
  - **The labels are printed**: uppercase and tracked, the way the Shape drum's
    faces are, rather than set like nav links. The live one is marked by the
    set's own **play** icon in its category's colour, which points at the label
    the way a right-facing triangle beside a word always has; the mark's space
    is reserved on every chip so the row never reflows as selection moves. There
    are no outlines: seven outlined
    capsules read as seven buttons on the display, and with them gone the
    travelling fill is the only enclosed thing in the row.
  - On a phone the row fades at its right edge to say it continues, and the
    chips take a 44px minimum.
  - **A real tablist.** One Tab stop for the whole row, then ←/→ between
    categories (wrapping at both ends) and **Home/End** for the ends. ↑/↓ are
    left to the page, so a keyboard user is never stranded on the row. The row
    is horizontal at every width, so there is no axis to switch.
  - **Activation is automatic** — focusing a chip selects it. The APG only asks
    for manual activation when revealing a panel is expensive, and this one
    filters an array already in memory.
  - **Switching categories brings the icons in as a wave** — each rises and
    scales over 760ms, offset 28ms from the one before, on a curve chosen to
    spend that time rather than front-load it. Typing in Search does not re-run
    it, and holding an arrow key does not either: the filter is instant and only
    the animation waits for the category to settle.
  - **They were the key rack until 2026-08-28.** Filtering changes *which*
    icons are on the screen, so it belongs on the screen; how a cell is drawn
    belongs on the body. (The rack that took the caps over went too — Shape is
    three tactile caps in the Display pad now.)

- **Shape**: Square / Inset / Round, as a **thumbwheel switch mounted through
  the case**, under the Colour pad and spanning the column's full width. A
  barrel with the three values printed on it: you read the live one through a
  window at one end and turn it by the knurled grip at the other. Shape belongs
  on the body because it is the same kind of control as Colour: it changes how
  icons are DRAWN, not which ones are shown. It is in **no pad of its own** — a
  pad says *these belong together*, and one control has nothing to be grouped
  with.
  - **Square is printed in the middle** — Inset, Square, Round down the barrel —
    so the wheel can be turned either way from rest and both neighbours are half
    in the window before you touch it. That is the drum's order, not the
    engine's; the arrows follow it, so ArrowDown reaches the value printed below
    the live one.
  - **The barrel is the case's own plastic**, so it turns charcoal with the
    board in dark mode and the printing on it turns light.
  - **Selection is what the window is showing**, and nothing else says it. The
    live value is the one turned to the FRONT: square on, centred across the
    opening, with its neighbours clipped and curving out of it either side.
    There is no index mark — it was on the paper, then on the case, then gone,
    because a mark beside the value is a second thing saying the first thing.
  - **The paper is sunk in the case, under glass.** Each opening is a real cut
    with walls, and the cover's reflection has a hard edge — which is the only
    thing that says there is glass over it rather than a wash on it.
  - **Drag up to go forward.** The values are on the surface, so pushing it up
    brings the one below into the window. The value steps in three detents and
    the barrel follows your finger while you drag, settling onto the detent when
    you let go. It does not wrap: a drum with three detents has two ends and you
    can feel them.
  - **Only what the window is showing can be clicked** — the rest are round the
    back of the drum. You reach a far value by turning to it, or with the
    keyboard.
  - **A drag on the printed word turns the drum and drags nothing.** This is
    the one drag surface on the board with text under the pointer, so the
    gesture is claimed outright: nothing selects, the browser cannot pan on it
    or carry it away, and the click that arrives at the end of a drag does not
    re-choose whatever face the finger came to rest on.
  - **A radiogroup, not a tablist.** These reveal no panel; they redraw the one
    the chips already govern. One Tab stop for the group, then **all four
    arrows** move within it as the APG asks of radios, **wrapping** at both ends
    — which the drag does not — with Home/End for the ends.
  - **It replaced three transport keys** on 2026-08-30, by way of a mode list
    beside a separate wheel. The keys carried a glyph rather than a word and
    latched by resting in the shallow click a press makes, which is a fine
    object and a mute one: a row of caps says nothing about which is on until
    you have compared the depth of their faces.
  - Below `lg` it is in the **filter sheet** with Colour and Size, and the
    sheet button's dot reports it.

- **Display**:
  - **Color** — **three knobs**, H / S / L, the same control the composer
    turns, with a free-text hex field (3 or 6 digits; the swatch beside it
    opens the OS picker) under them. Either sets the colour **every** icon in
    the gallery renders in. Defaults to #000000 in light and #ffffff in dark,
    and follows the theme; ✕ returns to that default. Icons are **never** shown
    multi-color. It lives **on the body**, with Size: it changes how every icon
    is drawn, which is the body's job. Search stays on the screen because it
    changes which icons are there.
    - Each knob turns **relatively** — grabbing it anywhere and turning moves
      the value by how far you turned — and a full turn covers the whole range.
      Arrows step by 1, Shift+arrows by 10, Home/End go to the ends. Only the
      dial turns; the ring is a scale it turns against.
    - The hex sits on a **segment panel above the knobs**, and is still an
      ordinary text field: click anywhere on it and type. It **prints in
      capitals** — the value keeps whatever was typed, and the readout
      uppercases it. (It carried a faint `888888` ghost behind the value for
      one pass, the way a real LCD shows its unlit segments; on a full-glyph
      face that draws two letterforms on top of each other and reads as flicker
      rather than depth.)
    - **A typed hex snaps the knobs** to the nearest match while the exact hex
      becomes the colour, which is the composer's rule (§4).
    - **The knobs keep hue and saturation through a black or a white.** The
      default is #000000 and every hue of black is the same hex, so turning Hue
      first changes nothing on screen — and then raising Lightness gives you the
      hue you set, rather than grey. The position is state, not a reading of
      the hex.
  - On narrow screens the body's controls — Colour, Size and Shape — move into a
    **bottom sheet**, opened from a button inline with the search field. Search,
    and the category chips stay on the page. The button's dot
    reports whether anything the sheet itself holds is off its default —
    Colour, Size and Shape — but never the category, which is on screen at all
    times.
  - **Size** is a **vertical tuning rail** standing in the chassis on the
    board's **right edge**, past the screen, running its full height. It is one
    wide channel with the **whole scale printed on its floor** — the numbers and
    the graduations both — and the marker riding in it, against the screen, so
    everything about the control is in one place beside the icons it governs.
    **16–120 in 8s**, default 24; drag the marker along the groove, click
    anywhere on it to jump, or use the keyboard — ↑/→ step up, ↓/← down,
    Home/End to the ends, and the top of the rail is the maximum.
    - **While you drag it, the marker is under your finger.** The value still
      steps in 8s — the detents are the point — but the pointer itself is not
      animated toward them; it goes where you go, and drops into the nearest
      detent when you let go. Moves it makes on its own — a key, a click —
      travel on a clock that scales with the distance. Under
      `prefers-reduced-motion` it simply arrives.
    - **Grabbing it deepens its seating; it does not grow.** Same rule as the
      knobs.
    - **The marker is a MAGNIFIER lying on the scale**, and nothing else — one
      part, no pointer arm. Its lens is an empty window: the groove's floor and
      the number printed on it show through, and the number under the glass is
      enlarged. Nothing is drawn twice — mid-travel between two stops the window
      shows the bare floor that is actually there. So the printed numbers are
      all alike, no colour and no weight: the glass is the emphasis.
    - **The graduations FLANK the numbers**, one mark in from each wall of the
      channel with the number in the break between them. A major pair at every
      stop, a shorter minor pair at each halfway point. The minors are printed
      subdivisions, not reachable values — the control steps in 8s.
    - **The grid stops at 48 and the rail keeps going.** The icon seat is a
      fixed 64px, so 48 is the largest art it can draw; every stop above it sets
      the size of the **exported file** instead — a 120 gives you a 120px SVG
      and a 120px PNG. The region is announced rather than drawn: 48 carried a
      full-width graduation for one pass, and one mark unlike all the others
      reads as damage before it reads as information.
    - **The numbers are printing, not buttons.** They were click targets while
      there were five of them; fourteen would put fourteen redundant tab stops
      on the public route in front of a slider that already reaches every one of
      their values. Clicking still jumps — the input covers the whole rail, so
      the numbers are click targets without being controls.
    - Below `lg` the same control lies down in the filter sheet, printing every
      other number — fourteen collide on a 390px bar — with the exact value read
      out beside the section's label. **The phone keeps the numbers under the
      groove and a slim pointer in it**: a magnifier has to fit between the two
      numbers either side of the one it reads, and on a 390px bar they are
      closer together than the glass is wide.
  - **Shape** — **Square** / **Inset** / **Round**, applied to **every** icon at
    once. Inset insets each cell so the grid shows between
    neighbours; Round does the same and draws a circle instead of a square.
    Display only, like Color: stored cells stay square, and the mode is never
    part of an `IconDef`. The engine keeps calling these `solid` / `gap` /
    `dots`; the caps are what a person reads.
  - **No Padding or Transform.** Both were removed on 2026-08-28 with the board
    rebuild — neither had a surface whose job it shared. The engine keeps both
    operations and the composer still uses them; see @docs/BACKLOG.md §D.
  - **No Stroke or Cap/Join controls.** Pixel icons are filled cells with no
    strokes, so those Nucleo-style controls have nothing to act on.
  - **No Bg control.** Backgrounds are **always transparent**, in the preview
    and in both the SVG and PNG exports.
- **Card**: always square, showing the icon alone. The name appears as an
  overlay on hover or keyboard focus, sized to the **name** rather than to the
  card, so a long id is shown whole instead of being clipped to a 64px seat; on
  touch it is reached from the detail bar, which carries the name; there is no
  mini screen below `lg`. Screen readers get the name from the button's own label
  either way.
- **Filter sheet (mobile)**: edits a **draft**. Changes do not affect the grid
  until **Apply** is pressed, which commits and closes. **Reset** commits the
  defaults and closes. Dismissing (backdrop, ✕, or Escape) **discards**. On `lg` and up the
  same controls sit in the sidebar and apply **live** — only the sheet defers,
  because only the sheet covers the grid it is changing.
- **Nav**: plain shell — it is not part of the device. Below `lg` the links
  collapse behind a hamburger, which closes on navigation. The theme toggle
  stays visible in the bar.
- **Theme**: Light/Dark in the top nav, themeing the whole app. No System
  button — system is simply the default until a choice is made.
- **The mini screen MATERIALISES the icon (2026-08-30).** Choosing one does not
  show it, it assembles it: the panel carries a faint unlit cell everywhere, and
  the icon's cells light one at a time on scattered delays, with transient
  static crackling inside the icon's own bounds and dying off as it finishes.
  About half a second.
  - **Deselecting runs the same thing in reverse**, on a shorter clock. The
    cells go out scattered, the way they came in, rather than the finished
    picture fading as a block.
  - **Selection is the only trigger.** Not hover, not page load. Recolouring or
    resizing what is already on screen redraws it without replaying anything.
  - The scatter is fixed per icon, so an icon always assembles the same way.
  - Under `prefers-reduced-motion` the whole icon simply arrives, with no
    stagger and no static.

- **Card click** → the icon loads into the **mini screen**, and the **detail
  shelf** appears along the bottom of the icon screen — inside the glass, not on
  the chassis — in **two columns**: the **identity** on the left (name, tags,
  category, and the **Copy** split button, in that reading order) and the
  **source** on the right (the format tabs with the ✕ at their far end, and the
  code block under them).
  - **Copy is one press, and the chevron holds the rest.** The split button's
    main half copies the live format and says which one it is; the menu behind
    the chevron carries every format plus Download SVG and Download PNG.
  - **The format tabs choose what the block shows and what Copy copies** —
    SVG / React / HTML / CSS / Data URI. ←/→ move between them, and the rule
    under the live one slides rather than jumping.
  - **The source block hugs its content**: no cap and no inner scrollbar, so the
    shelf is as tall as the format needs and the icon grid above gives up the
    height. Below `lg` it is capped, since a data URI on a 390px bar is nearer
    thirty lines than twelve.
  - **Copy appears twice on purpose**: the filled primary at the foot of the
    identity column, and the same control in its outlined weight in the code
    block's corner, within reach of the markup. Same shape and type, different
    fill, different accessible names.
  - **The ✕ is glyph-only and a rounded rectangle**, which is what marks it out
    among the capsules: it is the one control that is not an action on the icon.
    It sits a whole column from the chevron, so *open more options* and *throw
    all of this away* are not a trackpad slip apart.
  - **Neither is a dialog and neither is modal.** The screen is a permanent part
    of the board, showing the bare lattice until something is chosen; the shelf
    is printed on the glass. Nothing dims, and the export menu is the one thing
    on this board that opens. Clicking another icon swaps both rather than
    closing and reopening anything.
  - **Escape is read at the document**, from the bar — nothing here ever takes
    focus, so after clicking a card the focus is still on the card and a handler
    on the bar would never see the key. It steps aside for anything inside a
    real dialog, so the filter sheet still owns its own Escape.
  - The state is announced **politely, from the screen** — it has to cover
    clearing as well as loading, and the bar does not exist to announce its own
    removal.
  - Below `lg` the two columns simply **stack** — the same content in the same
    order, not a second layout, since a 390px bar cannot show a name and a code
    block side by side.
  - **There is no SVG-markup disclosure.** Download SVG needs no clipboard API,
    so it is the fallback now, and a failed copy says so.
- **What you see is what you copy.** Every export is built from the displayed
  cells, so the gallery's colour and cell shape travel with a copied or
  downloaded icon. Stored `IconDef` data is still never
  modified.
  - **SIZE TRAVELS TOO (2026-08-29), and it is the one display setting that
    keeps going after the picture stops.** The rail's value becomes the SVG's
    `width`/`height` and the PNG's pixel dimensions — so past the grid's 48px
    cap, the scale is setting the size of the file rather than the size of the
    tile. The `viewBox` never moves: it is the canvas (CLAUDE.md rule 4), and
    only the rendered dimensions follow the scale.
  - **The PNG snaps its cell edges to whole pixels.** 11 divides almost none of
    the scale, so a 24px export puts every boundary on a fraction — and a
    fractional `fillRect` is anti-aliased, which softens the exact edges this
    format exists to keep. Rounding each boundary makes some cells 2px and some
    3px with no blur anywhere: nearest-neighbour, which is what a pixel scaler
    does.
  - An **Inset or Round export is a picture, not a description.** An inset or a
    circle cannot be read back as cells, so `svgToCells` refuses one outright
    rather than importing something quietly wrong — same principle as any other
    unrecognised SVG (BACKLOG.md §D). **Square still round-trips**, which is
    the guarantee v1 actually makes.
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
