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
  four corner brackets. The count moved into a tag above the name, and that tag
  is gone too (2026-09-18, by request) — so the count is printed nowhere in the
  hero, deliberately. The Guide and Resources both still state it, from
  `icons.length`, where it is a fact in a sentence rather than a HUD readout.
- **The skeleton blocks**: dithered rectangles with `BLK 02 TITLE` tabs that
  filled column by column before each piece of content. The tabs went first,
  then the blocks.
- **INSERT COIN** and once-per-tab memory. The boot plays on every load, so a
  replay button had nothing to replay.

**Exceptions this section makes, stated:** the grid background (earned: the
subject is a lattice), four colours on one surface (scoped, and §7's single
accent still holds everywhere else). **It used to make a third — an eyebrow over
the heading — and that one is withdrawn rather than re-argued (2026-09-18).** A
kicker above a heading is banned outright, and the only thing earning the
exception was that this one carried a real count instead of a slogan. Asked to
change the words, the honest move was to delete it: any replacement phrase keeps
the exception and throws away the reason for it. The name is now the first thing
on the screen, which is what a title card is.

### The marquee: the same machine above the reading pages (2026-09-18)

**Guide, Resources and Contribute were white documents with a hairline bar on
top, one click from a full-screen neon CRT.** Two products in one site. The seam
is closed by carrying the WORLD across and not the LAYOUT: each of the three now
opens on a **masthead** cut from the hero's own glass, and the reading below it
stays on paper.

| Part | Is |
|---|---|
| Ground | the hero's `--crt`, and its cell grid at the **same 24px pitch and the same 264px major**, so a visitor arriving from the home page lands on a continuation rather than on a second grid |
| Shape | a **band**, about a third of the window. The hero is `100svh` because the hero IS the front door; a reading page that makes you scroll before you read has spent the visit on itself |
| Light | scanlines and a shade along the two long edges. **No flicker, no rolling band, no boot** — a marquee is backlit plastic, and ambient motion over the first paragraph is a defect however well it is authored |
| Motion | one thing: the **block cursor** after the title. It is what says the same machine drew this page and the home page |
| Type | the title in Press Start 2P (24 / 36 / 48px) in near-white with a cyan glow; the rail and the strapline in VT323 |
| Colour | **the wordmark is yellow, the title is not.** Yellow is the product's name and nothing else ever wears it; a page title in yellow would spend the brand colour on the word "Resources" |
| Edge | a hard 2px lit line. Nothing in this world has a soft boundary |

**THE NAV BAR IS GONE FROM EVERY ROUTE.** The rule was "a page with a hero does
not need a bar", which was true of the home page and left three pages carrying
one. It is now **every page says its own name**: the four destinations are
printed in the rail at the top of each masthead, in the same place the hero
prints them, and the live one is marked by the ink at full strength over a
two-cell rule — the rail's own hover, stuck. **The hamburger went with it**, and
that is a deletion rather than a port: the bar collapsed four links behind a
button because they shared a row with a wordmark, and the rail simply wraps.

**The body stays paper, and that is the home page's own decision applied twice.**
`/` is a near-black hero over a light gallery; these are a near-black marquee
over a light article. Long-form prose on a tube, in neon, is a worse page
however well it matches — §1's two registers survive here as marquee and manual.

**What changed below the fold, and why each was a defect rather than a taste:**

- **Cards became ROWS.** Every item on Resources and Contribute was an identical
  bordered box, which is the lazy container, and it was measured: at 1440 the
  whole of Resources lived in 736px with 704px of white beside it. Rows separate
  on a rule **made of cells** — 2px on, 2px off — because a solid line across
  fifteen rows is a fence and a 1px hairline is the generic list every site has.
  Resources then runs in **two CSS columns** (not a grid: the sections are
  unequal and columns balance them without anyone hard-coding which sits where).
- **The status pill became printing.** A tinted capsule was the one rounded
  object left on a site whose every radius is a named zero, and a badge that
  loud beside a label reads as a state you can change. It is the pixel face at
  10px now, the hero's own tag treatment.
- **The row's mark is the set's own icon** — `arrow-right`, or `external-link`
  when it leaves the site, remapped to `currentColor` the way the search field
  and the category chips already draw theirs. An icon set that borrows somebody
  else's chevron for its own pages has an argument to answer.
