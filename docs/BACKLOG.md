# BACKLOG.md — Fixes, features, open questions

> Working list for the build. Group A are polish carry-overs from the v9
> prototype; the rest are features, decisions, and reminders.

## A. Polish fixes (from v9)

1. **Bezel too thick** — the rim around the screen (especially the bottom) is
   too fat. Thin it to a slim recessed frame, even all around.
2. **Snub-in still looks off** — RESOLVED 2026-08-20, and by the route this
   entry predicted: the screen's recess is now real geometry. Four sloped walls
   around a floor, lit by one light, rendered in R3F under the DOM grid. The
   shading is not authored — the top wall is dark and the bottom bright because
   that is what those surfaces do under a light from above. Hand-tuning inset
   shadows per edge was always going to keep looking "slightly wrong", because
   four edges of one hole do not have four independent gradients.
3. **Dock too thick** — RESOLVED. One row, floating and content-sized. It also
   gained a phone layout: below `lg` the row would have wrapped into a 188x288
   slab over the toy, so it becomes a bar plus a Details sheet instead.
4. **Knobs not at the corners + too small** — move both knobs fully to the true
   bottom-left/right corners, overlapping the frame edge like the real toy, and
   enlarge them.
5. **Remove the pixel count** — drop the `x/121` filled-cell counter from the
   dock. Not needed.

## B. Import placement and source

- **RESOLVED — Import lives in the composer dock** (owner-only). It's a
  creation action, not a global page feature. (Reflected in DESIGN.md /
  INTERACTION.md.)
- **RESOLVED 2026-08-21 — Import reads the SET, not a file.** It opens a
  searchable picker over the registry plus locally saved icons and puts the
  chosen art on the board. The file picker it replaced could only reach art
  already in the gallery by exporting it and uploading it back, and there was
  no other route to editing published art at all.
  - Art only — no name, category or tags. See INTERACTION.md §5 for why.
  - One undo step, unlike a draft restore.
  - `svgToCells` is **retained in the engine, tested and currently uncalled**,
    the way `cellsBetween` is. It is the inverse of `cellsToSvg`, its tests are
    what hold the export format to round-tripping its own history (§D2), and
    the public-contribution phase will need a reader for exports made
    elsewhere.

## C. Drag behaviour

- **RESOLVED 2026-08-18 — drag is a RECTANGLE fill.** Press one corner, drag to
  the opposite one, and the axis-aligned rectangle fills live. Mode is set on
  press: start empty → paint; start filled → erase. This replaced freehand
  line-drag, which drew a Bresenham path whose diagonals touched only at the
  corners and read as broken. `cellsBetween` stays in the engine, tested and
  unused, so freehand can return as a tool toggle without rework.
- **RESOLVED 2026-08-18 — overwrite.** A paint drag crossing an already-filled
  cell **overwrites** it with the current color. This matches the v9
  prototype's own behavior (`applyCell` assigns unconditionally), so it is what
  the tool has always done.

## D. Decisions

**Resolved**
- **Safe area — 9×9**, advisory not enforced. The only inset that centres on an
  odd grid; 10×10 would sit off-centre. Seeds all respect it (tested).
- **Taxonomy — 6 categories:** interface, media, arcade, system,
  communication, nature. Closed TS union.
- **Naming — kebab-case** for `id`, `name`, and every tag, validated at module
  load.
- **Gallery detail:** large preview, name, category, tags, Copy SVG / Download
  SVG+PNG / Copy name.
  - **Split in two on 2026-08-29** — the preview is the mini screen, everything
    else is the detail bar along the board's bottom. Keeping them together is
    what made the board's left column fat.
  - **The selectable SVG field is gone with it.** It was the clipboard fallback,
    and Download SVG is a better one: it needs no clipboard API at all, and a
    refused copy now points at it. A textarea in a chassis strip would have
    brought back the growing panel the split was fixing.
- **Resources page:** get-the-icons / packages / design tools / learn /
  license, modelled on Lucide's and Phosphor's. Planned items are labelled and
  deliberately unlinked.
- **Colour model:** the gallery renders **single-color**, always. Duotone is
  parked (see G).
