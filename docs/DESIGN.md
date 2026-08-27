# DESIGN.md — Visual Style Guide

> Source of truth for look-and-feel. Every color, type, and spacing value comes
> from the tokens here. The product shell stays calm and minimal (Lucide-like);
> the personality lives in the icons and the Etch A Sketch composer.

Reflects the v9 prototype (blue toy, silver screen, multi-color). Items marked
**[FIX]** are known issues to correct while building (see @docs/BACKLOG.md).

---

## 1. Design thesis

Two registers, kept separate:
- **Shell** (nav, gallery, Guide, Resources): white, monochrome type, one blue
  accent, generous space. The icons are the stars.
- **Composer**: a skeuomorphic **blue** Etch A Sketch — the one place we go
  bold and tactile.

Signature motif: the pixel grid — as icon cells, as the composer board, and in
empty/loading states.

## 2. Color tokens (CSS variables at :root)

Neutrals / shell
    --bg:#FFFFFF  --surface:#F4F4F5  --surface-2:#FAFAFA  --border:#E4E4E7
    --text:#111111  --text-muted:#6A6A74  --text-faint:#A1A1AA

**Two text greys, not three — settled 2026-08-20 by an axe pass.** `--text-faint`
is **not for text**. Three greys that all clear 4.5:1 on a light-grey surface
have almost no room between them, so the bottom step of the ramp stopped
carrying readable text: everything it used to label now uses `--text-muted`,
and what is left for it is decoration (a scrollbar thumb, a leader line).
`--text-muted` itself was darkened from `#71717A`, which cleared AA on white at
4.83:1 but not on `--surface` at 4.40:1 — and cards, chips and panels all sit on
the surface tone, so the passing number was the one that almost never applied.

Accent — Arcade Blue (the one shell accent)
    --accent:#2B5BFF  --accent-hover:#1E42D6  --accent-subtle:#E8EDFF
    --accent-ink:#1E42D6   (dark: #6B8CFF)

`--accent-ink` is the accent as **text on `--accent-subtle`**. The base accent
on its own tint is 4.44:1, a hair under AA, so the pairing takes the darker
step. It is a token rather than eight per-component overrides because the rule
holds wherever the pair appears — and the one place it was applied by hand, the
category button's label passed while the count beside it still failed.

Semantic
    --danger:#DC2626   (errors stay red so they read against the blue toy)
    --danger-surface:#FEE2E2  --danger-ink:#B91C1C   (dark: #450A0A / #FCA5A5)

The three danger tokens are a SET, for tinted panels: a soft ground, the
full-strength red as its border, and a darker red as its ink. A saturated block
of red is the shape of a system failure, and most refusals are not one. Ink is a
step darker than the border because the border red on its own tint is 4.0:1 —
fine for a rule, short of AA for body text.
    --success:#16A34A  --warning:#D97706

Composer toy (blue Etch A Sketch — scoped to the composer only)
    --frame:#2E46C8      toy body (top of gradient)
    --frame-2:#20328A    toy body (bottom of gradient)
    --frame-3:#182662    bottom lip / deep shadow
    --bezel:#1A2A70      dark rim around the screen (must read RECESSED)
    --well:#20337F  --well-2:#182660   recessed button wells
    --screen: near-white gradient (#e5e7de -> #f6f7f2), a trace of green so it
             still reads as a physical surface rather than a blank page
    --toy-grain: tileable fractal-noise data URI; moulded-plastic texture

Rule: `--frame*/--bezel/--well/--screen` are **composer-only**. Never use them
in the shell.

## 3. Color inside icons (single-color)

**Icons render in exactly one color.** A hex field in the gallery sets it for
**every filled cell of every icon**, matching Lucide's customizer. It defaults
to **#000000 in light and #ffffff in dark**, follows the theme, and clearing it
returns to that default. There is no state in which the gallery shows
multi-color art — the point is that the set reads as one coherent family rather
than each icon carrying its own palette.

**Authoring rule — one color, drawn as outlines.** Every icon is authored in a
single color, and must be legible as a **silhouette**: draw outlines, not
filled masses whose meaning depends on internal contrast. A filled envelope
with a lighter interior collapses into a plain rectangle; an outlined envelope
survives. This is enforced by test — a seed icon using more than one color
fails the suite.

**What the data model still allows.** `cells` holds a hex per cell, so the
format *can* carry multi-color, and the composer's HSL picker (see
@docs/INTERACTION.md) still paints real colors — that is what makes the icon's own
color the one baked into an export. The gallery simply never renders more than
one. Keeping the capability costs nothing and is what a future **duotone** mode
would build on, deriving roles from an icon's distinct colors (parked; see
@docs/BACKLOG.md).

