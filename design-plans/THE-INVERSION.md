# THE INVERSION — planned 2026-09-12

**The gallery stops being the board. The composer becomes it.**

This reverses DESIGN.md §1, which is that document's central thesis and was
itself a deliberate replacement of the two-register design being restored here.
Owner's call, taken with the trade named below.

---

## The argument this overturns, recorded once

§1 abandoned two registers because *"the gallery looked like every other icon
site, and the thing that makes this project this project was hidden behind an
owner-only route the public can never reach."*

That objection does not go away. CLAUDE.md rule 1 keeps `/create` owner-only in
v1 and BACKLOG §H makes public contribution a later phase, so after this change
the board is visible to exactly one person.

**The answer chosen: the gallery keeps its personality without the chassis.**
It keeps the real hardware controls, the pixel face, the dot matrix, Pixel
Materialize and the category tint index, and it gains an ARCADE register of its
own. §1's objection is answered by the page still being unmistakably this
product, rather than by the page being a moulded object.

---

## THE GALLERY — plain page, real hardware, arcade register

### Goes
- `.pixl-board` and every chassis gradient, the grain, the moulded gutter.
- The `--frame-*`, `--bezel`, `--well-*`, `--cut-*` construction on this route.
- The board's engraved **badge** (it is a mark cut into a case; there is no case).
- The three-part row, the `lg` chassis reveal, and with it BOTH findings in
  `board-breakpoint-density-cliff.md` and most of `grid-idle-capacity.md`.
  The 1023→1024 density cliff cannot exist without a chassis to reveal.

### Stays, as free-standing objects on a plain page
- **The three colour knobs** (H / S / L) — `ColorKnobs`, `Knob`.
- **The size rail** — `SizeScale`. Open: it is 16-120 printed on a milled
  channel. Without a chassis there is nothing to mill it into. See Open §1.
- **The shape drum** — `ShapeWheel`. Same question, smaller.

### Stays, and is the answer to §1
- Press Start 2P wordmark, the dot-matrix motif, **Pixel Materialize**,
  the pixel `search` glyph, the `play` chip mark, the seven `--cat-*` tints.
- The wave (`--duration-wave` / `--ease-wave`), untouched by any of this.

### The one accent moves
`--indicator` orange lives on the rail's marker and is called "the body's ONE
accent" (§6, §7). With no body, the shell's `--accent` blue is the page's accent
again and the rail's orange becomes a second one. **Decide before building**:
either the rail keeps orange and the page gives up blue, or the rail goes blue
and the board's orange leaves with the chassis.

---

## ARCADE — three directions, pick one

Underspecified in the brief and it drives everything else on this route.

**A. PIXEL CHROME (recommended).** The interface draws itself from its own
vocabulary. Borders, focus rings, dividers, button corners and the card's seat
are STEPPED rather than smooth: 2px cells, hard corners, no antialiasing, the
way a 32-bit UI draws a panel. It is the same instinct the search field already
has — it renders `getIcon("search")` rather than borrowing a magnifier — applied
to the whole page.
*Why it is the strongest:* it is a RULE, not a texture. It scales to every new
component, it never fights the icons, and it is the only one of the three that
could not be pasted onto another product.

**B. CABINET.** The page is framed as an arcade cabinet: a lit marquee carrying
the wordmark, the grid as the screen beneath it, a control panel strip for the
hardware. Literal and strong.
*Risk:* it is a second skeuomorphic object replacing the one just removed, which
is most of the cost of this change with none of the benefit.

**C. CRT.** The grid sits on a dark screen with scanlines and a soft bloom;
everything else stays quiet.
*Risk:* scanlines over 24 small icons is noise on the one surface that must stay
legible, and it re-introduces a "screen" the plain-page decision just removed.

---

## THE COMPOSER — becomes the board

Takes the gallery board's **configurator UI, its shape, its analogue feel, and
its clicky-but-smooth transitions**. No mini screen.

### Every control needs a home
| Today | Count |
|---|---|
| `ToolRail` / `ToolStrip` | 8 tools: mirror, grid, eyedropper, undo, flip-h, flip-v, rotate, redo |
| `ColorKnobs` / `ColorPanel` / `Knob` | 2 knobs + saturation slider + hex + readout |
| `SlideToClear` | full-width groove |
| `Dock` / `DockFields` | name, category, tags, colour chip, help, import, export, save |
| `DockSheet` | the phone split of the above |
| `ImportPicker` | modal over the set |
| `Screen` / `ScreenMesh` | R3F recess — the one part with no gallery equivalent |