- **Exports follow display settings** — colour, cell shape and size travel with
  a copy or download.
  - **Size joined 2026-08-29, when the scale outgrew the grid.** The rail runs
    16–120 and the grid's fixed 64px seat draws nothing above 48, so the stops
    past the cap set the exported file's dimensions instead of the tile's. That
    is what makes the top half of the rail's travel do something rather than
    nothing. The break is **announced, not drawn** — 48 wore a full-width
    graduation for one pass, and one mark unlike all the others reads as damage
    before it reads as information.
  - **Narrowed 2026-08-28 with the board rebuild.** Gallery-wide **padding** and
    **transform** were removed: the board gives every control a surface whose
    job it shares — the screen carries what changes *which* icons are shown, the
    body what changes *how* they are drawn — and neither of those two earned a
    place on either. The engine keeps `applyOrientation` and `cellsToSvg`'s
    `padding`, both still written and still tested, so this is the gallery
    dropping two controls rather than the engine losing two operations.
    - **Corrected 2026-08-30: neither is CALLED.** This entry said "still used
      by the composer", and a sweep found `applyOrientation` referenced only
      from a comment, and `useDock` passing `cellsToSvg` nothing but a `title`.
      They are retained-and-uncalled, exactly like `svgToCells` (§B) and
      `cellsBetween` (§C). The retention still stands on its own reason: the
      capability is written and tested, so restoring either control is a UI
      decision. What was wrong was the claim that something already used them.
    Restoring them is a UI decision, not a rewrite.
- **Cell styles — Square / Inset / Round (2026-08-21; renamed 2026-08-28).** A
  gallery-wide display control, not icon data. The engine keeps its own words —
  `cells`, `CellStyle`, `solid`/`gap`/`dots` — and the UI reads Shape: Square /
  Inset / Round. The rename came with the control moving onto the key rack the
  categories used to hold. Gap insets a cell by 0.5 units a side; Dots keeps that
  inset and draws a circle of the same diameter. Both suspend the run-merging
  Solid uses, since merging would erase the gap. Geometry lives in
  `engine/render.ts` and is shared by the SVG writer and the React preview —
  they previously computed it separately, and disagreed: the writer merged runs
  and the preview did not, so a copied icon was a subtly different picture from
  the one on screen.
  - This is the first display setting that **does not round-trip**. An inset or
    a circle is not recoverable as cells, so `svgToCells` refuses a styled
    export rather than importing something wrong. Solid still round-trips.
- **Owner CRUD:** the owner gets full create/read/update/delete, with two
  constraints — **`id` is immutable once published** (it is the export filename
  and future package key), and **delete is soft** (a status flag), so an id is
  never recycled into a different drawing.

- **No per-icon page — Phosphor's model, not Lucide's (2026-08-30).** The gallery
  never navigates anywhere. There is no `/icons/[id]` route and one is not
  deferred: it is **dropped**. "The gallery IS the toy" (@docs/DESIGN.md §1), and a
  device that navigates away from itself stops being one — Lucide can afford
  per-icon pages because its gallery is a webpage.
  - **The cost is real and accepted:** long-tail `pixit arrow-right` search
    traffic. It is the wrong race to enter, with 24 icons on a new domain
    against ~1500 on an established one, and it is not the differentiator —
    CLAUDE.md says those are the composer and the pixel niche.
  - **A selected icon still gets an ADDRESS: `?icon=<id>`.** `pushState`, no
    navigation, the board never re-renders — not a page, a deep link into the
    one surface. It cannot 404: an unknown id degrades to the gallery with
    nothing selected, the same way `fetchPublishedIcons` returning `[]` degrades
    to the registry. A PATH would have needed a route, `generateStaticParams`
    and a `dynamicParams` decision for the database icons, in the week Phase 4
    has nothing left but the deploy.
  - **IT COLLIDES WITH THE MINI SCREEN'S REVEAL, AND THAT IS A DECISION TO MAKE
    BEFORE BUILDING IT.** Pixel Materialize plays on SELECTION and deliberately
    not on mount — today that holds for free, because nothing is selected at
    load. A cold `?icon=` load arrives with an icon already chosen, so the
    reveal fires on mount. That is probably what you want on a shared link,
    since it shows the panel doing its thing, but it is the opposite of the
    rule as written and must be chosen rather than discovered. If it is kept,
    the rule becomes "on selection, and on a cold load that names an icon".
  - **THE URL NAMES WHICH ICON, NEVER HOW IT IS DRAWN.** The board's own rule
    applied to the address bar: the screen carries what changes WHICH icons are
    shown, the body carries HOW. Colour, size, shape, search and category stay
    out of it. Without that line there is none — every control has an equal
    claim, and each new one would arrive with a URL-naming decision. Sharing a
    *configured* view is a real feature and a separate one; it stays in §E.
  - **"See in action" went with it.** No destination, no URL under the rule
    above, and no coherent Back — only the icon is in history, so Back would
    have skipped the view and cleared the icon underneath it. It would also
    have been the first MODE on a board that has only controls. What it reached
    for is largely already built: the mini screen draws the icon on the panel it
    ships on, and the size rail redraws the whole set from 16 to 120.