- **Section titles became `h2`, which puts them in the pixel face.** They were
  `h3` under a page `h1` — a skipped level, and the one register on the page
  that said nothing about what product this is. §4 scopes Press Start 2P to the
  wordmark, h1 and h2, and a rule's name is the largest thing in its section.
- **Both article pages use one layout**: the argument on the left, the thing
  itself on the right, in two BOUNDED columns. A `1fr` aside gave a 240px
  diagram a 656px column to sit in, which is the page leaving a hole rather than
  using the width.
- **The Guide's grid diagram stopped being blue.** Its safe area was filled with
  `--color-accent-subtle`, left over from the era when the shell had a blue
  accent — repointed to the ink everywhere on 2026-09-12 except here, so this
  one diagram was the last blue object on the site. It also gained an optional
  `cells` prop: the safe-area rule now shows a real icon sitting inside the
  region with its one cell of margin, which is a better argument than a second
  empty square. **The keyline is dropped in that variant**, because art running
  to the region's edge is drawn over it and a keyline you cannot see is worse
  than none.

**VT323 IS PRELOADED NOW.** It was not, because it was the home page's face
alone and preloading charged four routes for something they never drew. It is in
every masthead's rail — the first thing at the top of the page, not a sentence
three seconds into a boot — so a late-discovered face is a visible swap in the
navigation on every load. Four of five routes draw it; the fifth is the
owner-only composer.

### What moved, on 2026-09-12

| Was | Is |
|---|---|
| three colour knobs + segment readout | a saturation/lightness **field** with a hue strip |
| a thumbwheel drum printing SQUARE / INSET / ROUND | **three cells in a row**, drawn by `cellNode` |
| a 709px vertical size rail in the right gutter | the **horizontal** build, in the control column |
| a mini screen at the head of the left column | inside the **detail shelf**, at the foot of the picture |
| the board sized to the viewport, grid scrolling inside | the **page scrolls**, as a page does |

**THIS TABLE IS ONE STEP BEHIND, AND IT SAYS SO NOW (2026-09-18).** Two of its
right-hand answers were themselves replaced the next day: the "three cells in a
row" became a **dropdown**, and the horizontal rail became a **fourteen-block
meter**. The control column went with them — everything is in one **sticky bar**
now. §6 carries the current state and the full chain; this table is kept because
what it records is the *move off the chassis*, which is the decision that
mattered and is still the reason the rest of the file reads the way it does.

**The lesson is the one this file keeps relearning.** A "what moved" table is a
snapshot, and a snapshot in a document loaded as instructions goes stale
silently. Where a control's argument lives in the file that draws it, §6 now
names that file instead of restating it.

The knob colour setter was not deleted. It was saved verbatim in
`design-plans/reserved/` for the composer, and on 2026-09-19 it was **mounted
there** — three knobs and a readout on one pad, which is the surface those dials
were always moulded into. The snapshot is spent; §6 carries the build, and the
README carries what a reserved snapshot cannot protect you from: it photographs
the PARTS, so a faithful restore can still assemble the wrong object, which is
what happened on the first attempt a day earlier.

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
    --knob-hi/-mid/-lo               the dial's shoulder, crown to rim
    --knob-face-hi/-lo               its domed face, crown to foot
    --knob-mark                      the pointer pip
    --key-face/-face-2               the transport keys' cap
    --key-glyph/-glyph-on            their glyph, resting and latched
    --lcd/--lcd-2/--lcd-line         the segment panel, on BOTH boards
    --lcd-ink                        its lit segments
    --grid-bg/--grid-card            the icon grid's ground, and its tile

**SEVEN TOKENS LEFT THIS TABLE WITH THE PARTS THEY PAINTED (audited
2026-09-18), AND ALL SEVEN ARE STILL GONE (re-audited 2026-09-19).** They were
listed here for six days after the controls were replaced, which is the same
defect as a token kept for a consumer that does not exist, one level up.

**Four of them came back for a day and left again, which is the part worth
recording.** `--drum-hi/-mid/-lo` and `--drum-ink` returned on 2026-09-18 with
a category thumbwheel and went with it on 2026-09-19 when category moved back to
the dock. `--indicator` and `--strip/--strip-2` did the same round trip a day
earlier, for a milled saturation groove that three knobs replaced.
`--ruler/--ruler-lip` never came back at all.