**The gallery board's row has three seats and the composer needs more.** The
gallery put a mini screen, a colour pad and a drum in its left column and a rail
on its right. The composer has 8 tools, 3 colour controls, a slide-to-clear, six
dock fields and three actions. The left column alone cannot hold them.

**Proposed:** the composer's board is the gallery's row with BOTH edges used —
tools down the left, the drawing screen in the middle, the size/zoom rail on the
right, and the dock folded into the chassis under the screen rather than
floating over it. The slide-to-clear stays where it is, directly under the
screen, which is the one thing already in the right place.

### What "analogue feel" imports specifically
- The 45ms follow bridge on every drag surface (rail, drum, knobs).
- Duration follows distance, not category (§5b).
- The 1px key press, the deepening seat on grab, the part that never grows.
- `--ease-smooth-out` for surfaces, and NOT for anything that redraws a picture
  (see `--ease-wave`, learned 2026-09-05).

---

## Open questions — answer before building

1. **The size rail and the shape drum have nothing to be cut into.** Both are
   holes in a chassis. On a plain page they are objects with no material around
   them. Either they keep a small local "plate" of their own, or they are
   rebuilt as pixel-chrome controls under direction A.
2. **Does the gallery keep the mini screen and the detail shelf?** The brief
   says the COMPOSER loses its small screen. The gallery's mini screen is a
   display, not a control, and Pixel Materialize lives on it. If it goes, the
   reveal goes with it and the detail shelf needs a new home.
3. **Which accent survives on the gallery** (see above).
4. **Does the composer keep the R3F screen recess?** It is the one composer part
   with no gallery equivalent, and it is 861KB of three.js the gallery
   deliberately refuses to ship.

---

## Sequencing

**Gallery first.** It is mostly subtraction, it is the public route, and it is
what unblocks the deploy. The composer is mostly construction and can follow.

1. ~~Strip the chassis from `/`, keep the hardware working.~~ **DONE 2026-09-12.**
2. ~~Land direction A as the page's register.~~ **DONE** — `--px`, `--px-notch`,
   the three shell radii at 0, every capsule and recess rebuilt.
3. ~~Answer Open §1 and §2; rebuild the rail and drum.~~ **DONE, and the owner
   redirected all four during the build** — see *What actually happened* below.
4. Rewrite DESIGN.md §1 — **DONE**. §6 carries a staleness banner rather than a
   full rewrite; its behaviour notes are still live and its construction notes
   are not. **Still to do: INTERACTION.md §6**, which describes the drum's drag,
   the rail's magnifier and the mini screen's permanence as current behaviour.
5. Then the composer.

---

## What actually happened — 2026-09-12

The four open questions were overtaken by direction given mid-build, which is
recorded here because the answers are not the ones this plan predicted.

| Open question | Planned | Settled as |
|---|---|---|
| 1. Rail and drum have nothing to be cut into | keep a local plate, or rebuild in pixel chrome | **Both replaced outright.** The rail lies down in the control column; the drum became three drawn cells. |
| 2. Does the gallery keep the mini screen | undecided; recommended keeping it framed | **Kept, and MOVED** into the detail shelf. |
| 3. Which accent survives | undecided | **Shell blue.** `--indicator` now points at `--color-accent`; the orange left with the chassis. |
| 4. Does the composer keep R3F | undecided | still open — phase 2. |

**And one thing this plan did not anticipate at all: the colour control.** The
three knobs were replaced by a saturation/lightness field with a hue strip. The
knob build is saved verbatim in `reserved/` for the composer.

### Two things worth carrying forward

**The live region moved into the thing that unmounts, and nothing but a test
caught it.** DESIGN.md §6 said plainly why the selection announcer was on the
mini screen and not the detail bar: "it has to announce clearing as well as
loading, and the bar does not exist to announce its own removal." Moving the
screen INTO the bar reintroduced that exact defect without editing a line of the
rule or the announcer. It is on the icon panel now. **The general form: a rule
about where an element lives is broken by moving the element, and no diff of the
rule will show it.**

**The controls survived replacement because they were views of state.** Size,
shape and colour are all views of `GallerySettings`, so swapping a knob for a
field never touched a rule — the colour suite's four tests became the field's
four tests with their assertions intact, because none of what they pinned was
ever about a knob. That is the engine/presentation boundary (TECH-STACK.md)
paying out on a surface it was not written for.

**What this invalidates:** `board-breakpoint-density-cliff.md` entirely, and
`grid-idle-capacity.md` except its Direction 2 (cap and centre the grid), which
survives because it is about the grid rather than the board.