**Still open**
- **What a stronger DETAIL BAR carries (2026-08-30).** Direction agreed, content
  undecided — it is where the effort that was going to "see in action" goes.
  The constraint is that the bar exists *because* a panel was deleted: the mini
  screen held the name, tags, four caps and an SVG disclosure for one iteration,
  and a four-tag icon added ~110px of text to a 264px column. So anything added
  **replaces**, never appends. Two leads to weigh: the **tags** are the weakest
  thing on it — search already matches them, and they are the variable-width
  element forcing the scroll — and **copy-as formats** (§E) are the strongest
  thing missing. If those land, a body-side selector setting *what Copy copies*
  fits the board better than a menu, since nothing on this board opens.
- **Auth:** Supabase recommended (smaller blast radius than a repo-write
  token). Parked — see G.
- **Import scope:** v1 only guarantees round-tripping the tool's own export
  format; behavior for arbitrary external SVGs is undefined. The reader refuses
  on the first thing it does not recognise rather than importing what it can —
  a half-parsed import hands the owner a drawing that is quietly missing
  pixels, which is worse than a refusal.
  - **Padding is validated, then dropped.** A padded export carries a
    negative-origin viewBox while its rects stay in unpadded 0..44 space, so
    padding is a display setting with nowhere to live in `cells`. The viewBox
    is still fully checked, because it is what identifies a Pixit canvas — a
    Lucide 24x24 is rejected there.
- *(nothing else outstanding on fonts — Display/Data locked to JetBrains Mono
  on 2026-08-18; see @docs/DESIGN.md §4.)*

## D2. Export format

- **The root carries the dominant colour (2026-08-20).** Rects that use it omit
  `fill` and inherit. Still fully baked — a literal hex, never `currentColor` —
  it just stops a single-colour icon naming the same seven characters twelve
  times. 22% smaller, and readable when pasted.
- **The reader accepts both forms.** Every rect naming its own colour under a
  `fill="none"` root is what this tool wrote until that date, and those files
  exist. Dropping support would mean the format stopped round-tripping its own
  history; there is a test named for exactly that.

## E. Gallery — future explorations (post-v1)

Copy-as (JSX / React component / data URI); multi-select + bulk download;
favorites; recently-added; keyboard grid navigation; sharing a **configured**
view (colour, size and shape in the URL, Lucide-style — distinct from the
`?icon=` address settled in §D, which names only which icon);
collections; Fuse.js fuzzy search; pagination / virtualization as the set grows.
The gallery has the most room to grow — treat it as an ongoing surface.

## G. Parked (deliberate, not forgotten)

- **Duotone / monotone modes.** Nucleo- and Phosphor-style two-tone icons.
  Safe to park because the planned approach derives roles from an icon's
  distinct cell colours, so nothing built now becomes wrong — the composer
  keeps painting real colours, and roles appear when the feature does. Cost of
  resuming is re-authoring a few seeds with a second layer.
- **Supabase auth.** Still parked, and it is now the first step of §H rather
  than a loose end. Sign-in is going to be **GitHub OAuth**
  rather than Supabase magic link (decided 2026-08-21): it identifies the owner
  by GitHub login, stores no long-lived token, and Supabase Auth would be a
  second identity system next to a database we are already using only as a
  store. The authorization check goes in the route handler, never middleware
  alone (CVE-2025-29927).
- **Supabase persistence — DONE 2026-08-21.** `public.icons` with RLS: reads are
  world-readable for `status = 'published'`, and there is deliberately no
  insert/update/delete policy, so writes only happen through the server-only
  service-role key. An id is frozen by trigger, deletes stay soft. Schema in
  `supabase/schema.sql`, seed via `npm run db:seed`.
  - **The publish-from-the-browser route is NOT built yet, on purpose.** It
    needs sign-in first. An endpoint gated only by `PIXLE_COMPOSER_ENABLED`
    would be a public write path on any Worker with the composer switched on —
    that flag is per-deployment, not per-person.