True black (#000) and true white (#fff) are reachable.

## 4. Typography

| Role    | Face           | Use |
|---------|----------------|-----|
| Pixel   | Press Start 2P | Wordmark, h1, h2 |
| Display | JetBrains Mono | Nav, h3, labels, buttons, UI |
| Body    | Inter          | Long-form prose in Guide / Resources |
| Data    | JetBrains Mono | Counts, hex, sizes, code |

**Pixel face = Press Start 2P**, scoped to the **wordmark, h1, h2, and the
gallery's section eyebrows** (Search / Display / Categories). It has very wide
advance widths, so it does not run to prose h3 and below, where the horizontal
cost stops paying for itself — the eyebrows are the exception because they are
six-to-ten-character chrome labels, not running text.

Two rules travel with it, both consequences of it being a pixel face:

- **Never bold it.** It ships a single weight, so `font-bold` synthesises one
  and smears the very edges the face exists for. Emphasis comes from case,
  color, or size instead.
- **It is crispest at multiples of 8px**, its design grid. The wordmark sits at
  16px for that reason. The eyebrows sit at 12px anyway, trading a little
  softness to stay smaller than the 14px controls they head — in a control
  panel, a label that outranks its own content is the worse defect.

**Display/Data = JetBrains Mono — locked 2026-08-18.** Departure Mono was the
original pick and was considered, then rejected: with a genuinely pixel
wordmark and pixel headings already in place, a *second* retro-pixel face for
the UI makes the shell compete with the icons instead of framing them (§1).
JetBrains Mono reads as "developer tool", which is the register Lucide and
Phosphor use for their chrome, and it is on Google Fonts so there are no files
to source. It sits behind `--font-display`, so reversing this is a one-line
change in `globals.css`.

Scale (px): 12 caption · 14 UI · 16 body · 20 h3 · 24 h2 · 32 h1.
Line-height: 1.5 body, 1.2 headings/labels.

## 5. Spacing, radius, layout

- Base unit **8px** (matches the icon 8-multiple sizing). Scale: 4 8 12 16 24 32 48 64.
- Radius: `--radius-sm 4` (inputs) · `--radius-md 8` (cards/panels) ·
  `--radius-lg 16` (modals) · `--radius-toy 32` (toy frame). **Stored icon cells
  are always square and always 0 radius** — that is the data model, and the
  composer draws nothing else.
  - **Amended 2026-08-21 — the GALLERY may draw them otherwise.** The Cells
    control offers Solid, Gap and Dots, and Dots renders each cell as a circle.
    This is a display setting in the same family as colour, flip, rotation and
    padding: `cells` are untouched, every icon in the gallery changes together,
    and the mode is never a property of an `IconDef`. The old flat rule is kept
    above because it still governs authoring — what changed is that rendering
    and storage are now allowed to disagree, which is CLAUDE.md rule 3 working
    as intended rather than an exception to it.
- Sidebar 264px fixed. Icon grid: auto-fill ~92px cards, 14px gap. Icon centered.
- Quality floor: visible focus rings (accent), respects `prefers-reduced-motion`,
  works down to mobile.

## 5b. Motion

One shared scale in `:root`, referenced by every component. Tailwind's
`--default-transition-*` point at it too, so a stray `transition-colors`
inherits the house curve rather than the framework's.

    --duration-quick 150ms   close, hover-in, text swap
    --duration-fast  250ms   modal open, card hover-in, toast open
    --duration-medium 350ms  hover-out settle
    --duration-slow  400ms   sheet open (full-screen travel)

**Padding** reads out the resulting canvas (11×11 → 13×13 → 15×15 → 17×17),
not the step number. The art is unchanged at every step; only the viewBox grows
around it, which is what keeps cells on-grid. It is unrelated to the safe area:
the safe area is where art is *drawn* and is already baked into every icon.

    --ease-smooth-out cubic-bezier(0.22, 1, 0.36, 1)   the house curve
    --ease-bounce     cubic-bezier(0.34, 1.36, 0.64, 1) entrances only

**The rules that make motion read as authored, not merely present:**

- **Closes are faster than opens.** A modal opens in 250ms and closes in
  150ms; the sheet opens in 400ms and closes in 350ms. Never bounce a close.
  Overlays defer their unmount for exactly the close duration so the exit has
  something to play on, and skip the wait entirely under reduced motion.
- **Duration follows distance, not category.** The sheet travels the full
  screen height, so it opens on the 400ms clock; the modal scales in place on
  250ms.
- **Hover-in is quick and direct; hover-out may settle.** Cards enter at 250ms
  and return at 350ms, so they land rather than snap.
- **Trim duration before adding delay**, and never delay a close.
- Overlay entrances reach past transform and opacity — a 2px cross-blur reads
  as depth of field rather than a slide. **The toast is the exception**: it is
  the one overlay that appears while you are doing something else, and `filter`
  is the only property here that cannot run on the compositor — it rasterises
  the element every frame. On a route already holding two WebGL canvases that
  cost reads as lag rather than as softness. Toasts animate on transform and
  opacity alone.
- The toast opens on 250ms and closes on 150ms, and its **exit travels half as
  far as its entrance**. It previously opened on 350ms with no exit at all — a
  confirmation that took a beat to decide to appear and then simply vanished.

Every animation sits behind the global `prefers-reduced-motion` rule.

## 5c. Depth

    --shadow-raised   cards on hover
    --shadow-overlay  modal, sheet, toast

Shadows carry **both an offset and a soft blur**; a zero-offset halo is
decoration, not depth. Dark mode raises the opacity, since a light shadow does
not register on a dark ground.

**Elevation is declared once per element** — a border *or* a shadow, never a
1px border under a wide soft blur. The icon card keeps a transparent border to
reserve the space its selected state fills, and lifts with shadow alone.

## 5d. Browser surfaces

Text selection, the caret, and scrollbars are themed from the palette rather
than left at browser defaults, and data (counts, hex, sizes) uses
`tabular-nums` so figures do not reflow as digits change. Prose is capped at a
68ch measure.

## 6. Component specs

**Top nav** — logo left; Icons / Guide / Resources / Contribute; then the
owner-only actions. Active nav item in `--accent`. Below `lg` the links
collapse behind a **hamburger**; the theme toggle stays in the bar, since
burying a one-tap control behind two taps costs more than the space it saves.

**Gallery sidebar** — Search (+reset); Display (**Color** free-text hex field
with a swatch that opens the OS picker, defaulting to the theme's black/white;
**Size** slider on the 16–48 8-step scale, default **24**, with clickable tick
labels that double as the readout; **Padding** 0–3 cells; **Cells** = Solid /
Gap / Dots; **Transform** = Flip H / Flip V / Rotate, applied gallery-wide);
Categories (All + per-category counts that follow the active search).

**Cells** sets how each filled cell is drawn, for every icon at once.

- **Solid** (default) fills the cell edge to edge, and horizontal runs merge
  into one rect — which is what removes the hairline seam anti-aliasing leaves
  between abutting rects.
- **Gap** insets each cell by 0.5 units on every side, so a node is 3 units
  across and two neighbours sit a full unit apart. The lattice stroke is 0.25,
  so the gap is four times the grid line: the grid reads as the space between
  nodes rather than as a line hiding inside them.
- **Dots** keeps that inset and makes the node a circle of the same 3-unit
  diameter. Same size as Gap deliberately — a node that changed size when it
  changed shape would make the two modes read as two zoom levels of the icon
  instead of two treatments of one drawing.

Gap and Dots **never merge runs**; merging is what would weld neighbours back
together and erase the gap being asked for.

Below `lg` every control except Search moves into a **bottom sheet**, opened by
a square icon button sitting **inline with the search field**. The button
carries an accent dot while a category filter is active. The sheet has a
**Reset** and an **Apply** in a footer below its scroll area, so the actions
stay reachable however long the controls get. Both commit and close.

Reference point for the gallery's control surface is **Nucleo's icon panel**,
but applied to the whole gallery rather than one icon at a time. Stroke and
Cap/Join are deliberately excluded — pixel cells have no strokes — and there is
no Bg control: icon backgrounds are **always transparent**.

**Icon card** — `--surface` fill, `--radius-md`, hover lift + border. Selected
→ `--accent` ring. **Always square**, on every device, so the grid reads as an
even lattice. The name is therefore always an **overlay** revealed on hover or
keyboard focus — a name sitting in flow is what stretches a card into a
rectangle. On touch the name is reached by tapping through to the detail modal,
as Lucide's mobile grid does.

Grid density follows the same reference: `minmax(70px)` below `lg` (4 columns
at 375px) and `minmax(92px)` above.

**Theme** — **Light / Dark**, two buttons in the top nav. There is no System
button, but system is the default: until a choice is made no `data-theme` is
set and the media query decides, so a first visit already matches the OS. The
buttons highlight the *resolved* theme. Dark mode is a redefinition of the
shell tokens, not a parallel stylesheet. (Superseded the earlier gallery-only
Light/Dark preview toggle.)

**Icon detail** — a **docked bottom panel**, not a modal (the Lucide pattern).
It spans the content width along the bottom edge, clearing the sidebar at `lg`,
and **dims nothing**: the grid above stays visible and clickable, so choosing
another icon swaps the panel's contents instead of forcing a dismiss-then-open
cycle. Comparing icons is the common task, and a modal fights it.

Being non-modal is honoured properly — no backdrop, no scroll lock, no focus
trap, no `aria-modal`. Escape and ✕ close it; focus returns to the card. The
grid gains bottom padding while it is open so the last row can still scroll
clear.

Contents: the icon **on** a faint cell lattice — for a pixel set the grid *is*
the art, so each filled cell occupies exactly one box. Art and lattice are
drawn in a **single SVG** sharing one viewBox; layering two makes alignment
depend on two sizes agreeing, which is how they drift. The lattice spans the
padded canvas, so padding reads as extra boxes around the art (11×11 → 13×13
→ …) rather than as the art shrinking. Then the name in the data face since it is a code identifier, tags as a
`·`-separated line, a category chip, the four actions, and the SVG markup
behind a disclosure. No color control — the gallery owns it. **What you see is
what you copy:** every export carries the gallery's color, flip, rotation, and
padding.

**Composer — toy anatomy**
- *Frame*: blue gradient body, `--radius-toy`, top highlight + bottom lip.
- *Screen*: near-white, and **recessed as real geometry**. Four sloped walls
  around a floor, rendered in R3F under the grid: the top wall falls to ~166 and
  the bottom clips to white, not because either was authored that way but
  because that is what those surfaces do under a light from above. This is what
  finally settled the snub-in (BACKLOG.md §A2) — hand-tuned inset shadows were
  always going to read slightly wrong, since four edges of one hole do not have
  four independent gradients.

  **The 3D is decoration and the grid is not.** The canvas renders the recess
  and nothing else; the drawing grid stays DOM/SVG on top of it, owning every
  pointer event, every key and the whole accessibility tree (CLAUDE.md §5). Lose
  WebGL and CSS inset shadows approximate the walls — you lose their shading and
  nothing you can do. The grid is inset by exactly the wall width either way, so
  there is only ever one layout to keep in step.

  The camera is **orthographic**. The floor has to line up with a DOM element
  over it, and under perspective that alignment depends on a camera distance
  agreeing with a CSS percentage — two numbers that will drift. Straight on, the
  mapping is the identity.

  A soft diagonal wash sits **behind** the art as the glass, with a much fainter
  one over it. The over-layer is deliberately weak: this is a screen, and one
  you cannot read through is a worse screen however convincing its glass.
- *Bezel*: dark rim (`--bezel`), even on the sides and bottom, with a deeper
  **brow above the screen** as the real toy has. (The old [FIX] was a fat chin,
  which is a different thing from a header.) Shaded as a **wall standing proud
  of the frame** — lit along its top face, dark at its foot — so the screen's
  own shadow has something to fall against.
- *Frame*: four background layers, not one ramp. A single top-to-bottom
  gradient is the giveaway of a rectangle with a gradient on it; real plastic
  gathers light along its crown and turns away at the sides, so the sides
  darken independently of the top-to-bottom fall. Over all of it sits a
  **moulded grain** — a tiled fractal-noise texture. Surface is the thing no
  amount of shadow work substitutes for: without it the shell reads as drawn,
  with it as injection-moulded. It lives in the BACKGROUND stack, never as a
  blend-mode overlay, since an overlay over a demand-rendered WebGL canvas is
  how the knobs vanished once already.
- *Legend*: the product name moulded into the bezel's brow, where the toy this
  is modelled on carries its own — embossed (dark line below, light above),
  never printed. It costs no layout: the brow is padding the bezel already
  reserves. Decorative and `aria-hidden`; the page's real wordmark is in the
  nav.
- *Tool pads*: each column of four sits on a raised boss. Hardware does not drop
  buttons into a flat shell, and here the pad does the grouping work — it says
  these four are one set, which is what the four-a-side symmetry is for.
- *Buttons*: 8 total, 4 flanking each side — Game Boy A/B style (soft light
  domed cap seated in a recessed well). Left: Mirror, Grid, Eyedropper, Undo.
  Right: Flip-H, Flip-V, Rotate, Redo. Press sinks ~1px only.
- *Knobs*: two knobs at the ends of the colour lane. **Smooth moulded control
  knobs**, not the Etch A Sketch's ridged dials — a wide rounded shoulder
  falling to the rim with a shallow dished face recessed inside it, and a small
  dark chip in the lip for the pointer. The milled flutes were dropped on
  2026-08-19 against a supplied reference.

  The form carries itself: the shoulder catches a bright crescent while the
  dish, being concave, gathers its highlight on the LOWER interior wall. Those
  two opposed gradients are what read as "raised rim, sunken face", and getting
  the dish's gradient the way round of a dome is what makes a recess look like a
  button.

  **A smooth white knob has no detail to hide behind**, so depth and lighting
  are load-bearing rather than taste. A dish 0.075 deep tilts its normal by only
  11°, which renders as a featureless disc; the dish had to get about three
  times deeper before the surface described itself at all. The key sits
  **overhead rather than head-on**, because a head-on key lights every normal on
  a shallow surface almost identically.

  Level and modelling are then set separately. The knob must read **white, not
  grey**, so ambient carries the level — it lifts every normal equally, raising
  the floor without touching the spread — and the key is left free to model
  rather than illuminate. The range is 184 to 253: white, with 68 levels left
  for the form. Ambient one notch higher whitens the floor to 197 but spends the
  modelling down to 55, and the knob flattens back toward the disc it began as.

  **Two things sit between an intensity and a pixel, and both are worth knowing
  before touching these numbers.** `meshStandardMaterial` is physically based,
  so `BRDF_Lambert` divides by π — for the ambient term as much as the direct
  ones — which means an intensity of 0.5 arrives on screen at about 0.16. And
  React Three Fiber defaults the renderer to **ACESFilmicToneMapping**, built to
  roll off the highlights of an HDR photographic scene: it caps white near
  205/255 and mutes everything under it. Neither belongs on a flat-shaded UI
  object, so the canvas passes `flat` and the intensities carry the π.

  This is not theory. Tuned against a model missing both, the knob measured
  184–253 in preview and rendered **81–130** in the browser — a dead mid grey
  that no material colour could have fixed, because it was already `#ffffff`.

  The dial is seated in a **dark socket**. The gap between ring and dial was
  transparent at first, and on a blue toy transparent means BLUE — the knob wore
  a bright blue outline that read as a stray border rather than as air. A recess
  is what is actually there: the dial is mounted through the panel, so the gap
  is the hole it turns in.

  Only the dial turns; the shadow and ring stay still. Left knob wears a rainbow
  (hue) ring, right knob a black→color→white (lightness) ring. Each ring is a
  true **annulus with air between it and the dial**, so it reads as a scale the
  knob turns against rather than a painted edge of the knob.

  There are two builds — WebGL and CSS — and they must describe ONE object.
  They have drifted before (the CSS knob was a raised cap for several passes
  while the mesh was a dish), so proportions are shared by name: the CSS dish
  is 76% of the dial because `FACE_RADIUS / BODY_RADIUS` is 0.76.
- *Color panel* (between the knobs): current-color swatch, editable hex, a
  readout (hue name · L% · S%), and a saturation slider. **No preset swatches** —
  they duplicated controls the knobs already cover.
- *Slide-to-clear*: a groove the width of the board, just under the screen;
  dragging wipes the drawing left→right progressively.

**Composer bottom dock** — a floating toolbar, Figma-style: out of flow, pinned
to the bottom of the viewport and centred, sized to its own content rather than
to the toy's width. Labelled fields (Name / Category / Tags), a current-color
chip, the help toggle, and Import / Export / Save (no filled-cell count). The
**Import** control lives here (a composer/owner action), not in the global nav,
and opens a **picker over the set** — a searchable grid of the registry plus
locally saved icons — rather than a file dialog.

Below `lg` it becomes a **phone bar**: the colour swatch, Name, a chevron, and
Save — everything else in a **Details** bottom sheet, the same surface the
gallery uses for the same reason. `lg` is measured, not chosen: the full row is
973px, so it fits at 1024 with room and nowhere below it.

**It never wraps.** Wrapping is what the row does when it is too wide for the
window, and the result was a 188×288 slab parked over the middle of the toy —
covering the tool strip, the saturation slider and the bottom of the frame. A
floating toolbar that hides what it floats over has stopped being one. Two
layouts, one rendered at a time, is the fix; a single layout that degrades is
what created the defect.

The split between bar and sheet is **exact, never mirrored**. Name stays on the
bar because it is what Save refuses without, so the field and the error naming
it are on one surface; the swatch stays because the paint colour is the one
dock value that changes while you draw. Anything set once is behind the
chevron. Repeating a control in both would put two answers to the same name in
one accessibility tree.

## 7. Do / Don't

Do: keep the shell monochrome + one accent; keep STORED pixel cells square;
reuse tokens.
Don't: use `--frame*/--screen` outside the composer; bake a rounded cell into
icon data; add gradients/shadows to icon art; add a second shell accent.

On rounding: the gallery's **Dots** mode draws circles, and that is allowed
precisely because it is drawn and not stored. The line is whether an icon
carries its own shape — it must not. One control sets the shape for the whole
set, the way one hex field sets the colour for the whole set.
