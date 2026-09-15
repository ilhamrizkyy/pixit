# DESIGN.md — Visual Style Guide

> Source of truth for look-and-feel. Every color, type, and spacing value comes
> from the tokens here. The product shell stays calm and minimal (Lucide-like);
> the personality lives in the icons and the Etch A Sketch composer.

Reflects the v9 prototype (silver screen, multi-color). The toy's blue became
space grey on 2026-08-29 — see §2. Items marked
**[FIX]** are known issues to correct while building (see @docs/BACKLOG.md).

---

## 1. Design thesis

**TWO REGISTERS. The composer is the toy; the gallery is pixel chrome.**
(Rewritten 2026-09-12. This inverts the 2026-08-28 thesis, which is recorded
below rather than deleted, because everything it argued is still true about the
*composer*.)

| Surface | Is |
|---|---|
| The composer, `/create` | the **board** — one moulded body, and the only one |
| The gallery, `/` | a **plain page**, drawn in pixel chrome |

### The gallery: pixel chrome

**The interface draws itself out of the same cell the icons are made of.** Not a
texture and not a skin — a RULE, `--px: 2px`, and everything derives from it:

- **Every shell radius is 0.** `--radius-sm/md/lg` are named zeros, so the
  corner is a decision rather than an omission. `--radius-toy` survives alone,
  for the composer.
- **Corners are BITTEN, not rounded.** `--px-notch` takes one cell out of each
  corner, axis-aligned across twelve points — a diagonal cut is what `clip-path`
  makes easy and it is the wrong thing: the browser antialiases the slope, which
  puts a soft grey edge on the one shape whose whole claim is that it has none.
  `--px-notch-l` / `--px-notch-r` are for the two halves of one split control,
  where biting all eight corners would draw two objects that happen to touch.
- **Boundaries are 2px lines in the page's own ink**, not shadows. Every recess
  on the board — the five-move well, the four-wall cut, the milled groove — was
  describing a hole in plastic. There is no plastic.