- ~~**`/guide` interface.** Content approved, interface deferred to a later
  pass.~~ **DONE.** Rebuilt as reading rather than a grid of equal cards: each
  rule is prose beside a demonstration drawn with the product's own material, and
  every number is read from engine constants so the page cannot drift from the
  geometry it documents. A **Shape** rule joined it on 2026-08-30, since
  Square / Inset / Round is a locked decision the Guide had never mentioned, and
  **Sizing** now covers the rail running past what the grid can draw.

## F. Reminder

**Access control is the #1 rule.** Public browses; only the owner creates. Never
ship a publicly reachable composer. Public contribution + curation are a future
phase.

## H. Public contribution — the composer on the website (v2)

**THE ROUTE IS NOT LUCIDE'S, AND THAT IS THE POINT.** Lucide takes
contributions as pull requests, which needs a contributor who can already use
git. Pixit lets a person **draw one in the browser** and send it. CLAUDE.md says
the differentiators are the composer and the pixel niche, and this is the
composer being one of them rather than an owner-only tool nobody else can reach.

**NOT v1.** CLAUDE.md rules 1 and 7 still stand: the composer stays owner-only
until this ships. PLAN.md Phase 4 has nothing left but the deploy, and opening a
write path is the highest-risk change in the project. Debugging auth and abuse
on a site nobody has seen work yet is the wrong order.

### The blocker, in one sentence

**The gate is per-deployment, not per-person.** `PIXLE_COMPOSER_ENABLED` is a
boolean baked into a build, so an endpoint protected by it alone would be a
public write path on any Worker with the composer switched on (TECH-STACK.md
says exactly this). Everything below follows from replacing it with an
authorization check on a real identity. Note that `scripts/build-cloudflare.mjs`
currently FORCES the flag false and fails the build if it survives, so `/create`
404s in production today. That guard is correct for v1 and must be changed
deliberately, never as a side effect.

### Locked 2026-08-30

- **Invite-only.** Not "anyone with a GitHub account". It removes almost the
  entire abuse surface, which is what keeps this a phase rather than a project:
  no open spam queue, no rate-limit design, no moderation backlog.
- **Everything waits, except the owner's own.** A contributor's submission lands
  as `status = 'pending'`; the owner's publishes directly. One role check at
  insert time, not two endpoints.
- **Contributors are attributed, on the DETAIL BAR.** The `author` column
  already exists and defaults to `ilham`; nothing reads it yet.
  - **It has to REPLACE something.** The bar exists because a panel was deleted
    (§D), and its caps already scroll rather than wrap. The **tags** are the
    obvious trade: search already matches on them, so they are being shown to
    someone who has by definition already found the icon, and they are the
    variable-width element forcing the scroll.
  - Open: whether every icon shows an author, or only contributed ones. Always
    is a consistent rule and reads as noise while the set is 24 icons by one
    person; only-when-contributed is quieter now and is a rule with an
    exception in it.
- **Fire and forget, with RESUBMIT-REPLACES.** No "my submissions" screen, no
  edit state, no withdraw. Submitting the same id again overwrites the pending
  row, so fixing a mistake is drawing it again, which is a path that already
  exists. Two reasons it beats a real edit feature:
  - **`id` is immutable and derived from the name**, so an edit screen could not
    fix the thing people most want to fix. Most of the cost, a fraction of the
    value.
  - **Invite-only makes the population small and trusted**, so "please drop that
    one" is a message rather than a feature.
  - It is additive to defer: `author` is on the row, so a submissions view and
    an RLS policy for reading your own pending rows can arrive any time.

### What already exists

The schema was built for this and most of it is unused rather than absent.
`public.icons` already constrains `status` to `published | pending | rejected`,
already carries `author`, already freezes `id` on update by trigger, and already
treats delete as soft. **RLS is already correct**: public select is scoped to
`status = 'published'`, so a pending submission is invisible to the public the
moment it is inserted, with no extra work. The composer itself is finished, and
the gallery already merges the registry with published rows and degrades to the
registry alone when the database is unreachable.

### What is missing

1. **Auth with multiple accounts.** §G decided GitHub OAuth for identifying the
   owner; multi-user sessions is a step past that.
2. **Roles.** Owner versus invited contributor, checked in the route handler and
   never in middleware alone (CVE-2025-29927).
3. **The submit path.** RLS has no insert policy at all, on purpose. A
   submission needs a server route that authenticates the person and inserts
   with `author` set to them, `status` decided by their role.
4. **The curation queue.** Nothing exists: list pending, preview on the board,
   approve to `published` or reject.
5. **The invite mechanism itself.** Whatever grants someone the contributor
   role, and whatever revokes it.