**`--engrave` went too, and it had been dead longer than any of them.** It was
declared in all four theme blocks with no reader at `3b41020` — the drum briefly
gave it one, and removing the drum exposed it. A sweep that only looks at what a
change touched will not find a token like that; what finds it is checking every
name in both directions after every removal.

Every remaining name in this table was checked against `globals.css` in both
directions: declared, and actually read.

The `--knob-*` set stays, and it is the one worth knowing about: the gallery
stopped turning knobs, the **composer** did not.

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
    --grain: tileable fractal-noise data URI; moulded-plastic texture.
             It was `--toy-grain` and scoped to the composer; §7 records it
             moving to `:root` on 2026-08-28, and the name went with it.

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
- **THERE IS NO SIDEBAR, AND NO BOARD** (corrected 2026-09-18). This entry
  specified a 264px left column holding the mini screen, a Display pad and the
  Shape keys, on a board `height`-locked to the viewport with the icon grid as
  the only scrolling thing on the page. All three are gone: the controls are in
  a sticky bar (§6), the mini screen is in the detail shelf, and **the page
  scrolls as a page does**. `--board-gutter` went with the board — four
  consumers, all of them parts of it.
- **ONE INSET, `--pad-inline`, used by every section.** It is what replaced the
  board's gutter, and it is a different kind of thing: a **padding** rather than
  a centred max-width wrapper, so a region's ground can run edge to edge while
  its contents stay on `--measure` (76rem). The hero's first character, the
  masthead's, the search field's left edge and the grid's first tile all start
  at the same x on every route because of it.
- **Two cautions from the board are worth more than the board was**, and both
  are about values that silently never arrive:
  - **Insets are LITERAL LENGTHS, not `var(--spacing-N)`.** Tailwind v4 emits a
    `--spacing-N` variable only when some utility in the build happens to need
    that step, so `var(--spacing-5)` resolved to nothing and a whole internal
    gutter became 0.
  - **A height set on a `display: contents` element is the same class of no-op.**
    The bar's controls are named individually rather than selected as
    `.pixl-bar > *`, because the display controls are wrapped in a
    `hidden lg:contents` div whose box does not exist. This stylesheet has now
    paid for that family of bug four times; see §5c.
  - **AND A THIRD, FOUND 2026-09-19: A RESERVATION FOR A DELETED PART.**
    `--nav-h` was 73px, the height of the top nav — and the nav came off every
    route on 2026-09-18. It is read by `--board-size`, by the composer's own
    container height and by the top toast's offset, so all three went on
    reserving a band for something not in the tree. This one is the opposite
    failure from the two above: nothing silently resolves to nothing, a real
    number silently describes a part that is gone, which no computed-style check
    finds because the value is exactly what it says. What catches it is
    measuring the thing it claims to clear — the composer's scope reports
    `top: 0`. It is a **named zero** now, like the three radii.
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

> **The banner that stood here is discharged, 2026-09-18.** It read "STALE IN
> PLACES" from 2026-09-12 and listed what had been replaced — the size rail, the
> Shape thumbwheel, the three colour knobs, the board's badge — without
> replacing any of it. That is the worst state for this file to be in, because
> CLAUDE.md loads it as **instructions** at the start of every session: a
> warning tells a reader that some unnamed share of what follows is false, which
> is no more useful than the false text alone. The seven hundred lines it was
> warning about are gone; see *The sticky bar* below.
>
> **The rule this file now holds itself to.** Where a control's full argument
> lives in the file that draws it, this section states the DECISION and names
> that file rather than restating the argument. A second description of one rule
> is a second thing to keep in step, which is exactly how the section got into
> the state the banner was apologising for.
>
> Everything about the COMPOSER here is current, since the composer keeps the
> chassis and every part described in it is still built.


**~~Top nav~~ — DELETED 2026-09-18, on every route.** `SiteNav.tsx` and
`.pixl-nav-link` are gone with it. Every destination is printed in the home
page's hero and in each other page's **masthead rail** (§1), and again in the
footer, so there is nothing left for a bar to carry.

