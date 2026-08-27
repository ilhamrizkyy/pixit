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
- **Gallery modal:** large preview, name, category, tags, Copy SVG / Download
  SVG+PNG / Copy name, plus a selectable SVG field as the clipboard fallback.
- **Resources page:** get-the-icons / packages / design tools / learn /
  license, modelled on Lucide's and Phosphor's. Planned items are labelled and
  deliberately unlinked.
- **Colour model:** the gallery renders **single-color**, always. Duotone is
  parked (see G).
- **Exports follow display settings** — colour, flip, rotation, padding, and
  cell style all travel with a copy or download.
- **Cell styles — Solid / Gap / Dots (2026-08-21).** A gallery-wide display
  control, not icon data. Gap insets a cell by 0.5 units a side; Dots keeps that
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

**Still open**
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
    is still fully checked, because it is what identifies a Pixle canvas — a
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
favorites; recently-added; keyboard grid navigation; shareable links;
collections; Fuse.js fuzzy search; pagination / virtualization as the set grows.
The gallery has the most room to grow — treat it as an ongoing surface.

## G. Parked (deliberate, not forgotten)

- **Duotone / monotone modes.** Nucleo- and Phosphor-style two-tone icons.
  Safe to park because the planned approach derives roles from an icon's
  distinct cell colours, so nothing built now becomes wrong — the composer
  keeps painting real colours, and roles appear when the feature does. Cost of
  resuming is re-authoring a few seeds with a second layer.
- **Supabase auth.** Still parked. Sign-in is going to be **GitHub OAuth**
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
- **`/guide` interface.** Content approved, interface deferred to a later pass.

## F. Reminder

**Access control is the #1 rule.** Public browses; only the owner creates. Never
ship a publicly reachable composer. Public contribution + curation are a future
phase.