6. **License consent.** Contributed icons ship MIT. Lucide gets that agreement
   free because a PR lands against an MIT repo; a web form has to ask.
7. Worth knowing rather than blocking: `/create` loads 1419KB, 861KB of it
   three.js, and every contributor would pay that.

## I. Site pages and navigation

**THE GUIDE IS AN ICON DESIGN GUIDE, NOT A USAGE GUIDE, and nothing on the site
is the second one.** Found 2026-08-30 comparing against Lucide, which splits the
two: `/guide/` is how to USE the icons and `/contribute/icon-design-guide` is how
to DRAW one. Ours is entirely the second, and it says so itself: "it doubles as
the style guide once contribution opens."

So a developer who opens "Guide" expecting to learn how to put an icon in their
project gets an authoring spec. Resources lists Copy SVG and the two downloads
as rows, but no page walks anyone through actually using one. That is the gap
behind the "use the icons the way Lucide did" question, and it is **content
missing rather than structure wrong**, which is what the recommendation below
turns on.

### Recommended, not yet built

1. **Reframe `/guide` into two parts on ONE page.** *Using the icons* first:
   select one, what Copy SVG and the two downloads give you, that colour, shape
   and size travel with the export, that the PNG snaps its cell edges to whole
   pixels, and that a package is planned. Then *How they are built* second,
   which is the current page unchanged. Same route, same `Rule` component, and
   the reading order corrected. It fixes the problem today at no structural
   risk.
2. **A real `/license` page.** Resources currently sends people to a GitHub
   blob, and the MIT text on the site is the better answer. It is the one item
   in Lucide's Resources menu that costs nothing and applies to us today.
3. **Split it later, when contribution is real.** The design rules are what an
   invited contributor needs and §H is where they will already be, so
   `/contribute/icon-design` becomes the obvious home for them at that point.
   Doing it now would leave `/guide` carrying usage on its own before the usage
   content has been written once, which is the harder half first.

### What we are deliberately NOT taking from Lucide's navigation

Packages, Showcase, Merch, Community, Discord, Code of Conduct and Brand logo
statement. Every one of those exists because Lucide has around 1500 icons, eight
framework packages, a Discord and years of contributors. Pixit has 24 icons, no
package, no users yet and one person, so copying the shape would build **a nav
full of empty rooms**. The Resources page's own rule already forbids it: nothing
links to something that does not exist yet, and a Showcase with nothing in it is
worse than no Showcase.

**And no dropdown.** Four items fit in the bar. A dropdown costs a click and
buys nothing until five or six things sit behind it, which is where Lucide's
earns itself. Revisit at that count, not before.

**Two of them become real with §H rather than never.** A **Code of Conduct** is
required the moment contribution opens and is theatre before then. **Community**
needs somewhere for people to gather before a link to it means anything. Both
are §H items, not permanent exclusions.

## J. Known and accepted

Things that are true, deliberate, and easy to mistake for oversights.

- **The mini screen, and its reveal, are DESKTOP ONLY.** The whole left column
  is `hidden` below `lg`, so on a phone an icon is selected and the detail bar
  appears with no preview and no Pixel Materialize. Accepted 2026-08-30: the
  bar carries the name, the category and every export action, which is what a
  phone needs. Two consequences worth knowing rather than fixing: the reveal
  renders about 250 nodes that are never seen (no animation cost, since
  `display: none` does not animate), and any wording about "tapping through to
  the mini screen" on touch is wrong. DESIGN.md and INTERACTION.md both said it
  until 2026-08-30.
- **Three engine capabilities are written, tested, and never called.**
  `svgToCells` (§B), `cellsBetween` (§C), and `applyOrientation` with
  `cellsToSvg`'s `padding` (§D). Each is a deliberate retention with its reason
  recorded where it was decided. A dead-code sweep will surface all four every
  time; they are not oversights, and the tests are what keep them honest.
  - What that sweep DID find on 2026-08-30, and what was deleted with it:
    `PRESET_COLORS` (the preset swatch row removed on 2026-08-18),
    `.pixl-grain`, `IconPreview`'s `grid` and `padding` props with the
    `latticePath` that served them, and seven unread tokens — `--toy-accent`,
    `--toy-accent-on`, `--cell-face`, `--screen-2`, `--sidebar-width`,
    `--icon-card-min` and `--icon-grid-gap`.
- **The reveal's timings sit OUTSIDE the §5b motion scale**, on purpose: it is a
  display animation rather than a surface opening or closing. See DESIGN.md §6.
  It is the second such exemption, after the hex readout's segment refresh.