Three things it was, kept because each was learned rather than assumed:

- It was a **moulded chassis brow** between 2026-08-28 and 2026-08-29. The
  diagnosis outlived it: a surface that repoints the toy's tokens must be a
  surface the toy's controls actually stand on, and a nav is not.
- Its **wordmark was one colour**, because the `le` in `--accent` put a second
  thing claiming *this one* in a bar that already marked the active route with
  the same colour, three centimetres away. The masthead's rail keeps that rule:
  the wordmark is the brand's yellow and the live link is cyan.
- Its **active item was underscored, not coloured** — a solid two-cell rule
  under the word, which is the same block every control on this site throws.
  That mechanism moved to the rail intact.

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

**THE STICKY BAR — where every control lives (2026-09-13, rewritten here
2026-09-18).** One row, one height: **Shape, search, Size, Colour**, with the
category chips on their own row below it, on the icons they filter.

**It replaced a 264px sidebar, which replaced a moulded body.** Everything
between this paragraph and *Category chips* used to describe the body: a pad for
Colour, three H/S/L knobs over a segment readout, a Shape thumbwheel mounted
through the case, a vertical Braun tuning rail in the right gutter with a
magnifier riding on it, a mini screen at the head of the column, and the
wordmark engraved into the bottom-left corner. **None of those exist.** About
seven hundred lines of this file described them until 2026-09-18, and since
CLAUDE.md loads this file as instructions at the start of every session, that
was not stale documentation, it was wrong instructions. It is replaced rather
than annotated.

**IT STICKS, which is the one thing the board could not do.** A layout locked to
the viewport has nothing to stick to. The page scrolls now, so the controls stay
with the icons they govern. `top: -1px`, because at `top: 0` a fractional
device-pixel gap opens above the bar at some zoom levels and the grid flickers
through it.

**The split that outlived three chassis:** search and category change *which*
icons are there; colour, size and shape change *how* they are drawn. It was
argued from surfaces, glass against plastic, and it turns out to have been about
information all along, which is why it survived the board, the sidebar and the
bar. Both halves are in one bar now because there is no second surface to put
either on, and the bar keeps them on separate rows.

**ONE HEIGHT FOR EVERYTHING: 44px**, twenty-two cells, which is also the coarse
pointer minimum — so one number serves the touch target and the rhythm. They
were three different heights, each sized to its own contents under its own
caption, and the row read as four unrelated widgets that happened to be
adjacent.

**THE CAPTIONS ARE GONE** (2026-09-13, by request). COLOR / SIZE / SHAPE in the
pixel face over each control cost 18px of bar height to label three things that
say what they are by being what they are: a hex panel, a run of blocks, a word.
The one word that stayed is Size's **value**, because a number is the one thing
on that control you cannot infer by looking.

**THE SEARCH TAKES WHAT IS LEFT.** Every fixed width in the row comes out of it,
which is the right way round: a search field is legible at any width above a few
words, and a six-character readout is not legible below six characters. What
caps it is `--measure`, so the field is 1216px-bounded at 1440 and still at 1920.

**Shape is leftmost, and the seat is earned:** it is the only one of the three
whose chosen value is a **drawing**, so it reads as a mode the row is in rather
than a number the row carries.

### Shape — a dropdown (`ShapeDropdown.tsx`)

**The sixth build, and the first that is the same shape of control as the thing
beside it.** The five before it, each right about something:

1. **Three transport keys.** Mute: a row of caps says nothing about which is on
   until you compare the depth of their faces.
2. **A mode list beside a ribbed wheel.** A control next to a *picture* of a
   control — the wheel turned and the list did not.
3. **A thumbwheel with the values printed on the barrel.** One object at last,
   and it needed a chassis to be mounted through. This is the build this file
   spent four hundred lines on.
4. **Three cells in a row.** The right vocabulary; three equal boxes is a
   toolbar rather than a selector.
5. **`◀ SQUARE ▶`, a character select.** Familiar, and it puts the far value two
   presses away while showing you neither of the others.

A dropdown shows all three at once and reaches any of them in one press. It also
has room for both the name and a description, which is what builds 4 and 5 were
trading against each other.

