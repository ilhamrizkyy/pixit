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

- **Three knobs on one pad — H, S and L** (2026-09-19). Hue runs the full 360°
  and wraps; saturation and lightness stop at their ends. Knobs physically turn
  on drag and only the dial rotates; ↑/→ step up, ↓/← down, Home/End reach the
  ends. Each ring previews its own axis, built from the current colour, so it
  never shows one you cannot reach.
  - **It was two knobs and a milled saturation groove between them** for one
    day. Three of the same object is the truer reading — H, S and L are three
    axes of one thing — and on a single pad a slider between two dials is the
    one control that did not get to be hardware. @docs/DESIGN.md §6 has the
    full chain.
  - **Saturation's ring is drawn at a fixed 50% lightness**, unlike the other
    two. At the live lightness it would be a black ring on black and a white one
    on white, and the board starts on #000000 — so the knob would ship with a
    dead scale. A ring previews its AXIS.
- **Hex field**: the **segment readout on the pad**, above the knobs, with the
  colour on its own screen beside it. Type any 6-digit hex and the knobs snap to
  the nearest match while the exact hex becomes the paint colour. It was a plain
  text field in the dock until 2026-09-18; the instrument went back on the
  board, so the value went with it.
  - **The swatch reports, it does not open anything.** The gallery's carried a
    hidden `<input type="color">`; on this board that is the same objection the
    category control once answered — an operating-system menu over the toy, on
    a surface where every other control is a moulded part. The difference is
    that the swatch has a better answer available (the knobs beside it already
    set the colour), where category's only alternative was a barrel on a board
    it had no reason to be on.
- **Category is NOT on the board.** It was a thumbwheel mounted through the
  case for one day (2026-09-18 to 2026-09-19) and is a `<select>` in the dock
  again. See §5 for the line that decided it.
- **No preset swatches** (removed 2026-08-18). A row of fixed colours under
  the screen is a second, competing colour control next to three knobs and a
  hex readout — true black and true white are one knob turn away.
- **Rule**: changing the color affects only the **next** cells drawn; existing
  cells keep their color.

## 5. Composer — metadata, import, save (bottom dock)

- **Name and Tags** fields and a live current-color chip. (No pixel/cell
  counter — removed.)
  - **Category left the dock on 2026-09-18 and came back on 2026-09-19.** The
    line the first move drew — *the dock holds what you TYPE, the board holds
    what you TURN* — is **withdrawn**: it sorts controls by their SHAPE, and
    shape should follow the grouping rather than decide it. What replaces it:

    > **The board holds what you touch WHILE DRAWING. The dock holds what you
    > say about the drawing when it is done.**

    Colour is the whole of the first, which is why the hex readout stayed on the
    board with the instrument that produces it — it changes between one stroke
    and the next. Name, category and tags are the second, and they are read
    together, in one place.
- **Below `lg` the dock is one row and a sheet.** The bar keeps the colour
  swatch, Name and Save; a chevron beside them opens a **Details** sheet
  holding Category, Tags, the help toggle, and Import / Export. Nothing appears
  in both places.
  - **The hex is in neither half**, and that is deliberate rather than an
    omission: it is on the board, at the head of the colour pad, so on a phone
    it is on screen the whole time instead of one tap away behind the door.
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

## 5b. The reading pages — Guide, Resources, Contribute

- **Each opens on a masthead (2026-09-18):** a band of the hero's own CRT
  glass carrying the wordmark, the four destinations, the page's name and one
  line saying what it is for. It replaced the nav bar; see @docs/DESIGN.md §1.
  - **It does not boot and it does not flicker.** One thing moves: the block
    cursor after the title. The hero's sequence belongs to the front door.
  - Below it the page is **paper**, which is what `/` already does under its
    own hero.
- **Resources is a directory of rows**, two columns on a wide window. A row
  that goes somewhere prints the set's own `arrow-right` at its far end, or
  `external-link` when it leaves the site, and fills on hover; a row that does
  not is printing, with its status set beside the label rather than in a pill.
  Nothing links to something that does not exist yet.