- **The handful of exceptions are each argued where they are made**, and there
  are three: the colour field refuses the notch (it clips the handle, and at
  #000000, where the gallery starts, three quarters of it was cut away); the
  knobs stayed round while they existed, because a knob is a physical part
  rather than interface chrome; and the shape drum's barrel kept its cylinder
  and had its smooth ramp **stepped into bands**, because pixel art shades in
  bands and the form was never the problem.

**The hardware stayed and the chassis went.** That was the brief, and the three
months of construction behind the controls is why it was possible at all: the
size rail, the shape control and the colour instrument are views of
`GallerySettings`, so replacing a view never touched a rule. The knob suite's
tests became the field's tests almost unchanged, because none of what they
pinned was ever about a knob.

**The icons are still the stars, and pixel chrome is why.** Chrome and art are
now drawn from the same 2px cell, so the interface cannot out-detail the thing
it is framing — it is made of the same material, at the same resolution.

### The hero: an arcade screen that boots (2026-09-15)

**The homepage hero is its own world, the way the composer is.** It paints CRT
glass in both themes and never takes the gallery's adaptive ground. Built
against a pinned brief (an arcade intro, replacing a blueprint setting-out
concept), then revised by the owner the same day.

| Part | Is |
|---|---|
| Ground | `--crt` #05070d, two faint pools of light, and a cell grid in **11 by 11 blocks** (24px cells, a major line every eleventh), so every block on the screen is one icon's canvas |
| Glass | scanlines and vignette on `::after`, a step-end flicker, one slow rolling band |
| Palette | `--neon-cyan` is the system colour; the name is `--neon-yellow`; `--neon-orange` and `--neon-green` are accents. Scoped to `.pixl-hero` |
| Type | Press Start 2P for the name (48 / 72 / 96px); **VT323** for the sentence, the links and the x-ray tags, loaded with `preload: false` so other routes pay nothing |
| Keys | glow, not the offset block: `drop-shadow` on the link, the notch clipped on the face inside it, because a clip-path cuts off its own element's filter |
| Art | the set's own icons composed like phosphoricons.com: two big pieces **bleeding off the screen** (a 264px one off the top, a 528px one off the bottom right), four small ones idling between them. **Which icon and which neon sit in each seat is dealt at random on every load**, from a pool of object-like icons (thin glyphs like dots or chevrons turn into stray strokes at 528px); no icon twice, each neon at most twice, the two big pieces never the same colour. Dealt in the browser so the server and client agree, and every sprite rasters in when it lands |
| X-ray | hover a piece and its neon goes out to reveal the **11 by 11 lattice** it is drawn on, lit cells as hollow squares, with a tag naming the icon. Phosphor's inspect move, carrying Pixit's own mechanism |

**The big pieces sit on the grid.** Their cells are 24 or 48px, and their
top-left corners snap to the 24px pitch with `round()`, so a piece's x-ray
lattice is the background's own lattice, lit.

**The boot, in order:** a dark screen with a blinking cyan block cursor where
the name will start; the grid powers on in uneven frames; the sprites raster in,
one row of their eleven cells per step; PIXIT types out of the cursor, each
letter struck over-bright and settling; the tag, sentence, keys and links wipe in
under it. A little over two seconds. The clock is one table, `introTimeline.ts`.

**Three rules keep it safe to have:**

- **The default is the finished hero.** Every hiding rule is scoped under
  `html[data-intro="play"]`, which a pre-paint script sets. No script, a
  crawler, a skip, or reduced motion all land on the same page.
- **Stepped, never eased.** `steps()` and `step-end`, every duration a multiple
  of `--f` (one frame at 12fps). The rolling band is the one continuous motion.
- **Nobody waits for it.** It plays on every load, so any key or press skips it,
  and the ambient loops pause off-screen.

**What came off, and why, so none of it is rebuilt by accident:**

- **The cyan-and-magenta RGB split on the name**, and magenta everywhere. It
  read as a social app's logo, not a cabinet.
- **The corner HUD** (PLAYER 1, a load bar, CREDIT 01, an icon counter) and the
  four corner brackets. The count moved into the tag above the name.
- **The skeleton blocks**: dithered rectangles with `BLK 02 TITLE` tabs that
  filled column by column before each piece of content. The tabs went first,
  then the blocks.
- **INSERT COIN** and once-per-tab memory. The boot plays on every load, so a
  replay button had nothing to replay.

**Exceptions this section makes, stated:** the grid background (earned: the
subject is a lattice), four colours on one surface (scoped, and §7's single
accent still holds everywhere else), and a small tag above the heading (it
carries the set's real count rather than a slogan).

### What moved, on 2026-09-12

| Was | Is |
|---|---|
| three colour knobs + segment readout | a saturation/lightness **field** with a hue strip |
| a thumbwheel drum printing SQUARE / INSET / ROUND | **three cells in a row**, drawn by `cellNode` |
| a 709px vertical size rail in the right gutter | the **horizontal** build, in the control column |
| a mini screen at the head of the left column | inside the **detail shelf**, at the foot of the picture |
| the board sized to the viewport, grid scrolling inside | the **page scrolls**, as a page does |

The knob colour setter is not deleted. It is saved verbatim in
`design-plans/reserved/` for the composer, which keeps the chassis and is the
surface those dials were always moulded into.

### Why the page stopped being a device

The rail is the clearest case, and it stands for all of them. It needed ~700px
to print fourteen stops without crowding, and only a viewport-height board could
give it that. So the board was locked to the viewport, which at 24 icons left
**79% of the screen empty at 1440x900** — measured — with the detail shelf
stranded at the bottom of the window. Every one of those constraints was
downstream of a chassis. Lay the rail down and the whole chain goes: no length
requirement, no viewport lock, no hole.

### What this replaced, and why (kept)

The 2026-08-28 thesis was **ONE register: the whole product is the toy.** The
gallery page was the board, the icon grid its recessed screen, the sidebar a
region of the moulding, inputs wells drilled through the panel, buttons domed
caps pressed 1px and no further. Its argument against the *original* two-register
design was that a calm white shell "looked like every other icon site, and the
thing that makes this project this project was hidden behind an owner-only route
the public can never reach."

**That objection is real and it has a different answer now.** CLAUDE.md rule 1
keeps `/create` owner-only in v1, so the board is still visible to one person.
What answers it is that the public page is unmistakably this product *without*
being a moulded object: Press Start 2P, the dot matrix, Pixel Materialize, the
pixel `search` glyph, the `play` chip mark, the seven `--cat-*` tints, and now a
register that could not be pasted onto another product because it is built from
the icons' own geometry.

**The one thing the old thesis got exactly right, and it survives:** the split
between what changes WHICH icons are shown and what changes HOW they are drawn.
Search and category are on the screen; colour, size and shape are in the control
column. That was argued from surfaces — glass versus plastic — and it turns out
to have been about information all along, which is why it outlived the surfaces.

**THE NAV WAS NEVER PART OF THE DEVICE** (corrected 2026-08-29, and now moot for
the gallery). It was the bezel's brow for one iteration, and that was the mapping
over-reaching: with a moulded nav the whole window read as one continuous chassis
with no edge to the object at all. Still true of the composer.

**The restraint that remains** is that icons never sit on `--frame`, and the
accent is still one colour — which is why the size marker gave up its orange when
the chassis left. See §7.

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
    --danger:#DC2626   (errors stay red so they read against the chassis)
    --danger-surface:#FEE2E2  --danger-ink:#B91C1C   (dark: #450A0A / #FCA5A5)

The three danger tokens are a SET, for tinted panels: a soft ground, the
full-strength red as its border, and a darker red as its ink. A saturated block
of red is the shape of a system failure, and most refusals are not one. Ink is a
step darker than the border because the border red on its own tint is 4.0:1 —
fine for a rule, short of AA for body text.
    --success:#16A34A  --warning:#D97706

The chassis — **space grey, not arcade blue (2026-08-29)**
    light (a silver device)          dark (the reference's charcoal)
    --frame:#DCDEE3                  #4D5158    body, top of gradient
    --frame-2:#C6C9D0                #3B3E45    body, bottom of gradient
    --frame-3:#AAB0B9                #2B2D33    bottom lip / deep shadow
    --bezel:#B6BAC2                  #24262B    rim; must read RECESSED
    --well:#B0B5BD  --well-2:#9AA0AA #2C2F35 / #1F2126   button wells
    --cut-shade:#6C727C              #0C0D10    a cut's upper wall, in shadow
    --cut-lip:#F4F5F8                #7D818A    its lower wall, catching light
    --drum-hi/-mid/-lo               the Shape barrel, crown to the ends
    --drum-ink                       the value printed on it
    --knob-hi/-mid/-lo               the dial's shoulder, crown to rim
    --knob-face-hi/-lo               its domed face, crown to foot
    --knob-mark                      the pointer pip
    --key-face/-face-2               the transport keys' cap
    --key-glyph/-glyph-on            their glyph, resting and latched
    --lcd/--lcd-2/--lcd-line         the segment panel, on BOTH boards
    --lcd-ink                        its lit segments
    --grid-bg/--grid-card            the icon grid's ground, and its tile
    --indicator                      the size scale's marker; the body's accent
    --strip/--strip-2                its groove's floor and shaded wall
    --ruler/--ruler-lip              the graduations engraved across it

`--cut-shade` / `--cut-lip` are the two walls of a **hole in the panel**, and
they are literal per theme rather than one `color-mix()` off `--frame`: a silver
panel and a charcoal one do not want the same amount of white in a lit lip.
The mini screen is the one thing built on them — see §6.

**The blue was the Etch A Sketch's, and this stopped being an Etch A Sketch**
when the gallery became the object. Dark mode takes a real device's charcoal;
light mode takes its INVERSE — the same object in a silver finish, rather than a
second design. The composer's toy reads these same tokens, so it went grey with
the gallery: one device family, one shell.

**THREE RULES, NOT ONE, AND WHICH ONE APPLIES DEPENDS ON WHAT THE PART IS.**
This was learned by getting it wrong in both directions on 2026-08-29:

- **Parts OF the case follow it.** The `--knob-*` and `--drum-*` sets are the
  chassis's own
  plastic — silver dial on the silver body, charcoal on the charcoal one. A knob
  is moulded in the same shot as the case, so it cannot be its opposite. It was
  `#ffffff` in both themes (a white disc on a near-white panel), then briefly
  its inverse, which read as three black knobs bolted onto a light board.
- **Things read AGAINST the case invert with it.** `--toy-ink`, and the
  `--lcd-*` panel behind the art on both boards: sage when the room is light,
  the same panel unlit when it is dark. That is not a second design — it is the reason
  white icons clear 8.2:1 on it instead of 2.5:1.
  **The Shape barrel was on the WRONG SHELF for a pass (corrected 2026-08-30)**
  — filed under *separate parts* below, with the transport key's cap, so it
  stayed a pale silver drum on a charcoal board. A thumbwheel is not a separate
  part: it is moulded through the case in the same shot a knob is, and a knob
  cannot be its opposite. `--drum-ink` then inverts with it under the next rule,
  because printing lies ON a surface — which is the half a palette swap forgets,
  and exactly the bug `.toy-button` carried for a week.

- **Separate parts keep their own material.** `--key-*` is a dark soft-touch
  cap in both themes, because that is what the keys are made of on both devices
  this board is modelled on. What changes per theme is only how far the cap sits
  from the panel: darker than a silver case, lighter than a charcoal one.

**AND A FOURTH SHELF ARRIVED WITH THE BADGE (2026-09-03): a mark CUT INTO the
case is on none of the three, because it has no colour to place at all.** The
board's wordmark is a hole in the panel, so its floor takes the panel's own tone
one step down and the only thing that reads is the pair of walls — shaded above,
lit below, and *not* inverting, exactly as every other recess on this board is
darker than its panel in both themes. That is the reverse of the flat-ink build
it replaced, which had to invert; §6 carries the five constructions.

Two smaller inversions ride inside those. The knob's **pip** inverts against the
DIAL rather than against the board — a pointer you cannot see on the knob it
points from reports nothing. And the transport key's **glyph** comes up rather
than the face going down when it latches: a near-black cap cannot drop much
further, and the engaged key on a real transport control is the lit one.

**The ink inverts with the chassis, and that is the half a palette swap
forgets.** `--toy-ink` is near-black on the silver body and white on the
charcoal one; every label in the sidebar and the nav would have gone invisible
otherwise. The rest of the on-chassis set moved to tokens for the same reason:
`--toy-line`, `--toy-accent-subtle` and `--toy-accent-ink`, since a silver body
needs the opposite of every value a blue one did, and they were hard-coded in
two rules.

**`--toy-accent` no longer reaches the gallery's body (2026-08-29).** A chassis
that repointed the shell's accent to a *second* blue put a different blue on the
size slider and the active tick from the one every other page uses. On the
chassis the accent is now the ink itself, see §6.

**And `--toy-accent` and `--toy-accent-on` are GONE with it (2026-08-30).** This
note used to end "the token survives for the composer, which still uses it", and
a sweep for dead values found nothing reading either one anywhere. A token kept
for a consumer that does not exist is worse than a deleted one, because the next
person reads the sentence rather than the stylesheet. (`--toy-accent-on` was ink
on the FULL accent, a different pairing from ink on its tint, measured at 7.5:1
and 9.4:1. Recorded here in case the pairing is ever needed again.)

**Two constants survived the swap deliberately.** `.pixl-key`'s face is a light
dome in both themes, so its ink is a literal dark rather than `--frame-3` —
which went from navy to silver and would have painted the label onto its own
cap. Same for the latched state's white ink on its dark face: a constant face
takes a constant ink.

**`.toy-button` was missed by that fix and carried the bug for a week.** The
composer's tool buttons kept `--frame-3` on the same kind of light dome, so
every glyph on the toy was a pale silver on white in light mode — 2.15:1 — and
read correctly only in dark. Both classes now take the literal ink, and both
states are measured on the composer's own route by `e2e/contrast.spec.ts`; the
one-route contrast sweep is what let it hide.
    --screen: near-white gradient (#e5e7de -> #f6f7f2), a trace of green so it
             still reads as a physical surface rather than a blank page
    --toy-grain: tileable fractal-noise data URI; moulded-plastic texture

**These are now the product's palette, at `:root`.** They were composer-only
while §1 kept two registers apart; that rule is retired. The constraint that
replaced it is narrower and more useful: **icon art never sits on `--frame`.**
It sits on `--screen`, which is what the composer draws on.

Both the frame and the screen gain dark-mode values, because the shell themes
and the toy did not have to before.

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

**Pixel face = Press Start 2P**, scoped to the **wordmark, h1, h2 and the hex
readout's segments**. (It listed "the gallery's section eyebrows (Search /
Display / Categories)" until 2026-09-04. Those were the OLD sidebar's headings;
nothing has rendered one since the board rebuild, and the screen's header does
not want them — a label over an obvious control costs vertical space on the one
surface that scrolls.) The readout is the one place it runs at 16px rather than
12: it is a display, not a label, and 16 is on the face's own 8px grid. It has very wide
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
    This is a display setting in the same family as colour and size: `cells` are untouched, every icon in the gallery changes together,
    and the mode is never a property of an `IconDef`. The old flat rule is kept
    above because it still governs authoring — what changed is that rendering
    and storage are now allowed to disagree, which is CLAUDE.md rule 3 working
    as intended rather than an exception to it.
- Sidebar 264px fixed, and it is now the board's **left column**: the mini
  screen, the Display pad, then the Shape keys mounted through the pad's bottom
  edge. The board is inset from the window (`0.75rem`; `1.5rem` at `lg`) so it
  reads as an object on a page rather than as a background colour.
- **ONE GUTTER, `--board-gutter`, used four times**: the board's own padding and
  the gaps between every part in its row — body, screen, size rail, edge. They
  were separate numbers, so the mini screen had 20px of air to the board's edge
  and none at all to the screen beside it — which reads as a missing gap rather
  than as two values. A token makes them the same thing, and a test walks the
  whole row, because a new part slotted into it is exactly how that got in.
- **THE BOARD IS SIZED TO THE VIEWPORT, and the icon grid is the only scroll on
  the page.** `height`, not `min-height`: the device is a fixed object you see
  all of at once, and the picture moves inside the glass rather than the whole
  thing sliding up the page. The grid can only claim leftover space if there is
  a fixed amount to leave over, which is also why every flex ancestor between
  the board and the panel carries `min-h-0` — a flex child refuses to shrink
  below its content without it, and the board silently grows past the window.
  - **Those insets are LITERAL LENGTHS, not `var(--spacing-N)`.** Tailwind v4
    emits a `--spacing-N` variable only when some utility in the build happens
    to need that step, so `var(--spacing-5)` resolved to nothing and the
    board's whole internal gutter silently became 0. Second time this exact
    class of bug has been paid for — see the caution in §5c.
- Icon grid: auto-fill, **8px gap**, and a **FIXED 64px track**. It followed the
  size slider for a while — `max(56px, size + 28px)` — and that is the entry
  this corrects: a grid whose cells resize as you drag reflows the whole page
  under the cursor, and the thing you are dragging in order to judge moves while
  you judge it. Fixed, it fits ~17 columns at 1440px and 5 at 390px, which is
  the Lucide density; the 92px track it replaced fitted 10. Density is what
  makes a set look like a set — but it also makes a small set look emptier, so
  it is the right call only while the set grows.
  - **The seat is why 48 is the size cap.** 64px with 8px of padding leaves
    exactly 48 for the art, so the grid cannot draw a larger icon however far
    the rail travels. `MAX_RENDERED_SIZE` is derived from the top of
    `ICON_SIZES` rather than written out, and a test holds the two together.
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

### Shell hardware — the toy's physics, the shell's palette (2026-08-28)

§1 keeps two registers apart, and it still does. What crosses from the composer
into the shell is not colour but **construction** — the three moves that make
the toy read as an object:

- a raised face catches light along its top edge and turns away at its foot;
- a recess is dark at the top and shows a **lit lip** at the bottom;
- a press sinks about **1px** and no further.

Three classes carry it, all in `--color-surface`/`--color-bg` rather than
`--frame`/`--well`:

- **`.pixl-pad`** — a panel SET INTO the body. Groups controls the way the toy's
  tool pads do; the pad is what says *these belong together*, a job a heading and
  a hairline were doing less well.

  **It was a raised boss until 2026-08-29** — lit crown, shaded foot, drop
  shadow onto the body. That is the right construction for a pad you press
  buttons ON, and the wrong one for a region of the case you drop controls
  INTO, which is what this is. Inverting the ramp is most of the fix: dark under
  the lip at the top, opening out toward the floor. It reads as merely *a bit
  flat* when it is wrong rather than obviously so, which is why there is a test
  on the direction of the gradient.

- **`.pixl-well`** — a hole in the panel. Inputs sit **in** the surface, not on
  it. Five moves, and it took a rebuild on 2026-08-29 to get them all: the dark
  line at the **cut**, the **lip above** shading the top of the opening, the two
  **side walls**, the **lower wall** catching the room as a 1px lit line, and the
  panel's own lit **lip below** the hole. The lit halves are what actually read
  as depth; without them a well is a grey box.

  Its ground was a RADIAL gradient with the dark stop in the middle, which is
  not what a hole looks like from any angle — that is a dish, and a dish in a
  rectangle is a smudge. It runs top-to-bottom now. And **the darkness lives in
  the shadows, not the fill**: physically a shadow is a shadow, and practically
  the field's own text sits on this ground — a gradient deep enough to read as a
  real cut took the ink to 3.58:1, while the same depth spent as an inset shadow
  leaves it on the middle of the ramp at 6.5:1. The lit lower wall is a 1px line
  for the same reason, so white text in dark mode never lands on it.

  Focus **adds** its ring to that stack rather than replacing it; swapping the
  whole `box-shadow` is how focusing the field used to flatten the hole.

**A HOLE HAS FOUR WALLS, and every recess on this board had two.** Found on
2026-08-29 by measuring rather than by looking: every x-offset in every one of
these shadow stacks was `0`. The top was shaded and the bottom lit, and the
sides were nothing — so each recess died away toward its ends and read shallow
however deep the top was made. `.pixl-screen` was worse, carrying a LEFT wall
and no right, so the cut ran out halfway across.

The composer's screen was the one surface that had all four, because it is not
CSS at all: DESIGN.md has said since 2026-08-20 that "four edges of one hole do
not have four independent gradients", and the R3F recess renders four sloped
walls under one light. That is the argument the CSS approximations had been
quietly ignoring.

**The two sides are uneven on purpose.** The key is up and to the LEFT
everywhere on this object, so the near wall catches a little of it and the far
one does not; equal sides read as a tube lit from directly in front. A test now
walks all three recesses and requires a wall on each side and a shaded top, so
this cannot come back one surface at a time.

- **`.pixl-key`** — a pressable cap. A latched key rests in the same shallow
  click a press makes and its face drops several steps of VALUE, because a 1px
  sink alone is easy to miss across a panel. Value, never an accent: the same
  cap held down, not a differently coloured button. `.pixl-shape-key` follows
  the identical rule — it wore the accent for one iteration and was corrected
  on 2026-08-29 (§6).

~~Depth lives in four tokens — `--depth-lip`, `--depth-shade`, `--depth-drop`,
`--depth-recess` — so dark mode raises every alpha in one place.~~

**Corrected 2026-08-29: those four tokens are not in the stylesheet and never
have been.** Every hardware class spells its alphas out. This was found the way
the `--spacing-5` bug was found — by writing a new rule against them and
measuring nothing where the shadows should have been. That is now three
surfaces that have silently lost their depth to an unresolved `var()`, so the
rule is worth stating plainly: **before tuning a value that looks weak, check
the computed style in the browser** — an undefined custom property is not an
error anywhere, it is just a shadow that never arrives.

**They carry shadow and no border**, which is the rule above applied rather than
excepted.

**A caution paid for once:** these were first written against `--bg`,
`--surface` and `--surface-2`. Tailwind v4's `@theme` names them
`--color-bg`/`--color-surface`/`--color-surface-2`, so every background was an
invalid value and silently fell through to transparent — leaving only the
shadows, which read as "the depth is too subtle" rather than as a bug. Check a
computed style in the browser before tuning a value that looks weak.

## 5d. Browser surfaces

Text selection, the caret, and scrollbars are themed from the palette rather
than left at browser defaults, and data (counts, hex, sizes) uses
`tabular-nums` so figures do not reflow as digits change. Prose is capped at a
68ch measure.

## 6. Component specs

> **STALE IN PLACES, 2026-09-12.** This section was written when the gallery was
> the board, and large parts of it describe controls that have been replaced:
> the size rail's vertical channel and magnifier, the Shape thumbwheel, the
> three colour knobs and their segment readout, the mini screen's bezel and cut,
> and the board's engraved badge. The **behaviour** in those entries is mostly
> still live — what a control does, what it refuses, what it announces — and the
> **construction** is not. Each replacement carries its own argument in the file
> that draws it; §1 lists what moved. Everything about the COMPOSER here is
> current, since the composer keeps the chassis.


**Top nav** — logo left; Icons / Guide / Resources / Contribute; then the
owner-only actions. **Plain shell: a flat `--bg` fill and a `--border`
hairline**, with the active item in the shell's own `--accent`.

**The wordmark is ONE colour.** Its `le` was in `--accent`, which put a second
thing claiming *this one* in a bar that already marks the active route with the
same colour, three centimetres away. Below `lg` the
links collapse behind a **hamburger**; the theme toggle stays in the bar, since
burying a one-tap control behind two taps costs more than the space it saves.

It was a moulded chassis brow between 2026-08-28 and 2026-08-29 — see §1 for
why that came back off. The one thing worth keeping from the experiment is the
diagnosis: a surface that repoints the toy's tokens must be a surface the toy's
controls actually stand on, and the nav is not.

**The screen's header** — two lines inside the screen: **Search** (+reset and
the count) on the first, the **category chips** on the second. Both answer the
same question — *what is on the screen right now* — and both line up with the
icons they filter.

**REBUILT 2026-09-04, and the reason is worth more than the result.** Until then
`.pixl-field` carried this comment: *"A field in the CONTENT area, which is plain
shell — not the toy. The toy is the nav and the sidebar."* That is the
architecture §1 retired on 2026-08-29. **The search field and the chip row were
the last two pieces of the pre-board design still in place** — the board was
rebuilt around them and neither was revisited. Every other part of the device
earned a construction paragraph; the glass never did.

The second half is a rule that got over-read. §1 says chips are flat because
they are drawn on glass, which is right, and "flat" was allowed to collapse into
"generic". The device disproves that on its own: the LCD readout, the dot matrix
and Pixel Materialize are all flat, all drawn, and all unmistakably this
product. **A display has its own vocabulary and the header was using none of
it.**

- **The FIELD's boundary carries it, not its fill.** It is not a well drilled
  through plastic, so it does not get a well's deep gradient — it gets a real
  line, `--screen-field-line`, solved for 3:1 against the screen (1.4.11). The
  old build spent its whole budget on an inset shadow *pretending* to be a
  recess and left the line at `--color-border`: **1.27:1**, with the fill inside
  it at **1.10:1 light and 1.06:1 dark**, so the largest element on the board
  was locatable only by the placeholder text inside it.
- **Focus ADDS its ring to the stack.** It replaced the whole `box-shadow`,
  dropping the boundary the instant you clicked in — the exact bug §5c records
  fixing on `.pixl-well`, in the one field that never got the fix. Tested in
  both themes, and the test was mutation-checked against the old rule.
- **A COUNT was printed at the field's far end and taken off the same day**, by
  request. The argument for it still holds on paper: the field runs 948px at
  1440 with ~850px empty, two controls narrow the same set, and nothing reports
  their combined result. It reads as a status line on a surface whose whole job
  is to be quiet, which is the same objection that took the maker credit and the
  panel resolution off the mini screen's bezel. Recorded so it is not rebuilt.
- **The chips are PRINTED, not set like nav links.** 12px, uppercase, tracked.
  The drum's faces are uppercase and the rail's numbers take the data face; the
  chips had the site's generic 14px UI type.
- **The FILL TRAVELS.** See below.
- **The mobile filter key is drawn, not moulded.** It carried `.pixl-key`, whose
  cap casts an *outer* drop shadow — a raised part throwing shade onto what it
  sits on, and it sits on the display. The chips were paying for a rule the
  control beside them ignored.

**Colour moved to the body on 2026-08-28.** It sat beside search for the reason
Lucide puts it there, and the board supplies a better one: the body is what
operates the screen, and the colour every icon renders in is the most
screen-changing thing there is. Search stays because it changes *which* icons
are there, not how they are drawn.

**Gallery sidebar** — the body, and Display only, in **THREE SECTIONS**: the
mini screen, then a pad for **Colour**, then the **Shape** switch mounted
straight through the case. Size left for the rail in the gutter on 2026-08-29.

**One pad on the board, and it is Colour's — settled in two steps.** The first
(2026-08-29) split one pad into two: Colour is one instrument — a readout and
the three knobs that drive it — while Shape is a separate setting that merely
sits next to it, and a pad is what says *these belong together* (§5c).

**Followed through, the same rule takes the second pad away (2026-08-30).** With
Size gone to the rail, that panel was drawn around a *single* control, grouping
it with nothing — and its own 16px of padding held the switch inset from the
screen and the colour pad both, which reads as a control that did not quite fit
rather than one mounted through the panel. The drum spans the column's full
width now, with no tray under it. The sheet is the one surface where Size is
really mounted, so it is the one surface that still has two pads.

The mini screen was always the third section: it is a separate part of the
moulding, not a region of one.

**NOTHING IN THE COLUMN STRETCHES**, and **the slack falls at the BOTTOM** —
two separate decisions that keep being confused for one.

The last pad used to grow so the column finished level with the screen; with
Size gone to the rail, stretching a panel around three keys just draws a slab of
bare plastic with a control in its corner. So the pad hugs its contents, and the
switch below it is the height of the switch.

**Where the slack then goes took two tries (2026-08-30).** It went to the TOP
first — pads pinned to the foot of the column, screen at the head — on the
objection that bare plastic *under the last control* reads as an unfinished
side. That objection is real and the answer was wrong: what pinning produced was
a **152px hole between the screen and the first control** at a 900px window, and
302px at 1050. That does not read as case; it reads as two groups that have come
apart. The controls operate the screen, so they sit under it, evenly spaced —
one gap, used twice.

**The unfinished side is answered by the LEGEND instead** — see below. A panel
of bare plastic with a name cut into it is a finished side; the same panel
without one is not. That is what the space is for.

**On a short window it is still the MINI SCREEN that gives height back**, never
the controls: a shorter case has a shorter screen, not squashed controls.

**And the spare height does NOT go to the mini screen either**, which was tried
first and is worth recording because it looks like the obvious answer. Its glass
carries `aspect-ratio: 1` as a basis, so growing it does not make a bigger
picture — it makes a PORTRAIT screen with the 11×11 lattice letterboxed in the
middle. A display that stretches is not a bigger display.

**No heading and no section Reset (2026-08-29).** The pad is the only thing on
the body and every control on it is labelled, so "DISPLAY" was a heading over a
panel with nothing to distinguish itself from. The Reset went with it: it
duplicated wholesale what the colour field's ✕ and the size scale already do one
control at a time, and the mobile sheet's footer is where a reset-everything
still lives.

**Colour is THREE KNOBS — the composer's own control (2026-08-29).** Hue,
Saturation, Lightness, legended **H / S / L** on the plastic under each dial,
with the hex field kept underneath as a well drilled through the panel. The board is the toy
and the body is what operates the screen; the most screen-changing control there
is has no business being a text field on a device that already has an instrument
for it.

- **Three of them, not two and a slider.** The composer runs H and L on knobs
  and S on a rail because the rail spans the lane between them and has a whole
  board's width to live in. A 264px column has no lane, and a slider dropped
  between two knobs reads as the one control that did not get to be hardware.
  Three of the same object is also the truer reading: H, S and L are three axes
  of one thing.
- **The hex field stayed, as a SEGMENT PANEL above the knobs** — the Braun
  tuner's frequency display, at readout scale. Knobs are how you FIND a colour;
  a field is how you enter one you already know, and an icon set whose users
  arrive with a brand hex needs both. That is the composer's split too — knobs
  on the board, hex in the dock.

  It was a `.pixl-well`: a hole with text lying in it. The reference device does
  not put its readout in a hole, it puts a DISPLAY in the case, so this is the
  same `--lcd` panel the mini screen is, recessed with the same five moves every
  other cut on the board uses. **It sits ABOVE the knobs**, because the display
  is what the case shows you and the controls go under it; it was below them,
  which put the answer beneath the question.

  **THE COLOUR HAS ITS OWN SCREEN beside the readout (2026-08-29)**, square and
  stretched to the readout's height so the two read as one fitting at two
  widths. It was a swatch chip sitting ON the readout, which is a single display
  showing two unrelated things — a colour and a number — and a readout is for
  the number. The colour is the panel's own background, so the recess shadows
  fall on it and it reads as a lit surface at the bottom of a hole rather than a
  sample card taped over one.

  **There is no unit label.** The tuner prints "MHz" because a bare number could
  be anything; `#` already says hex, and a panel with one value on it does not
  need to be told what kind of value it is. The ✕ has the seat to itself.

  **THE SEGMENTS REFRESH when the value changes** — transitions.dev's number
  pop-in, with every number pulled down, because the trigger is different in
  kind. A counter ticks once and can afford 500ms, an 8px rise and a 70ms
  stagger per digit; a knob streams a new value for as long as you hold it, and
  that recipe at drag rate replays from zero sixty times a second and finishes
  nothing. Three changes make it read as motion rather than flicker:

  - **Per character, not per group** — only the digits that actually changed
    move, so turning Lightness on a grey does not shake all six.
  - **No stagger** — the stock delay on the last two digits makes a decimal feel
    alive; here one turn changes them all at once, and a stagger would ripple
    the number left to right on every sample.
  - **Short, and throttled per character**: 180ms against a 200ms floor between
    retriggers, so an animation can never restart mid-flight. Measured: 40
    changes produce 6 animations against a production build and 15 against a
    dev one — unthrottled, the same runs produce 24 and 60.

  The glyphs are an overlay over the input, which paints nothing but the caret:
  an `<input>` has no per-character boxes to animate. The test derives its
  ceiling from the elapsed time rather than hard-coding a count, because the
  same 40 presses take 160ms in production and 600ms in dev, and a bound picked
  from either passes the unthrottled version of the other.

  **IT CARRIED A GHOST for one pass and it had to go.** A real LCD shows its
  unlit segments faintly whatever it is displaying — the `8.8.8.8` behind the
  `8.0` — so a `#888888` went under the live value. It is a true detail of the
  object and it was wrong in this medium: on real hardware the unlit segments
  are the SAME shapes as the lit ones, so the ghost sits inside them and
  disappears. A full-glyph face draws two different letterforms on top of each
  other instead, and the eye reads that as flicker rather than as depth.
  Authentic is not the same as legible.

  **The digits are the PIXEL FACE**, which §4 otherwise keeps to the wordmark,
  the headings and the section eyebrows. This earns a fourth scope: a segment
  readout is not running text, it is a display, and Press Start 2P is a display
  face. At 16px, its own design grid.

  **The glass wash is weaker here than on the mini screen, and that is measured
  rather than judged.** Glass lightens what is under it, and this panel carries
  TEXT where the mini screen carries art: at the mini screen's 0.16 the sheen
  lifted the dark theme's ground to rgb(105,111,98) in the corner and took the
  segment ink to 3.47:1.

  **There is no "Colour" heading.** The panel reads the colour out and the three
  knobs are legended H / S / L on the plastic; a label over that is a caption
  for something already saying its own name. The input still takes the whole
  panel's width — it was sized to its content at `7ch`, which left most of a
  264px field looking clickable and doing nothing when clicked.

- **THE KNOB POSITION IS HELD, NOT DERIVED**, and this is the part a refactor
  will get wrong. The default colour is #000000, and every hue and every
  saturation of black is the same six characters — so a knob reading its
  position back off the hex loses both axes at the exact value the gallery
  *starts* on. `GallerySettings` carries an `hsl` alongside `colorText` for
  that reason. It is unused while the field is empty, when the knobs read the
  theme's colour instead so they always show what is on screen.
- **No mesh.** The dials are the CSS build: three.js is ~600KB and the gallery
  is the public route almost all traffic lands on (measured — `/` loads 539KB
  of JS, `/create` 1419KB of which 861KB is three). The rule that the WebGL and
  CSS builds must describe ONE object is what makes that a choice rather than a
  degradation.

**The CONTROLS SIT UNDER THE MINI SCREEN**, one gap between all three parts,
with the slack below them — see the sidebar note above for why they were pinned
to the column's FOOT for a day and what that actually produced.

**The board's BADGE — the wordmark cut into the bottom-left corner of the case
(2026-08-30)**, which is where most of the devices on the reference sheet carry
theirs. It is what the slack under the controls is for — a panel with the
product's name along its foot is a finished side, and the same panel without one
is not.

- **ENGRAVED INTO THE CASE — settled 2026-09-03 against the reference
  photographs**, which show the badge as a mark *cut into* the metal rather than
  as anything lying on it. So the letters carry **no ink at all**. They are the
  **floor of a cut**: one step down from the panel and taking less light for it,
  with the cut's two **walls** doing the reading — shaded above, lit lip below,
  which is the construction `.pixl-well`, `.pixl-mini` and the Shape drum's
  windows all already use (§5c).

- **FIVE CONSTRUCTIONS, AND IT TOOK ALL FIVE TO ARRIVE AT THE SIMPLE ONE.**
  Worth keeping all five, because each was right about something:

  1. A flat dark fill with a lit lip under it. Read as *printed*, which was the
     complaint that started this.
  2. A **real cut**: a `background-clip: text` gradient inside each glyph — the
     shaded wall at the top, the lit floor at the bottom — with the lip as a
     `drop-shadow`. A `text-shadow` cannot do it: it paints ABOVE a
     background-clip fill, so the near-white lip lands on top of the glyph and
     the letters come out light.
  3. The same, held right back, because at full strength a near-white line under
     every letter is a **white rule**, not a lit wall.
  4. Flat ink, no relief at all, on the reading that the reference case *prints*
     its badge. It does not.
  5. **RAISED**: the panel extruded, lit up-left and shaded down-right. Right
     physics, wrong direction — the word stood off the case, which is what an
     emboss is and not what was wanted.

  **2 and 3 were the right idea at the wrong cost.** They put a gradient *inside*
  the letterform, which needs `background-clip` and forces the lip out into a
  `drop-shadow`, and 3 is where that lip stopped reading as a wall. A cut does
  not need a gradient in its floor: the floor is one tone, and the two walls are
  what you see. Two `text-shadow` offsets buy the whole thing, and neither of
  the mechanisms that made 2 fragile is in the file any more.

- **THE RELIEF DOES NOT INVERT WITH THE CASE**, and that is the difference from
  the flat-ink build at 4. Ink LIES ON a panel, so 4 had to be dark on silver
  and light on charcoal; a cut is darker than its panel in **both** themes
  because it is a hole, with the light in its lower wall either way.
  `--cut-shade` and `--cut-lip` are already the per-theme values of those two
  walls, so it comes for free, and the badge no longer reads `--toy-ink`.

  The test asserts each direction separately, in both themes. The flat-ink build
  fails the floor check on silver and fails it enormously on charcoal, where the
  ink was white; the raised build fails every direction check at once.

- **BOTH WALLS ARE HELD BACK, for the reason 3 records.** At full strength the
  lit one is a white line under a word rather than a wall. Composited, the lit
  wall lands **1.29:1** against the light panel and the shaded one **1.35:1**,
  and the floor sits **1.13:1** below it — which is the whole of how visible an
  engraving is meant to be. The pair *is* the badge, so there is a floor as well
  as a ceiling: held back until the walls stop reading, it is a blank corner of
  plastic. Both bounds are tested.

- **AND IT IS NOT COLOURED — argued, then BUILT, then taken back off.** It ran
  as the marker's orange in light and a red in dark for one pass, on a
  `--badge-ink` token that is gone with it. The engraving settles it a second
  time and from a different direction: there is no ink left to colour, and a
  tinted cut would be a *painted* letter claiming to be a hole. §7 is the argument: the rail's
  marker is the body's ONE accent, and the reference sheet spends that orange on
  the thing you TOUCH — a knob, a button, a slider — never once on a label.
  Seeing it on the board settled it. Two things the measurements say, for
  whoever reaches for this again:

  - **The badge takes weight OFF the marker.** They land diagonally across from
    each other on one grey chassis and five letters beat a 32px pointer, so the
    accent stops meaning *this is the control you are moving*.
  - **The colours are weak exactly where they need not to be.** Orange on the
    silver case is **1.71:1** against `--frame-2` — carried by hue, not value,
    the same thing §6 records about the marker on its groove. Red on the
    charcoal one is **3.10:1**, *dimmer* than the marker's own orange there
    (3.76:1), and a deeper red is worse still: `--danger`'s `#dc2626` collapses
    to 1.85:1. (Not that `--danger` was ever a candidate — that token means a
    failure, and a brand badge wearing it would be the one red on the page that
    is not an error.)

- **NO MODEL NAME.** The reference pairs the brand with one — `audio 1`,
  `tuner 1`, `photo 1` — and it was built that way for a pass. On a column that
  already carries the mini screen's own legend two inches above, a second
  right-hand label is one more thing to read on a face whose whole job is to be
  quiet.

- **IT DOES NOT SCROLL.** It is a SIBLING of the column's scroll box, not its
  last child. The screen and the pads scroll on a short window — the mini screen
  gives up height first, and only past its floor does anything move — but a mark
  moulded into a case does not slide up over the controls when the content
  behind it runs long. Held by a test that actually scrolls the column, since
  an `overflow` three ancestors up is exactly what a refactor moves.

- **The pixel face, and the floor is about 16px** — set by the STROKE rather
  than by the face's 8px design grid. 12px fails twice over: a 1-unit stroke
  lands at 1.5px, so every edge is a half pixel, and the letterform goes soft.
  Above ~16px the stroke is 2px and up and being off the grid stops showing —
  measured at 8x zoom, 17.6px is indistinguishable from 16. **The cut needs that
  floor more than the printing did**: the walls are 1px each, so on a 1.5px
  stroke the relief would be wider than the letter it is describing.

- **A corner mark, not a banner.** The letters were spread across the whole
  column for one pass, at 40px, on a literal reading of "fill the width".
  Filling 264px with five glyphs means the GAPS do the filling, and a word held
  apart by 16px of plastic reads as five marks in a row.

- It is `aria-hidden` — the page's real wordmark is in the nav.

**Size is a TUNING RAIL ON THE BOARD'S RIGHT EDGE (2026-08-29)** — the Braun
audio 1's dial strip, stood on end. It runs the screen's full height in the
chassis **past the screen**, which was the one side of the board carrying
nothing; the screen used to run to the board's own padding there. It is on the
CHASSIS rather than on the glass: size changes how an icon is DRAWN, which is
the body's job, and a slider printed on a display would be the one control
claiming to be hardware sitting on top of the picture. It left the Display pad
because a scale wants LENGTH — fourteen stops need the screen's height to print,
and the pad is 264px wide.

**THE WHOLE SCALE IS IN THE CHANNEL (2026-08-29).** A wide GROOVE cut into the
chassis, the SCALE printed on its floor — a number at every stop with a
graduation flanking it — and the MAGNIFIER riding in the groove over them.
**16–120 in 8s, default 24.**

It took four passes, and the last one deleted a part rather than adding one. The
first was a groove with a fill and the ticks underneath — a slider wearing
hardware rather than the hardware itself. The second made the whole strip the
channel and deleted the groove, which lost the one part that says where the
marker can travel. The third put the numbers OUTBOARD of a narrow groove, and
that gutter is what forced the marker to be **two mouldings**: a thin blade to
sit in the slot, bridged sideways to a lens over the number column.

**Widening the channel until the scale fits inside it removes the gap, and with
it everything the gap forced.** No bridge, no arm, no seam between two parts lit
by one light — and a narrower rail than two columns needed (60px against 66).
The magnifier is simply lying on the scale, which is what a magnifier on a scale
is. Everything the old build spent on making two parts read as one is recorded
below under the arm, because the fix that finally worked was not lighting them
better.

**Its numbers therefore read IN the channel**, not beside it, and the channel
sits against the screen — the marker is beside the thing it governs, with
nothing between them to read past.

- **THE SCALE OUTRUNS THE PICTURE.** The grid's seat is a fixed 64px, so **48
  is the largest art it can draw** — but the rail runs to 120, and every stop
  past the cap sets the size of the **exported file** instead. Both halves of
  the travel do something; they do different things.

  **It is no longer marked on the ruler.** 48 wore a full-width graduation for
  one pass, and a ruler with one mark unlike all the others reads as damage
  before it reads as information — the scale's own uniformity is worth more than
  the annotation. The region is still announced (`aria-valuetext`); it is not
  drawn.

- **MAJOR AND MINOR GRADUATIONS, AND THEY FLANK THE NUMBER.** A mark reaches in
  from each wall of the channel and the number sits in the break between them:
  `—— 24 ——`. That is what a graduation and its label are on any printed scale,
  and it is what the numbers moving into the groove made possible — with the
  scale outboard the marks had nothing to flank.

  Stacking them was tried first — one rule at each halfway point, between the
  numbers rather than beside them — and read as **rows**: a line lying between
  two numbers is a divider, and a channel full of dividers is a list.

  Every stop keeps a major pair and its number; a shorter minor pair sits at each
  **halfway point**. The minors are a printed subdivision rather than reachable
  values — the control steps in 8s — which is what a graduated scale is: the
  marks between the numbers tell you how far along you are, the detents decide
  where you land. Numbering every *other* stop instead, so the minors could be
  real stops, was tried and read as a scale with half its labels missing.

- **THE MARKER IS A MAGNIFIER, AND THE GLASS IS A REAL HOLE.** One moulding: a
  **lens frame** in the body's orange, riding in the channel directly over the
  scale, with 4px of floor showing either side of it.
  - **The lens prints nothing of its own.** It carried a copy of the value on a
    lit white face for a pass, and both halves of that were wrong: a magnifier
    that renders its own digits is a *badge*, and a white face is a part with
    its own colour sitting **on** the chassis rather than a window **onto** it.
    The frame is a masked ring, so the opening is genuinely empty and the panel
    — and the number printed on it — shows through.
  - **The magnification is of the real number.** The printed mark under the
    glass scales about its own centre, so the effect comes from enlarging what
    is actually there rather than from drawing a second copy of it. That is also
    why the printed numbers carry no colour or weight of their own: the glass is
    the emphasis, and mid-travel between two stops the window correctly shows
    the bare panel that is there.
  - **THE ARM IS GONE, AND THAT IS THE REAL FIX.** It was a slim blade crossing
    the groove to reach a lens over the number column, and it never stopped
    looking like two parts. Two passes were spent on the seam: it stopped 12px
    short of the plate (invisible while the plate was solid, a stub lying across
    the number the moment the lens became a hole), and its gradient was rescaled
    to the whole marker — a `180deg` ramp runs over the box it is painted on, so
    an 8px arm ran the full crown-to-foot fall inside 8px while the lens ran the
    same fall over 32px, and the two met at visibly different tone.

    Both were correct and neither was the answer. **A join you keep having to
    disguise is usually a join that should not exist** — the arm existed only to
    span a gutter, and widening the channel deleted the gutter.

  - **Its corner radius is nested, not chosen.** The marker travels flush into
    the groove's ends, so at the extremes the groove is only `half-width minus
its radius` wide while the frame is `half-width minus its own` — the frame
    hangs out of the slot unless `grooveRadius ≤ markerRadius + the floor either
side`. The groove was a **capsule** (`999px`, used as 30 against 12 of
    slack), which is invisible mid-scale and wrong at both ends, and the phone's
    bar had the same defect: at 16 its lozenge stood outside a capsule that has
    no height at its own tip. A bounding box cannot see any of this, so the test
    measures the radii.
  - **The rail is inset from the screen, and only inset.** Run to full height it
    reads as a second edge of the case; at 72% it read as a stray control beside
    the screen. Both shipped by accident, the second because an edit to the
    number silently matched nothing and nothing measured it. A test does now.
  - **It is a real element, not the native thumb**, because a
    `::-webkit-slider-thumb` cannot be a frame with a hole in it. The thumb is
    kept — sized,
    transparent, still the drag target — and the marker is drawn over it. They
    cannot drift: the marker's lane is inset by exactly half a thumb, the same
    box the ruler and the numbers use, so all three are positioned by one piece
    of arithmetic.
  - **The input covers the whole rail**, not just the groove. That is what makes
    the plate grabbable and the printed numbers click targets again, without
    their being fourteen buttons in the tab order.
  - **IT FOLLOWS THE POINTER; IT IS NOT ANIMATED TOWARD IT.** The value steps in
    8s, so a marker positioned straight from the value jumps the whole gap
    between two stops — measured, **fourteen jumps of 55px across a 660ms drag
    with not one frame in between**. The stepping is right and stays; what was
    missing is that a pointer travels.

    **Two passes were spent trying to animate that, and both failed for reasons
    worth keeping.** Easing each detent with `--ease-smooth-out` stutters: that
    curve covers ~80% of its distance in the first third, which is ideal once
    and a burst-then-crawl when it restarts every 45ms — velocity swinging
    **±80% of its own mean, with peaks 3× the average**. Going linear and
    matching the duration to the incoming pace fixed the spikes (0.80 → 0.36)
    and left something worse: **15 frames of dead stop inside one drag**, about
    one per detent, because a duration chosen from the previous gap is a lagging
    guess at the next and every guess that comes in short is a standstill under
    a moving finger.

    So during a drag the marker is simply **placed where the pointer is**, with
    no clock in between to be wrong about — which is also what the object does,
    since a pointer on a detented scale sits under your finger and drops into
    the notch when you let go. What remains is a **45ms linear bridge**, and it
    is for sampling, not for travel: a frame in which no pointer event arrived
    is a frame the marker would not move, and 17 frames in 121 got none.
    Measured across that bridge's length, 45ms is the floor of the curve — peak
    velocity **1.46× the mean, against 6.8× with no bridge at all**.

  - **The position rides a `translate` on a wrapper the size of the lane**,
    where `--fill` is the value's fraction and `-100%` of the wrapper's own
    height is exactly the lane's. The arithmetic therefore lands in the same box
    the ruler and the numbers are measured in, without any of them needing a
    pixel number — and it stays a transform, animatable off the main thread,
    where `bottom: X%` would relayout the element on every frame of every drag.
  - **FOR THE MOVES IT MAKES ON ITS OWN** — a key, a click, the drop into the
    detent when a drag ends — **the duration follows the distance**, which is
    §5b's rule rather than a new one. A detent gets ~112ms and a full sweep
    ~325ms; at one fixed clock, 260ms left a long throw fine and a short move
    sluggish, and 90ms made a click across the rail snap instead of travel.
    **The settle applies only if a drag actually happened**: a click is a press
    and a release, and the press already started a long glide — stamping the
    settle clock on the release rewrote that transition mid-flight and cut the
    travel short.
  - **Grabbed, the seating deepens and the part does not grow** — the same rule
    the knobs are held to. A marker riding in a groove cannot get bigger because
    you took hold of it; what a part pressed into its socket does is sit deeper.
  - **It carries no ink at all**, which is what an empty window means. The
    plate that preceded it printed the value, and its face therefore had to be a
    constant in both themes with a literal dark ink — a token there could have
    flipped out from under it, the exact bug §2 records `.toy-button` carrying
    for a week. A hole cannot have that bug.
- **THE GROOVE IS MILLED CHASSIS, NOT A BLACK WINDOW.** It was near-black in
  both themes for one pass — the rule the Shape keys follow, a separate part in
  its own material — and on a silver board that reads as a foreign object bolted
  to the panel rather than a channel cut into it. A groove exposes the SAME
  plastic, one step down and in shadow, so it stays in the chassis's family and
  inverts with it.

  **THE MARKER IS THEN IDENTIFIED BY ITS KEYLINE, NOT ITS FILL**, and that is
  what the near-black floor was buying. Orange and mid-grey sit within about
  1.3:1 of each other by luminance: measured across the range, every orange
  tried lands between 1.0:1 and 2.6:1 on a mid-grey floor, and the only thing
  clearing 3:1 is a brown-black `#9a3412`, which is not a marker colour. So the
  boundary carries it — which is what 1.4.11 asks for, and what a part seated in
  a groove physically has. The seam clears **4.22:1** on the light floor; in
  dark mode the groove is dark enough that the fill carries it at **4.58:1** and
  the seam is decoration. Each theme has one of the two, which is the
  requirement, and the test reports both numbers so a regression says which half
  went.

  The ruler inverts with the floor — a black hairline is nothing on a dark
  groove — and both alphas are **solved for 3:1** rather than eyeballed: 0.3
  came to 1.94:1 on the pale floor.

- **THE MARKER IS THE BODY'S ONE ACCENT, and it is orange.** The whole board is
  a Braun homage and that is the family's marker colour, used on the references
  for exactly this job. It REPLACES the ink the body had been using rather than
  joining it, so §7's single-accent rule still holds: the shell's blue never
  appears on the chassis and nothing else on it is coloured. **The current
  number is not marked at all** — every printed number is the same weight and
  the same ink, and the glass over one of them is the whole emphasis. It lifted
  to full ink for one pass, which is saying it twice: once behind the thing
  already saying it.

- **The lip is short and the floor is most of the ramp.** §5c's rule from
  `.pixl-well` applies here too: whatever lies in a hole lies on its floor, and
  on this rail that is now the printed scale itself — so the fill reaches the
  floor tone by 22% and the shadows carry the depth. Stretched over the full
  width, the ground under the widest magnified number is a step darker and costs
  about 0.7 of its contrast. It was 30% while the floor was bare.
- **THE ALIGNMENT IS THE WHOLE JOB.** A native thumb's centre travels
  `trackLength - thumbLength`, so the graduations and the numbers are both inset
  by half a marker. It came apart twice in one sitting: the handle shrank from
  26px to 14px and the token was left behind, and the input carried the strip's
  inset a second time on top of the strip's own. Both are invisible mid-scale
  and wrong at the ends.
- **The marker's size is two tokens and its travel is a third, scoped to the
  RAIL rather than `:root`.** The ruler and the numbers are the input's
  SIBLINGS and inset themselves by half of it, so the value has to resolve on an
  ancestor of all three — and the two orientations need different numbers, which
  is exactly what a global would not give them. The test asserts the tokens are
  what the marker is actually drawn at: a pseudo-element has no box to query, so
  comparing the ruler against a travel computed from the token would move both
  together and see nothing.

- **UP IS MORE, and that takes two declarations.** `appearance:
slider-vertical` was removed from Chrome in 121, so a vertical range is turned
  with `writing-mode` — and `writing-mode` alone puts the MINIMUM at the top.
  `direction: rtl` is what makes it a thermometer rather than one running
  backwards.
- **The ruler marks the fourteen real stops**, not a decorative pitch: the scale
  is stepped, and an even dense ruler would claim continuous values the control
  does not have.
- **The stacking order is declared, not inherited from the source.** The input
  is absolute at `z-index: 1` and the marker's lane at `2`, over a groove that
  paints in normal flow — so the scale printed on the floor is under the glass
  that magnifies it and the whole rail is grabbable, whatever order the elements
  happen to be written in.
- **On the phone it lies down, and it is the build that DIVERGES.** The filter
  sheet has no gutter to stand a rail in, so the same control is built
  horizontally there, and only one of the two is ever mounted. It already
  printed **every other number** — fourteen fit up 600px of rail and collide on
  300px of phone, where `104112120` ran together as one word.

  **It also keeps the outboard numbers and the slim pointer**, which is a
  measurement rather than an oversight: a magnifier has to sit BETWEEN the
  numbers either side of the one it reads, and the frame is ~44px against
  printed stops ~40px apart on a 390px sheet — the ring would land across its
  own neighbours. The rail's stops are ~49px apart, which is where the whole
  construction becomes possible. The sheet's section label carries the exact
  value instead, which is the readout the rail does not need.

**Padding and Transform were removed with the rebuild.** Neither had a surface
whose job it shared: they change how an icon is drawn, so they belonged on the
body, and the body had already earned back its space by giving colour a home
and handing Shape a row of caps in the same pad. The engine keeps both operations — the
composer still flips, rotates and pads — so restoring them is a UI decision,
not a rewrite. See @docs/BACKLOG.md §D.

**NOTHING ON THE BODY IS BLUE.** The chassis repoints the shell's tokens so its
ink reads on plastic, and for one iteration that included repointing `--accent`
to a second blue — which put a different blue on the size slider, the active
tick and the focus rings from the one every other page uses. **On the chassis
the accent is INK**: near-black on silver, white on charcoal. It is the rule the
composer's own saturation slider has always followed as `accent-white`.

The repointing lives on `.pixl-pad`, not on an ancestor, because the same
controls are mounted twice — the board's left column and the mobile filter sheet
— and only one of those has a chassis ancestor. Repointing at the board is not
an option either: the screens are descendants of it, and that paints the icon
grid's own text white on near-white, in the one place the product is read.

**Shape — A THUMBWHEEL SWITCH, MOUNTED THROUGH THE CASE (2026-08-30).** A barrel
with the three values printed on it, read through a WINDOW at one end and turned
by the knurled GRIP at the other, in two cut-outs with a strip of case between
them. It spans the column's full width, in no pad of its own — see the sidebar
note above. Selection is simply what the window is showing.

**It took three tries to become one object.** Three transport caps said nothing
about which was on until you compared the depth of their faces. A mode list
beside a separate ribbed wheel was a control next to a *picture* of a control —
the wheel turned and the list did not. Printing the values on the drum makes the
thing you turn and the thing you read the same part, which is what a
three-position selector with its values written on it has always been.

**SQUARE IS PRINTED IN THE MIDDLE — Inset, Square, Round (2026-08-30).** Not the
engine's order: `CELL_STYLES` is `solid` / `gap` / `dots` because that is the
data, and this is where a value sits on a **drum**. A three-position wheel
resting at one end can only be turned one way, and the value you start on is the
one with nothing above it; in the middle both neighbours are half in the window
before you touch it, which is also what says there is more surface to turn to.

The DOM order is the printed order, so ArrowDown reaches the value printed
**below** the live one — a group whose reading order and moving order disagree
is one where the arrow skips past what you can see. The mapping is checked at
module load, the way the registry checks its names: add a fourth cell style and
the drum would otherwise simply never print it, with every test that walks the
wheel still passing on the three it knows about.

**THE MARK STOPPED MOVING, AND THEN IT WENT.** On a list the accent dash travels
to whichever row is live; on a drum it cannot, which is the difference between
reading a list and reading a dial. It was fixed to the paper, then printed on
the case, and then removed altogether — because it was never what carried the
selection. **What is live is what is turned to the FRONT:** square on, centred
across the opening, in the lit middle of the window, with its neighbours clipped
and curving out of it either side. A mark beside that is a second thing saying
the first thing.

That also leaves the size rail's marker as the **one** accent on the chassis,
which is §7 tightened rather than broken — a second orange two pads above it was
competing with exactly what that mark exists to mean.

**And the value is centred because the mark is gone.** It was indented 1.75rem
to clear a mark lying on the paper, then 0.6rem when the mark moved out onto the
case. Across the middle of the opening is also what says the live value is the
one turned square to you; off to one side it reads as a list item that happens
to be visible.

**THE PAPER LIES AT THE BOTTOM OF A HOLE, UNDER GLASS (2026-08-30).** Each
opening is a cut through the panel with real WALLS — 4px of chassis running the
`--cut-shade` → `--cut-lip` ramp, the `.pixl-mini` construction at a control's
scale — and the drum's surface sits a wall's width below the case. That ring is
what makes it read as sunken: it was a rectangle with inset shadows on it for a
pass, and **a shadow painted onto the drum darkens the drum**. A recess is read
from the material AROUND the opening, which is the lesson the mini screen paid
for twice.

**The cover's reflection has a HARD EDGE**, and that is the whole of what says
there is glass over the opening. A soft wash is a wash; a sheet of glass
reflects the room in a shape with a boundary. It runs the upper-left diagonal
and stops clear of the live value, since the point of a window is to read
through it. A test walks the layers **one at a time** — flattening the whole
background stack found a "hard edge" between the last stop of one gradient and
the first of the next, and passed with the cover mutated to a plain ramp.

**The strip of case between the two cuts out-measures the walls either side of
it.** That is the rule rather than a pixel count: once each opening grew its own
wall, a gap no wider than those walls reads as a third wall — which is the "one
slot with a line down it" the gap exists to prevent.

**THE PAPER IS SMOOTH, AND IT BELONGS TO THE WINDOW.** Each face carried its own
shaded plastic for two passes — ribbed, then smooth — and both are the same
mistake: three panels each running the same crown-to-foot ramp put a **bump at
every join**, so the drum read as a stack of facets. Real paper on a real drum
gives you nothing to see, so the only thing that can tell you it is moving is
the printing. The window paints one cylinder; a face carries its word and
nothing else. (That also retired the blank filler faces, which existed to cover
the barrel where no value was printed.)

**ONE INK FOR EVERY FACE, and the contrast bar is what proved it.** It ran as
two — a held-back ink for the values turning away — and that could not be made
to work: at the paper's shaded end even a **fully opaque** held-back ink came to
4.47:1, so no alpha cleared AA. The bar was telling the truth about the design.
Printing does not get fainter as a drum turns; the **surface** goes into shadow
and takes the printing with it, which is what the glass over the opening already
does. One near-black ink measures 7.1:1 at the paper's darkest and 16.5:1 at its
brightest in light mode.

**AND BOTH TURN OVER WITH THE CASE (2026-08-30).** The barrel was a pale silver
drum in both themes, filed under §2's *separate parts keep their own material*
beside `.pixl-key`'s soft-touch cap. That is the wrong shelf: a key IS a
separate part, and a thumbwheel is moulded through the case in the same shot a
knob is. So the plastic follows the chassis — silver on the silver board,
charcoal on the charcoal one — and the printing goes the other way, because ink
lies ON a surface.

**The dark ink's ceiling is solved, not picked.** The crown is the brightest
thing the printing has to clear, and against the `#6a6f79` first tried a
near-white came to **4.21:1**. `--drum-hi` is `#61666e` for that reason.

**The contrast suite cannot catch this on its own**, which is why a separate
test walks both themes: a constant pale drum with a constant dark ink clears AA
in both and is still wrong. What that test holds is the *relationship* — in each
theme the ink sits on the far side of the mid point from the plastic under it.

**DRAG UP GOES FORWARD.** The values are on the surface, so pushing it up brings
the one BELOW into the window — which means index order runs DOWN the drum. It
shipped inverted for a pass, with index 1 above index 0, and the reel scrolled
backwards under the finger. The drag does not wrap: a drum with three detents has
two ends and you can feel them. Arrow keys keep the APG's wrapping, because there
the affordance is a radio group.

**Only the faces the window is showing can be clicked**, and the rest are round
the back. That is the control working rather than a limitation to route around:
you reach a far value by turning to it, or with the keyboard.

**Its faces follow the finger.** The value steps in three detents, but the barrel
is turned to where the pointer is while you drag, with no clock in between to be
wrong about, and settles onto the detent when you let go. Same rule, and the same
measured reason, as the size rail's marker.

**AND THE GESTURE HAS TO BE CLAIMED, IN THREE PLACES.** This is the only drag
surface on the board with a WORD under the pointer, and a press on text is a
**text selection** before it is anything else — after which the browser offers
to drag the selection, so the control appears to come away from the panel
instead of rolling. `touch-action: none` was here; `user-select: none` and the
native element drag were not, and the composer's slide-to-clear groove has
carried both since it was built. The third guard is in the component: a `click`
arriving at the end of a real drag is not a choice, so it is swallowed.

**The property is what a test can hold, and it is read off the FACE.** The
rendered symptom needs a real pointer — synthetic input selects nothing in
either engine, so "did it select" passes with the fix removed. Reading the face
rather than the housing is what makes the assertion bite, since a rule landing
on the wrong element is the failure this stylesheet has now shipped three times
(§5c).

**THE GRIP'S RIBS ARE REAL PANELS ON A CYLINDER**, not a repeating gradient, and
that is the whole of why it reads as round: a gradient spaces its stops evenly
however many you write, and an evenly banded rectangle is exactly what a cylinder
is not — the bands have to crowd together as the surface turns away. Perspective
does that on its own and nothing else does it at all. Thirty ribs at 12° is one
full turn, so the barrel never runs out of surface.

**CSS 3D RATHER THAN R3F, and there are two reasons — the second decisive.**
The first is the window: a mesh renders form and never state, and the DOM keeps
the text and the whole accessibility tree (@docs/TECH-STACK.md). A drum whose
surface IS its text would have to bake the radio group's own labels into a
texture. The grip carries nothing, so that argument alone would leave it open.

The second closes it: **the gallery deliberately does not ship three.** §6
measured it — `/` loads 539KB of JS and `/create` 1419KB, of which 861KB is
three — and that is exactly why the body's colour knobs are the CSS build on this
route. Adding ~600KB to the public page for a thumbwheel's shading is the trade
that note exists to refuse. The CSS build is not an approximation here anyway:
the foreshortening is true perspective, which is the cue that was missing when
the grip was a gradient.

**The words reversed the rule the keys were held to.** That rule — *a shape
control whose values are shapes has no business spelling them out* — was written
about a KEY: a play button does not say "play", and a cap has one glyph's worth
of room to say anything at all. A drum is a printed scale, and a scale names its
values. **The cost is real:** the 2×2 glyph patches were drawn by the engine's
own `cellNode`, so they could never go stale against a geometry change, and a
word can. The tooltip carries the shape's behaviour now, and nothing checks it
against the engine.

**Printed, not displayed.** The reference's mode panel is a lit segment readout
inside a screen; this is ink on a moulded barrel, so it takes the DATA face and
`--engrave` like every other legend on this board. The pixel face here would be
a display drawn on plastic. The capitals are `text-transform`, so the accessible
name stays "Square".

**Category chips — COLOUR IS AN INDEX, NOT AN ACCENT.** The fourteen `--cat-*` /
`--cat-*-ink` pairs followed the taxonomy to the chips. Each chip wears its own
tint whether or not it is chosen, so the row is a legend you learn once and no
tint ever means *this one* — which is what lets seven colours coexist with §7's
single-accent rule.

**Selection is carried by MASS**: an unselected chip is a printed label, a
selected one sits on a filled capsule in its tint. Same hue, different weight.

**THE CHIPS HAVE NO OUTLINE AT ALL (2026-09-04).** Seven outlined capsules read
as seven BUTTONS sitting on the display, which is the shape of hardware and the
one thing a control drawn on glass must not claim. Removing them made selection
STRONGER rather than weaker: the travelling fill is now the only box in the row,
so the single thing that means *chosen* is also the single thing enclosed.

**The live chip is marked with the set's own `play` icon.** It is the instinct
the search field already had — it renders `getIcon("search")` rather than
borrowing somebody else's magnifier — applied to the chips: cells remapped to
`currentColor`, so one drawing serves seven categories and inherits `--cat-ink`
from whichever chip it sits in. No hex reaches a component.

- **On the LIVE chip only.** On all seven it is a bullet; on one it is a
  POINTER, which is what a right-facing triangle beside a word has always been.
- **Rendered on all seven and revealed on one.** Mounting it only on the live
  chip changes that chip's WIDTH the moment it becomes live, so every chip to
  its right shifts and the travelling fill ends up measuring a box that moves
  while it moves toward it. Reserving the space costs 16px a chip and buys a row
  that never reflows; the labels then sit on a marker column, which is what an
  index looks like anyway. It fades on the capsule's own clock, so the mark and
  the fill arrive together rather than as two events.
- **`--cat-ink`, not `--cat`.** The tint is a ground colour, pale by
  construction so a label can sit on it and clear AA; at this size it is nearly
  invisible on a near-white screen. The ink is the same category colour with
  nothing held back. Measured 6.47:1 light and 7.93:1 dark, worst case.
- **HOVER DRAWS NO BOX; it previews the mark instead.** A hover wash was 87% of
  the way to selected (1.14:1 against the selected fill, where the fill itself
  was 1.18:1 to 1.31:1 against the screen), and it also EXPOSED the reserve:
  while nothing is painted the reserved space is invisible and the labels simply
  sit on a marker column, but paint a background behind one and it becomes a
  hole with the label pushed off to the right. Hovering now shows the pointer
  held back where it would land. The one thing the reserve was costing is the
  thing it shows.
- **It was a plain 8px square for one pass** — a literal cell, on the argument
  that a square is what every icon is MADE of. True, and the duller mark: a
  glyph is what the set actually IS.

**This replaced a keyline that could not be made to work.** The ring was the ink
held back, because the tints are too pale to draw a 1px line with on a near-white
screen — and even raised to a solved-for-3:1 per-theme token, it was still seven
boxes. `--chip-line` went with it: a token kept for a consumer that does not
exist is worse than a deleted one (§2).

**THE FILL TRAVELS, as one capsule behind the row (2026-09-04).** The board's
other tablist — the detail shelf's format tabs — already slides, so one device
was speaking two selection languages. The chips cannot borrow that build as-is,
because a travelling *accent bar* would be a second accent and §7 forbids it. A
travelling **fill** breaks neither rule: it wears the live category's own tint,
so colour still indexes and selection is still mass.

- **The chip paints no background of its own.** Two fills would mean the capsule
  slides between chips that are already filled, and the travel is invisible.
  Border and ink carry the state on their own for the frame before the capsule
  is measured.
- **A transition, never a keyframe.** A held arrow key on an
  automatic-activation tablist fires every 30-90ms, so the one thing that must
  not happen is a restart. A transition retargets; it is strictly calmer under
  key repeat than the seven overlapping colour fades it replaced.
- **It tweens `width`, and `scaleX` was tried first and cannot draw the shape.**
  Scaling a 1px base is the compositor-friendly build, and `border-radius`
  resolves against the UNSCALED box — so the horizontal radius clamps to 0.5px
  and the scale stretches it into an **ellipse with pointed ends**. The cost of
  the fix is bounded: the capsule is absolutely positioned and out of flow, so a
  width tween relayouts itself and nothing else.
  **The shape cannot be read back from CSS**, which is why the test asserts the
  SCALE instead: a 1px element at `scaleX(132)` still reports
  `border-top-left-radius: 999px`, because the computed value is the specified
  one. A radius assertion there passes against the exact bug it names.
- **The tint is set INSTANTLY and only the transform animates.** Tweening
  `background-color` between two tints paints unmeasured intermediate colours
  under a label, and these tints were measured for AA. Every frame now shows one
  of the seven measured tints.
- Same measure-then-tween mechanism as `.pixl-format-rule`, first write with the
  transition suspended, or it grows out of the row's left edge on every mount.

**MASS HAD TO ACTUALLY CARRY IT, and it was not.** Measured before the rebuild:
selected fill against the screen **1.18:1** (All) to 1.31:1, and hover fill
against *selected* fill **1.14:1** — so the delta carrying HOVER was nearly the
one carrying SELECTION, and hovering any chip while All was selected gave you
two filled chips with the wrong one louder. Three fixes, none of them an accent:
hover dropped to a 30% wash, the selected chip took `font-weight: 700`, and
`--cat-all` was re-stepped off `#ececee`, which had made the DEFAULT selection
the only grey object in a coloured row — it read as *disabled*, on every first
visit.

**The keyline weight is a per-theme token, solved rather than picked.**
`--chip-line` is 70% light and 55% dark: one value cannot serve both, since a
dark ink over a near-white screen needs more of itself than a light ink over a
near-black one. 21 of 28 border states had measured under 3:1, bottoming out at
1.64:1. All 28 now clear it, minimum 3.62.

**The row says it continues.** At 390px it holds 625px of chips in a 318px box
with scrollbars suppressed, and the cut landed 0.8px past a chip's edge — three
of seven categories off-screen behind what read as a complete four-chip row. A
mask fades the last 2rem, which is the display's own way of saying there is
more: nothing is drawn, something is unlit. Chips also take a 44px minimum on a
coarse pointer, since 33px was the one place the row both scrolled and was
tapped.

The tints were **measured, not eyeballed**: a 14px label clears AA on its own
chip in both themes, filled and unfilled, and a test holds it there — one axe
cannot run over a gradient, and one it *can* run turned out to be reading the
theme mid-transition, at a colour present in neither palette.

The key's face and wall derive from `--key-cap` where they are used rather than
being tokenised, since every step of both is a mix of it; only `--engrave` is
global, because it is the one part that is light rather than material.

**The labels turn with the buttons at `lg`**, printed top-to-bottom via
`writing-mode: vertical-rl` — a writing mode, not a transform, so the text
still lays out and reaches the accessibility tree as ordinary text. It costs
height (seven turned labels need ~600px) and gives back width (the column is
~56px instead of ~176px).

**The sheet carries no border.** A rule around the grid drew a box around the
icons, and the icons should read as the page's content rather than as a
container's contents.

**The grid's wave is DEBOUNCED by 80ms (2026-09-04).** The chips are an
automatic-activation tablist, so holding an arrow key changes category every
30-90ms — and the wave takes 676ms to land its last item. It restarted roughly
seven times per held key, flashing the grid empty on each restart and finishing
none of them. The FILTER is still instant; only the animation waits for the
category to settle, so a fast scrub swaps with no animation at all and one wave
lands when you stop.

**THE WAVE HAS ITS OWN CLOCK *AND* ITS OWN CURVE, both outside §5b's scale.**
This is the THIRD documented exemption from the motion scale, and it holds the
same one the other two do: those clocks govern surfaces opening and closing, and
this is the screen redrawing its whole picture.

`--duration-wave` is **760ms** against `--duration-slow`'s 400, and the offset is
**28ms** rather than 12. The stagger cap moves with the duration and is still
solved rather than picked — 476ms / 28ms is 17 — so the set growing to 200 icons
cannot turn this into a multi-second sweep.

**AND `--ease-wave` IS THE HALF THE DURATION COULD NOT BUY (2026-09-05).** It
was slowed once to 560ms and read as barely different, because the duration was
never what made it feel fast: `--ease-smooth-out` is
`cubic-bezier(0.22, 1, 0.36, 1)`, which reaches y=1 almost immediately and
covers about 80% of its distance in the first third. At any duration the visible
movement is crammed into the opening ~190ms and the rest is a tail nobody
perceives — so raising the clock lengthened the tail and changed almost nothing.
`cubic-bezier(0.4, 0.05, 0.2, 1)` spends the time it is given: a gentler start,
the travel across the middle, a soft settle. **The lesson generalises — when a
motion reads as too fast at a long duration, check the curve before the
number.**

**The grid arrives as a WAVE on a category switch.** Each icon enters on its own
rise-and-scale, offset per item, on the clock and curve above. (This paragraph
carried the original 400ms / 12ms / cap-40 numbers until 2026-09-05, three
changes after they stopped being true — a second description of one rule is a
second thing to keep in step, so it now points at the one above rather than
restating it.)

**Shape** sets how each filled cell is drawn, for every icon at once. The engine
keeps its own words — `cells`, `CellStyle`, `solid` / `gap` / `dots` — and the
UI reads Square / Inset / Round; the map between them lives in one file.

- **Square** (default, `solid`) fills the cell edge to edge, and horizontal runs
  merge into one rect — which is what removes the hairline seam anti-aliasing leaves
  between abutting rects.
- **Inset** (`gap`) insets each cell by 0.5 units on every side, so a node is 3 units
  across and two neighbours sit a full unit apart. The lattice stroke is 0.25,
  so the gap is four times the grid line: the grid reads as the space between
  nodes rather than as a line hiding inside them.
- **Round** (`dots`) keeps that inset and makes the node a circle of the same
  3-unit diameter. Same size as Inset deliberately — a node that changed size when it
  changed shape would make the two modes read as two zoom levels of the icon
  instead of two treatments of one drawing.

Inset and Round **never merge runs**; merging is what would weld neighbours back
together and erase the gap being asked for.

Below `lg` the Display controls — Colour, Size and Shape — move into a **bottom
sheet**, opened by a square icon button sitting **inline with the search
field**. Search and the category chips stay on the page, the chip row scrolling
rather than hiding. The button carries an accent dot when anything the sheet
ITSELF holds is off its default — Colour, Size and Shape, and nothing else. It reported
the category filter once, and then the cell style, each time going on lighting
for a control the sheet no longer held; the rule that survives every layout
change is that the dot answers for what is behind the button and never for what
is already in view. The sheet has a **Reset** and an **Apply** in a footer below
its scroll area, so the actions stay reachable however long the controls get.
Both commit and close.

Reference point for the gallery's control surface is **Nucleo's icon panel**,
but applied to the whole gallery rather than one icon at a time. Stroke and
Cap/Join are deliberately excluded — pixel cells have no strokes — and there is
no Bg control: icon backgrounds are **always transparent**.

**Icon card** — `--grid-card` fill on the screen's `--grid-bg`, `--radius-md`,
hover lift + border. **Two tokens, one step apart, and the step is the point:**
the card was `--surface` on the screen's own near-white and measured 1.005:1
against it — a tile you could not see was there, so the grid read as loose icons
on a sheet. #ffffff and #f6f6f6 in light, the same relationship in dark. The
screen's sage went with them: this is the big *lit* display, and the segment
panel's tint belongs to the two small screens that actually are one. Selected
→ `--accent` ring. **Always square**, on every device, so the grid reads as an
even lattice. The name is therefore always an **overlay** revealed on hover or
keyboard focus — a name sitting in flow is what stretches a card into a
rectangle.

**The overlay hugs the NAME, not the card**, and is allowed to overhang it. The
seat is 64px and an icon id is routinely longer: `arrow-right` came back as
`arrow-r…`, which is the one piece of information the overlay exists to give.
The grid item is lifted on hover so a later sibling cannot paint over the
overhang. On touch it is reached from the DETAIL BAR, which carries the name in
two rows below `lg`. (This said "by tapping through to the mini screen" until
2026-08-30, and there is no mini screen on touch: the whole left column is
hidden below `lg`, so the bar is the only place a name appears.)

Grid density follows the same reference: `minmax(70px)` below `lg` (4 columns
at 375px) and `minmax(92px)` above.

**Theme** — **Light / Dark**, two buttons in the top nav. There is no System
button, but system is the default: until a choice is made no `data-theme` is
set and the media query decides, so a first visit already matches the OS. The
buttons highlight the *resolved* theme. Dark mode is a redefinition of the
shell tokens, not a parallel stylesheet. (Superseded the earlier gallery-only
Light/Dark preview toggle.)

**Icon detail — the MINI SCREEN and the DETAIL BAR (2026-08-29).** Split in two,
because they are two different parts of a device.

**The glass is an LCD, not the icon grid's screen (2026-08-29).** The big screen
is a lit display; this is a segment panel, so it takes the sage-grey every
device that ever had one carries, with a weak diagonal glass wash over it. **The
composer's screen is this same panel** — see the toy anatomy below. It is
a different part of the object, so it takes its own `--lcd-*` tokens rather than
a tint of `--screen` — and it inverts with the theme, because the art on it does
not: the gallery's colour is white in dark mode, and white on a *lit* sage panel
is 2.5:1. Unlit, it is 8.2:1. Black on the lit panel is 9:1. The lattice reads
off `--color-border`, which is repointed on the glass for the same reason — the
shell's near-white hairline is invisible on sage.

**The mini screen is a SCREEN and nothing else, and it is SET INTO the
chassis.** A black bezel, **even on all four sides**, with the glass recessed
into it. Nothing is printed on it.

It carried the name, the tags, four export caps and an SVG disclosure for one
iteration, and that is what made the board's left column fat: a four-tag icon
added ~110px of text to a panel 264px wide and the whole side of the device grew
to hold it.

**THE BEZEL PRINTS NOTHING, AND THE BAND WENT WITH THE PRINTING
(2026-09-03).** It had a **thicker bottom band** carrying a moulded legend, and
three different things were put on it in one day. Each was argued from the
object, each was built, and each was worse on the board than in the argument:

- **A maker credit** (`by lovvfat`) was a second NAME on a column that already
  carries the brand twice: at the left of this same band, and cut into the case
  a few inches below.
- **A power lamp** was a component with nothing to do. A real bezel does carry
  an indicator, and this board's own rule is what broke it: an idle screen here
  is a **lit** screen, so the lamp could only ever be on, and something that
  cannot change state is a decoration in a component's clothes. It was also a
  lit green dot in a column whose whole job is to be quiet, and a *second*
  colour on a board whose one accent is the rail's marker (§7).
- **The panel's own resolution** (`11 × 11`, read from `GRID_SIZE`) was true,
  specific to this part, and not a name — it passed every test the first two
  failed, and it was still one more thing to read.

**THE BAND HAD NO REASON TO SURVIVE THE PRINTING.** It was never decoration hung
on the frame: it was 32px of bezel that existed BECAUSE something was printed on
it, which is why the module carried no bottom padding of its own. With nothing
to carry, a fat chin under a clean screen is the same unfinished side the
board's badge exists to answer. So the bezel is even on four sides and the 32px
goes back to the glass, which also lowers the module's floor from 3.5rem of
fixed furniture to 2.125rem.

**The lesson is worth more than the three attempts.** All three were reasonable
readings of a real device, and the thing they missed is that this bezel is two
inches from a badge, a legend-free thumbwheel and a screen full of art. A face
this small does not have room to *also* say something.

Two tests hold it: the module's whole text content is empty, read as text rather
than as the absence of any one class — each attempt brought its own class, and a
test naming them would pass against the fourth — and the four bezel gaps are
measured as geometry, since a margin or a leftover band would put the asymmetry
back while a computed `padding` still read 10px on every side.

**PIXEL MATERIALIZE — the icon ASSEMBLES (2026-08-30).** Every filled cell
lights on its own delay scattered across the window, with transient static
inside the icon's own bounds peaking about two thirds through and then dying
off. That last part is what makes it read as *condensing* rather than as fading
in.

- **It is a DISPLAY animation, not a UI transition**, which is the only reason
  it may outrun §5b at all: those clocks govern surfaces opening and closing,
  and this is a screen drawing a picture, the same exemption the hex readout's
  segment refresh earned. **It is not a licence for any number.** The first
  build ran 880ms, longer than the filter sheet takes to cross the whole screen,
  and clicking through the grid felt like waiting. 360 of scatter plus a 170
  flicker lands at 530.
- **The cells FLICKER, they do not fade, and there is no scale pop.** A cell on
  a dot-matrix panel is a fixed aperture: it lights, it does not grow. Scaling a
  square up from 0.6 is a card entering a page, which is the register this is
  trying not to be in. What replaced it is an uneven ramp, bright then a dip
  then settling with one last stumble, run `linear` because the house curve
  covers most of its distance in the first third and flattens the dip back into
  a fade. `steps()` is worse still: a hard quantised flicker reads as a dropped
  frame rather than as a surface being driven.
- **Leaving is the same scatter reversed**, on a shorter clock (§5b). It was one
  uniform fade of the merged picture, which made deselecting a different KIND of
  event from selecting: the icon condensed cell by cell and then vanished as a
  block. It **overlaps** the next reveal rather than running before it, since
  sequential would mean waiting out a dissolve before the icon you just clicked
  began to appear.
- **The scatter is HASHED, not random.** `Math.random()` in render would give
  the server and the client different delays and this route prerenders, so it
  would be a hydration mismatch. The hash buys the better property anyway: an
  icon always assembles the same way, which reads as something about the icon.
- **It draws one node per cell while it animates, then hands back to the merged
  walk.** `layoutCells` merges horizontal runs for `solid`, and that merge is
  what removes the anti-aliasing seam between abutting rects, so the resting
  picture stays the one every other surface draws.
- **It keys on the ICON, never on the cells.** `displayCells` is rebuilt on
  every colour, shape and size change, so keying on the array re-materialised
  the whole picture on every frame of a knob drag.
- **Reduced motion needs its own rule.** The global block collapses every
  duration and leaves `animation-delay` untouched, which would degrade this into
  cells popping in one at a time with no fade at all: louder than the animation
  it was meant to suppress.

**Idle is a lit screen, not an empty box.** With nothing loaded the glass draws
the bare 11×11 grid, a pixel display that is on with nothing on it. It replaced
a faint wordmark that duplicated the legend now printed on the bezel two
centimetres below it, and that had failed AA at 1.89:1 besides.

**IT IS A DOT MATRIX RATHER THAN A LATTICE OF LINES (2026-08-30)**, because the
reveal above needed somewhere for a cell to arrive FROM. It is also the one case
this section's own argument against a ghost readout allows: the `888888` behind
the hex was rejected because a full-glyph face draws two different letterforms
on top of each other, whereas here the unlit cell is the same shape as the lit
one, so it sits underneath it and disappears.

**IT TOOK TWO PASSES TO GET INTO THE PANEL, and the second is the one that
worked.** The first removed a drop shadow, which is what a RAISED part casts —
so the display had been reading as a panel glued to the front of the device
rather than a screen fitted into a hole in it. Necessary and not sufficient: the
module is near-black, so every shadow painted ONTO it is invisible, and a recess
is read from the material AROUND the opening.

So the cut is its own element. `.pixl-mini` is now a 5px ring of chassis — the
**walls of the hole** — and `.pixl-mini-body` is the module seated in it. Under
a light from above a hole shows two walls: the upper one faces down and falls
into shadow (`--cut-shade`), the lower faces up and catches the room
(`--cut-lip`). Top dark, bottom bright, in a visible band rather than a 1px
line, because a wall has a wall's width. It is the same thing the composer's
screen gets from four real sloped walls in R3F, at 5px and in CSS.

Every shadow on the cut is `inset`, and a test asserts that: a recess casts
nothing, and the outer shadow is the exact thing that made this wrong twice.

**The module gives up height before anything scrolls.** The board is sized to
the viewport by rule, and on a short window the column cannot fit a 254px screen
plus the whole Display pad — so the picture shrinks and the controls do not. It
floors at 8rem of glass plus its fixed furniture — 2.125rem of it since the
legend band went, down from 3.5rem; past that the column scrolls.
The chain of `min-height: 0` from the column down to the glass is what carries
it, and a block anywhere in that chain simply overflows instead, which is
exactly what the first attempt did.

The bezel is near-black (`--mini-bezel`) in BOTH themes rather than `--bezel`: the toy's rim is
the chassis's own tone, and a bezel in it reads as more chassis while a
black one reads as the frame of a display. (`--mini-legend-ink` was measured at
5.6:1 on the light bezel and 6.6:1 on the dark, so one ink served both; it went
with the printing on 2026-09-03 and had no second reader.)

**The detail bar is the display's own bottom shelf, INSIDE the glass**, and it
is built in **TWO COLUMNS (2026-09-03)**:

| Column | Carries |
|---|---|
| **Identity** (13rem, fixed) | the **name**, the **tags**, the **category**, and the **Copy** split button |
| **Source** (the rest) | the **format tabs** with the **✕** at their far end, and the **source block** under them |

**The identity column reads top to bottom, and the order is the argument**:
what it is called, what it is near, which shelf it came off, and then what to
do about it. It stacked readout / tabs / source down the full width for one
pass, which left the name and the category adrift in a mostly empty line while
the source under them ran the whole board — and put the action up on the first
line beside the name, where it read as a button dropped into a row of text.

- **The name is at READOUT scale** (`--text-h3`), in the DATA face because it is
  a code identifier: the string you paste, not a title. It was `--text-ui`, the
  same size as the tabs, the menu items and every button, so the one thing the
  shelf is ABOUT was tied for quietest thing on it.
- **The tags are PRINTING, not chips.** They came off on 2026-09-03 (BACKLOG §D
  called them the weakest thing here) and came back the same day by request, in
  a quieter form than they left in: a row of tag pills under the category pill
  is several capsules saying several different kinds of thing, and only one of
  them carries a colour. **One line, clipped** — they are the variable-width
  element on this shelf, and a line that can only ever be one line tall cannot
  force the scroll they forced before.
- **The column does not stretch.** The action was pinned to its foot with
  `margin-top: auto` for one pass, so the two columns would finish level. They
  cannot: the source runs 88px as an SVG and 282px as a CSS rule, so
  bottom-aligning put a 200px hole between the category and the button on one
  tab and none at all on the next.

**The ✕ IS NOT ONE OF THE ACTIONS, and three separate things say so.** It is the
only glyph-only control on the shelf, the only rounded **rectangle** among
capsules, and it is a whole column away from the split button's chevron — which
it used to sit one 0.75rem gap from, putting *open more options* and *throw all
of this away* within a trackpad slip of each other. A shape, an absence of
words, and a distance: the distance is the one that actually prevents the
misclick.

**Copy appears TWICE, as one control in two weights.** Once at the foot of the
identity column as the filled primary, and once in the source block's top-right
corner within reach of the markup it copies. For one pass they were two
different OBJECTS — a filled capsule and a small square-cornered chip, in
different paddings and different type — which is two vocabularies for one
action. They share a class now: same shape, same type, same padding, and only
the fill differs, because only one of them is the primary. Their accessible
names still differ (`Copy SVG` and `Copy source`), or a screen-reader user has
no way to tell which one they are on.

**THE SOURCE BLOCK HUGS ITS CONTENT.** No cap and no inner scrollbar: it was
capped at 7rem with `overflow: auto`, which put a scroll region inside a shelf
that is itself inside the one scrolling thing on the page — three nested scrolls
to read twelve lines of markup. The shelf takes the height each format needs and
the **grid** gives it up, which is the trade the grid already exists to make.
Measured at 1440×900: 155px of shelf for SVG, 349px for CSS, and the board still
inside the window at every stop.

- **It breaks at the SPACES first.** `word-break: break-all` breaks inside a
  word whether or not a space was available, so every line ended mid-attribute
  (`fill="#0000` / `00"`) and the block read as a wall of characters rather than
  as markup. `overflow-wrap: anywhere` only breaks inside a token when the token
  genuinely does not fit, which here is the data URI and nothing else.
- **The phone is the one place it still scrolls.** Hugging is right on a block
  800px wide, where a data URI is a dozen lines; at 390px the same string is
  nearer thirty, and a shelf that tall would leave no screen above it to show
  the icons it is describing.

It was a strip of chassis *under* the screen for one pass, which put the readout
on the plastic and the picture it describes somewhere else. It reports what is
on the screen, so it is on the screen — flat, with a hairline and one step of
tone, because the board's rule is that depth belongs to the plastic and anything
drawn on a display is drawn.

**Its tone is `--color-surface`, not a mix of `--screen`.** The first pass mixed
6% of the text colour into the screen and landed on rgb(232,233,228), where the
muted ink measured 4.39:1 — under AA by a tenth. `--text-muted` was darkened
specifically so it clears on `--color-surface` (§2), so using that token is not a
workaround; it is the pairing the ramp was measured for.

It exists **only while an icon is loaded**. That is a real layout change, and it
costs nothing: the screen above simply gets shorter, and because the grid scrolls
inside itself nothing reflows — the scroll container just has less room. Below
`lg` the two columns simply **stack**, which is the same content in the same
order rather than a second layout.

**Neither is a dialog.** Both are parts of the board; nothing opens, so nothing
claims `aria-modal` and the cards carry no `aria-haspopup`. Two consequences:

- **Escape is read at the DOCUMENT**, from the bar — which is mounted exactly
  when something is selected, so the listener's lifetime is the state it clears.
  It has to be at the document because nothing here ever takes focus: after
  clicking a card the focus is still on the card. It steps aside for anything
  inside a real dialog, so the filter sheet still owns its own.
- **The live region is on the SCREEN, not the bar.** It has to announce
  clearing as well as loading, and the bar does not exist to announce its own
  removal.

**The SVG disclosure went with the split.** BACKLOG §D called it "a selectable
SVG field as the clipboard fallback"; Download SVG needs no clipboard API at
all, so the fallback survives in a better form and a refusal now points at it.

Contents of the glass: the icon **on** the faint unlit dot matrix — for a pixel
set the grid *is* the art, so each filled cell occupies exactly one box. Art and lattice
are drawn in a **single SVG** sharing one viewBox; layering two makes alignment
depend on two sizes agreeing, which is how they drift. No colour control — the
body owns it. **What you see is what you copy:** every export carries the
gallery's colour and cell shape.

**Composer — toy anatomy**

- *Frame*: blue gradient body, `--radius-toy`, top highlight + bottom lip.
- *Screen*: **the same LCD panel as the gallery's mini screen** (2026-08-29),
  and **recessed as real geometry**.

  It was `--screen` — the icon grid's *lit* display — which flips from
  near-white to near-black with the theme. That is a violent change for the one
  surface you are drawing on, and it made the composer's screen a different part
  from the gallery's for no reason anyone could name. Both boards now show the
  segment panel: sage when the room is lit, the same panel unlit when it is not.
  One part, one material, and `--board-line` follows `--lcd-line` so the
  gridlines invert with it — a black hairline is invisible on the unlit panel.

  The R3F well reads the colour from `--lcd` off an element inside the toy, so
  the mesh and the CSS cannot disagree about it. Four sloped walls
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
- *Knobs*: two knobs at the ends of the colour lane — and, since 2026-08-29,
  three more on the gallery's body, built from the same component. **Smooth
  moulded control knobs**, not the Etch A Sketch's ridged dials: a wide rounded
  shoulder falling to the rim, a shallow **domed** face inside it, a crisp
  moulding seam, and a small round **pip** on the shoulder for the pointer. The
  milled flutes were dropped on 2026-08-19 against a supplied reference.

  **It was a DISHED face until 2026-08-29** — the Etch A Sketch's form. The
  device this board became has plain domed caps, so the face inverted. Worth
  knowing in both directions: a bowl shadows its NEAR wall and lights the far
  one, a dome does the opposite, and getting either backwards makes a raised
  face read as a hole or a hole read as a button. This surface sat inverted for
  several passes while it *was* a dish.

  **The pip replaced a rectangular chip across the lip.** A dot has no
  orientation of its own to disagree with the angle it is reporting, and it is
  what the reference device carries.

  **The ring STANDS OFF the dial**, mirroring the reference: inner edge at 90%
  of the housing's radius against a dial reaching 78% — a 12% gap and a 10%
  band, so the scale is something the knob turns *against* rather than a painted
  edge of it. It was tightened to a 2% seam for one pass on a misread of the
  reference and had to come back.

  **The gap is a GROOVE, not a collar.** The socket showing through it is the
  well tone taken 38% toward black; at its plain value the gap came back as a
  band of light grey panel around the knob, which is the opposite of the recess
  the reference shows there.

  `inset: X%` leaves a dial of radius `(50 - X)/50` of the housing's — the
  arithmetic to redo if either number moves. The mesh canvas carries the **same**
  inset, because the camera is framed so the rim fills the canvas.

  **A smooth pale knob has no detail to hide behind**, so depth and lighting
  are load-bearing rather than taste. A face 0.075 deep tilts its normal by only
  11°, which renders as a featureless disc; it had to get about three times
  deeper before the surface described itself at all. The dome inherits that
  floor.

  **AND THE DARK DIAL IS NOT THE PALE ONE WITH A DIFFERENT `color`.**
  `meshStandardMaterial` multiplies albedo by the lighting, so the same lights
  that model a 0.738-albedo silver across 171–220 render a 0.085-albedo charcoal
  at 47–91 — *darker than the case it is meant to match*, because a lighting
  factor is never above 1. The level has to be bought back by raising both terms
  until the mid-normal lands at the albedo itself: 0.30 + 1.15·N·L against the
  pale dial's 0.48 + 0.50·N·L. Two entries in `DIALS`, not one string. The key sits
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

  **ONLY THE PIP TURNS.** The rotation used to sit on the dial itself, which
  carried the dome's baked lighting round with it — the crown highlight swung to
  the side and then underneath, so the light appeared to orbit the room while
  the knob stood still. A surface of revolution turning about its own axis does
  not change how it is lit, which is why the MESH build never showed this: it is
  a real lathe. The CSS build fakes the solid with a gradient, so it had to be
  told. Both now spin a pip-only layer.

  **AND IT DOES NOT GROW WHEN GRABBED.** A knob mounted through a panel cannot
  get bigger because you took hold of it; the `scale(1.045)` read as the control
  zooming. What is left is the seating shadow deepening, which is what a part
  pressed into its socket actually does.

  The shadow and ring stay still. Left knob wears a rainbow
  (hue) ring, right knob a black→color→white (lightness) ring. Each ring is a
  true **annulus with air between it and the dial**, so it reads as a scale the
  knob turns against rather than a painted edge of the knob.

  **THE TWO BUILDS DRIFT SILENTLY, AND THE DRIFT IS ALWAYS IN THE MATERIAL, NOT
  THE SHAPE.** Caught by eye on 2026-08-29 with three faults at once, none of
  which any test could have seen:

  - **The mesh was glossy and the CSS was matte.** `meshStandardMaterial` has a
    specular term and a CSS gradient does not, so at `roughness 0.38` the key
    returned a wet hotspot sitting on top of the shading. The mesh has to spread
    its own specular out until the two agree — 0.68, and `metalness: 0`, which
    was doing nothing at 0.02 but tinting that highlight.
  - **The mesh had no seam.** Its dome and shoulder shared a tangent, so the
    normal turned continuously across the join and the dial rendered as one
    undifferentiated bubble — while the CSS face has a 1px keyline and therefore
    always showed the concentric ring the reference knob has. Fixed with a
    `LIP_STEP`: a small vertical wall at the lip, so the two surfaces meet at an
    edge.
  - **They were drawing the object at different SIZES.** At fov 30 the rim fills
    the frame at a camera distance of 3.73; it sat at 4.15, so the dial spanned
    90% of a canvas that is inset to sit just inside the ring — and the missing
    10% showed up as a black moat the CSS build does not have.

  There are two builds — WebGL and CSS — and they must describe ONE object.
  They have drifted before (the CSS knob was a raised cap for several passes
  while the mesh was a dish), so proportions are shared by name: the CSS face
  is 76% of the dial because `FACE_RADIUS / BODY_RADIUS` is 0.76, and both
  builds sit at `inset: 6%` inside the housing so the ring's seam is one gap
  rather than two. They had drifted on that too — the canvas was at 6% while
  the CSS dial was at 10%.

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

Do: build every surface out of the toy; keep STORED pixel cells square; reuse
tokens; give every face a lit crown, a shaded foot, and a shadow onto what it
sits on.
Don't: put icon art on `--frame` — it belongs on `--screen`; bake a rounded cell
into icon data; add gradients/shadows to icon art; add a second accent.

**The category chips are an index, not a second accent.** Amended 2026-08-28.
An accent is a colour that says *this one*; the `--cat-*` tints say *which
one*, they are all present at once, they never move, and selection among them
is carried by depth rather than by colour. The rule they are actually bound by
is the one above it — they never touch icon art.

**The grain is the exception, and deliberately so.** `--grain` moved from
`.composer-scope` to `:root` on 2026-08-28 and is now shared: it is a *texture*,
not a colour, so it is not what §7 is protecting. The shell veils it with 62% of
the page colour — the shell is paper, the toy is plastic — and it stays in the
**background stack**, never an overlay, for the reason §6 already gives.

On rounding: the gallery's **Dots** mode draws circles, and that is allowed
precisely because it is drawn and not stored. The line is whether an icon
carries its own shape — it must not. One control sets the shape for the whole
set, the way one hex field sets the colour for the whole set.