**No glyph beside the name (by request), and the cost is worth stating because
it is the one this control keeps paying.** Each row carried a 2×2 patch drawn by
the engine's own `cellNode`, and a drawing cannot go stale against a geometry
change where a word can. `SHAPE_HINTS` now carries the behaviour alone with
nothing checking it against the engine. What it buys: at 16px a 2×2 patch of an
11×11 grid is four marks two pixels across, too small to tell Inset from Fill —
a decoration claiming to be information.

**A menu, so the arrows move the FOCUS rather than the value.** That is the
difference from every earlier build: a stepper and a radiogroup both change the
setting as you move through it, and a menu lets you look before you choose.

### Size — a fourteen-block meter (`SizeMeter.tsx`, `SizeControl.tsx`)

**16–120 in 8s, default 24**, printed as the value then the run of blocks.

**It replaced the Braun tuning scale, and the scale was not badly built:** a
milled channel with the whole scale printed on its floor, major and minor
graduations flanking every number, a magnifier riding over them enlarging the
real printing rather than drawing a second copy of it. All of it was designed
for a 700px rail standing vertically in a chassis. Lying down in a 264px column
it became a thin track wearing decoration.

**A meter is the honest shape and the arcade one.** The control has fourteen
stops so it draws fourteen stops, and nothing is printed between them because
there is nothing between them — which is what the minor graduations were always
slightly lying about. A run of filled blocks is readable at a glance in a way a
pointer on a scale is not.

**THE BLOCKS ARE ALL ONE SIZE**, and that took three shapes in two days. It was
a **wedge**, block `i` drawn one cell taller than the last, so the run climbed
and the control said "bigger" in its own shape. Two things were wrong: a
three-cell block carries a 2px keyline top and bottom, leaving two pixels of
interior, so at the bottom of the scale an on block and an off block differ by
two pixels; and the wedge said what the run already says, since height and
length were two encodings of one number and only one of them can also carry
on/off.

**THE NATIVE RANGE STILL DOES THE WORK** — transparent, covering the whole
meter, with the blocks painted under it. Drag, click, every key a range answers,
and the whole accessibility tree come free. Same split the rail made, for the
same reason: `::-webkit-slider-thumb` cannot be an arbitrary shape and a div
cannot be a slider.

**WHAT WENT WITH THE RAIL, so it is not rebuilt:** the 45ms follow bridge, the
travel clock that scaled with distance, the settle-on-release, and "the marker
is placed where the pointer is". All of them existed because a **pointer**
travels between detents and has to look like it does. A meter has no pointer. A
block is on or off, so there is nothing to animate between two stops.

**THE SCALE STILL OUTRUNS THE PICTURE.** The grid's seat is a fixed 64px, so
**48 is the largest art it can draw**, and every stop above it sets the size of
the **exported file** instead. Both halves of the travel do something; they do
different things. The region is announced (`aria-valuetext`), never drawn — one
mark unlike all the others reads as damage before it reads as information.

**The ends are not printed.** `16` and `120` sat under the meter for one pass
and were the third thing on a row that already had two: the value prints the
exact number and the run shows how far along it is, so the labels named two
stops out of fourteen and collided with the carets.

### Colour — an LCD key that opens the instrument (`ColorControl.tsx`, `ColorInstrument.tsx`)

**THE KEY IS THE SEGMENT PANEL** (2026-09-13, by request). It was a plain
outlined pill with a swatch and a number for half a day, which is what the
reference uses — and it threw away the one control on this page that already had
an established form: the sage `--lcd` panel the hex has been read out on since
2026-08-29, and which the mini screen is made of.

**It is a button that looks like a panel**, which is a real tension and the right
side of it. A display is not normally pressable; the alternative is a panel with
a separate affordance beside it, which is two objects for one control, and the
whole argument for the LCD was that a colour and its number belong to one
instrument.

**IT IS THE ONLY CONTROL IN THE BAR THAT OPENS.** A saturation field is 264px
square and the bar is 44px tall. Size is fourteen blocks and Shape is a word, so
both stand at full size; this one cannot, and that is the whole reason a popover
exists here and nowhere else.

**BEHIND IT: the field, the hue strip, the hex readout and the swatch, as one
part** — mounted in a popover on the desktop bar and **inline in a column** in
the mobile filter sheet, which is a tall narrow surface with room to spare. One
implementation, two layouts, only ever one mounted. That is what stops the two
surfaces becoming two answers to the same question.