- **Guide and Contribute read the same way**: the argument on the left, the
  thing itself on the right. The Guide's safe-area rule shows a real icon
  sitting inside the region with its one cell of margin.

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
- **THE PAGE SCROLLS, as a page does** (corrected 2026-09-18; it said the
  opposite from 2026-08-28 to today). The board was sized to the window and the
  icon grid was the only scrolling thing on it. There is no board: `/` is a
  hero, a gallery and a footer stacked down a document.
  - **The controls stay with the icons**, because the bar is **sticky** — which
    is the one thing the old layout genuinely could not do, since a layout
    locked to the viewport has nothing to stick to.
  - The category chips are on their own row **below** the bar, on the icons they
    filter, so at phone width they scroll sideways without taking the controls
    with them.
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

- **The display controls are a row in the sticky bar**: **Shape, Size, Colour**,
  with search between Shape and Size. They change how every icon is DRAWN, which
  is a different question from search and category, which change WHICH icons are
  there. Below `lg` all three move into a **filter sheet** opened from a button
  inline with the search field; search and the chips stay on the page.
  - **Shape** — Square / Inset / Round, as a **dropdown**. It shows all three at
    once and reaches any of them in one press. Each row carries the name and a
    line saying what it does; there is no glyph beside them (@docs/DESIGN.md §6
    has the cost of that). It is a **menu**, so arrows move the focus and
    Enter chooses — the value does not change as you move through it, which is
    what every earlier build got wrong. Escape and an outside press close it.
  - **Size** — a **fourteen-block meter**, 16 to 120 in 8s, default 24, with the
    exact value printed at its head. Drag it, click anywhere on it, or use the
    keyboard: ↑/→ step up, ↓/← down, Home/End to the ends. A block is on or off,
    so nothing animates between two stops.
    - **The grid stops at 48 and the meter keeps going.** The icon seat is a
      fixed 64px, so 48 is the largest art it can draw; every stop above it sets
      the size of the **exported file** instead. The region is announced
      (`aria-valuetext`), never drawn.
  - **Colour** — the **hex readout is the control**: a segment panel printing
    the live value, which opens the picker behind it. Inside are a saturation
    and lightness **field**, a **hue strip**, the hex as an ordinary text field,
    and a swatch that opens the OS picker. It sets the colour **every** icon in
    the gallery renders in, defaults to #000000 in light and #ffffff in dark,
    follows the theme, and ✕ returns to that default. Icons are **never** shown
    multi-color.
    - **It is the only control in the bar that opens**, because a 264px square
      field cannot stand in a 44px row. Size and Shape both fit at full size and
      neither opens. On the phone sheet the instrument is **inline** — a tall
      narrow surface has the room, and that is one fewer layer between a thumb
      and the value.
    - **A typed hex snaps the field and the strip** to the nearest match while
      the exact hex becomes the colour, which is the composer's rule (§4).
    - **The picker keeps hue and saturation through a black or a white.** The
      default is #000000 and every hue of black is the same six characters, so
      turning hue first changes nothing on screen — and then raising lightness
      gives you the hue you set rather than grey. The position is state, not a
      reading of the hex.
    - **The readout prints in capitals** and **refreshes per character**: only
      the digits that actually changed animate, with no stagger, throttled so an
      animation never restarts mid-drag. It carries no unit and no unlit-segment
      ghost; @docs/DESIGN.md §6 has why.
  - **What these replaced, so none of it is rebuilt:** three H/S/L knobs, a
    Shape thumbwheel with the values printed on a barrel, and a vertical Braun
    tuning rail with a magnifier riding on a printed scale. All three were built
    for a 264px moulded body in a chassis, and all three are gone with it. The
    knob component survives and the **composer** still mounts it.
  - **No Padding or Transform.** Both were removed on 2026-08-28. The engine
    keeps both operations and they are written, tested and uncalled; see
    @docs/BACKLOG.md §D.
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
- **Nav**: there is no nav bar, on any route (2026-09-18). Every page says its
  own name and prints every destination in the same place — the hero on `/`,
  the **masthead rail** on Guide, Resources and Contribute — and the footer
  repeats them under every page. The live route is marked in the rail by full
  ink over a two-cell rule, which is the rail's own hover held. There is no
  hamburger: four short words wrap onto one line at 390px.
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