**It replaced three knobs.** Hue, Saturation and Lightness as dials, legended H
/ S / L on the plastic, were the right control for a body that no longer exists;
a field and a strip are what a colour picker is on a page. The knob component
survives and is still built — the composer mounts it, which is the surface those
dials were always moulded into.

**Rules the readout keeps, all of them still live:**

- **No unit label.** `#` already says hex, and a display with one value on it
  does not need to be told what kind of value it is.
- **NO GHOST.** A `#888888` ran behind the live value for one pass, the way a
  real LCD shows its unlit segments. On real hardware the unlit segments are the
  *same shapes* as the lit ones, so the ghost sits inside them and disappears; a
  full-glyph face draws two different letterforms on top of each other and the
  eye reads that as flicker. Authentic is not the same as legible.
- **THE SEGMENTS REFRESH per character, not per group**, so turning lightness on
  a grey does not shake all six digits. **No stagger** — one change moves them
  all at once, and a ripple left to right on every sample is noise. **Short and
  throttled**: 180ms against a 200ms floor between retriggers, so an animation
  can never restart mid-flight. Measured: 40 changes produce 6 animations in a
  production build and 15 in a dev one; unthrottled, the same runs produce 24
  and 60.
- **The glyphs are an overlay over the input**, which paints nothing but the
  caret: an `<input>` has no per-character boxes to animate.
- **THE KNOB POSITION IS HELD, NOT DERIVED**, and this is the part a refactor
  gets wrong. The default is #000000, and every hue and every saturation of
  black is the same six characters — so a control reading its position back off
  the hex loses both axes at the exact value the gallery *starts* on.
  `GallerySettings` carries an `hsl` alongside `colorText` for that reason.

### What went with the sidebar, and is not to be rebuilt

- **The pads.** `.pixl-pad` was a panel set into the body, and the argument for
  it — *these belong together* — needs a body to be set into.
- **The board's engraved badge**, the wordmark cut into the bottom-left corner
  of the case. Five constructions were tried and the fifth was right; none of
  them survive a case. §2's fourth shelf, *a mark cut into the case has no
  colour to place at all*, is the part worth keeping and is recorded there.
- **The chassis token repointing.** `.pixl-pad` set `--color-text`,
  `--color-border` and `--color-accent` to the chassis's own ink because the
  shell's blue was unreadable on plastic. There is no plastic, the palette is
  monochrome, and the controls take the page's own tokens.
- **The mini screen's place in the column.** The screen itself is very much
  alive — see *Icon detail* below — it simply lives in the detail shelf now.

**Padding and Transform stay removed** (2026-08-28). Neither had a surface whose
job it shared. The engine keeps `applyOrientation` and `cellsToSvg`'s `padding`,
both written and tested and neither called, so restoring either control is a UI
decision rather than a rewrite. See BACKLOG §D.


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
- *Knobs*: **three, in a row on the colour pad** — H, S and L, since
  2026-09-19. They were two at the ends of a lane with saturation on a rail
  between them, and the gallery's body carried a three-knob set of its own from
  2026-08-29 until that body became a page. There is one set now, on the one
  surface with a chassis, and `@/components/Knob` is what is genuinely shared.
  **Smooth moulded control knobs**, not the Etch A Sketch's ridged dials: a wide rounded
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

- *The colour instrument* — **ONE PAD, A READOUT AND THREE KNOBS** (2026-09-19).
  A `.pixl-pad` set into the case, spanning the drawing area: across the top a
  **swatch** and a **segment readout** printing the live hex, and under them
  **H, S and L on three identical dials**, legended on the plastic. **No preset
  swatches** — they duplicate controls the knobs already cover.
  - **IT TOOK TWO GOES, AND THE FIRST ONE IS THE LESSON.** On 2026-09-18 the
    same salvage was rebuilt as a LANE: a knob hung off each end, with the
    readout and a milled saturation groove between them. Every part of that was
    faithfully recovered and the assembly was wrong — four fittings at four
    widths on three constructions, which is exactly what a pad exists to
    prevent. `design-plans/reserved/` had photographed the parts and not the
    object, and a reserved snapshot cannot warn you about the thing it does not
    contain.
  - **THREE KNOBS, NOT TWO AND A SLIDER.** The old board ran saturation on a
    rail because the rail spanned the whole lane and had a board's width to live
    in. On one pad there is no lane to span, so a slider between two dials is
    the single control that did not get to be hardware, and it reads as exactly
    that. Three of the same object is also the truer reading of the colour: H, S
    and L are three axes of ONE thing, not two gestures and a setting.
  - **The pad is the claim that they are one instrument.** A pad says *these
    belong together* (§5c), and it is worth saying once on this board: the tool
    columns are sets of peers and the drum is a single control. Without it the
    hex reads as a field that happens to sit above some dials.
    `.pixl-pad` had been stripped to a bare radius when the gallery went pixel
    chrome — correctly, since a pad needs a case to be set into — so the recess
    comes back **scoped under `.composer-scope`**, where the case exists.
  - **So `.pixl-lcd`, `.pixl-swatch` and `.pixl-pad` are each drawn twice on
    this site, and that is the two registers working.** The gallery's colour key
    is FLAT — a 2px keyline, a bitten corner, a hard offset block — because it
    is drawn on a page. The composer's is MOULDED — a rounded recess with a cut,
    a lit lip and two uneven side walls — because it is a hole in plastic. The
    scoping is load-bearing rather than tidy: unscoped, these would repaint the
    gallery's key, which is a collision in a flat global stylesheet.
  - **Radii are explicit, not `--radius-sm` / `--radius-md`.** Both tokens
    became named zeros when the gallery went pixel chrome, so inheriting them
    gave the toy square panels on a board whose every other part is rounded.
    Zero corners are a decision about a PAGE.
  - **Each ring previews its own AXIS, built from the CURRENT colour**, so a
    ring never shows a colour you cannot reach from where you are. Saturation's
    is the one exception worth knowing: it is drawn at a FIXED 50% lightness,
    because a ring built at the live lightness is black on black and white on
    white — honest and useless, since the board starts on #000000 and the knob
    would ship with a dead scale. That rule is what the milled groove's printed
    floor was also keeping, and it is the half of the groove that survives.
  - **`--knob-size` IS DECLARED BESIDE `--toy-chrome`, and must stay there.**
    A dial on this route is not only a size, it is height taken off the drawing
    surface: `--board-size` subtracts `--toy-chrome` from the viewport, and the
    instrument is the tallest thing in that budget. Every tier restates both.
    Move one alone and the board either overflows the window or leaves a band of
    empty frame under itself, and neither failure says which value was wrong.
- *~~Category — a thumbwheel mounted through the case~~* — **BUILT
  2026-09-18, REMOVED 2026-09-19 by request.** Category is a `<select>` in the
  dock again, beside Name and Tags. `CategoryDrum.tsx`, the `.pixl-thumb*` /
  `.pixl-drum*` rules and the four `--drum-*` tokens are all gone with it.

  **The rule it was built on was "THE DOCK HOLDS WHAT YOU TYPE; THE BOARD HOLDS
  WHAT YOU TURN", and that rule is WITHDRAWN.** It is a statement about the
  SHAPE of a control, and shape is the thing that should follow from the
  grouping rather than decide it. The line that replaces it is about WHEN you
  reach for something:

  > **The board holds what you touch WHILE DRAWING. The dock holds what you say
  > about the drawing when it is done.**

  Colour is the whole of the first — it changes between one stroke and the next,
  which is why the hex readout stays on the board with the instrument that
  produces it. Name, category and tags are the second, and they are read
  together, in one place, top to bottom.

  **What the old rule cost, measured:** a whole board row, and a 482px barrel
  printing one word with the next value half-cut along the bottom edge of its
  window. It also split metadata across two surfaces, which was flagged as its
  one real cost when it was built and turned out to be the whole story.

  **What is worth keeping from the attempt**, since neither claim was wrong on
  its own: a thumbwheel IS the right hardware for a closed set of named values,
  and the gallery's Shape drum did recover whole and carry six faces at
  `--i * 30deg` without complaint. It had no argument for being on THIS board.
  Recovered from `3b41020^` if it is ever wanted again.
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
