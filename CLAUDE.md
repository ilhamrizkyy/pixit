# CLAUDE.md — Project Constitution

> Claude Code reads this at the start of every session. It is the index and the
> guardrails. Detail lives in the linked docs — load them for the relevant work.

Load: @docs/DESIGN.md · @docs/INTERACTION.md · @docs/TECH-STACK.md · @docs/PLAN.md · @docs/BACKLOG.md

---

## What this is

**Pixle** — an open-source **pixel / 32-bit / arcade icon set**
plus an in-browser **composer** styled like an Etch A Sketch. Inspired by
Phosphor / Lucide / Nucleo; the differentiators are the composer and the pixel
niche. Licensed **MIT**.

## Non-negotiable rules

1. **ACCESS CONTROL — the most important rule.** In v1, **only the owner
   (Ilham) can reach the Create/composer and add icons.** The public may only
   browse the gallery (search / filter / view / copy / download) and read
   Guide / Resources. The composer route is **auth-gated to the owner**. Public
   contribution is a *future* phase, not v1. Do not ship a publicly reachable
   composer.
2. **Multi-color, baked colors.** Icons store a color per cell. A newly chosen
   color applies only to the **next** cells drawn; existing cells keep theirs
   (no retroactive recolor). Exports carry baked colors. There is **no**
   currentColor.
   - **Amended 2026-08-17 — gallery renders single-color.** The gallery
     **always** displays icons in exactly one color: a hex field recolors every
     filled cell of every icon, defaulting to #000000 in light / #ffffff in
     dark. There is no multi-color display state. It stays **display only** —
     stored `cells` are never modified and the gallery color must never become
     a persisted property of an `IconDef`. **Exports follow the display**,
     though: Copy/Download are built from the displayed cells, so the gallery's
     color, flip, rotation, and padding all travel with a copied icon.
   - **Authoring consequence:** seed icons are authored in a **single color**
     and drawn as **outlines**, never as filled masses whose meaning depends on
     internal color contrast. See @docs/DESIGN.md §3. The composer still supports
     per-cell color; the gallery simply does not render it.
3. **Grid state is the source of truth**, not SVG. An icon *is* its 11×11 cell
   data; SVG/PNG are render targets generated from it.
4. **Grid = 11x11 on viewBox "0 0 44 44"** (4 units per cell). Square pixels,
   rendered as normal anti-aliased vector. Intended sizes are multiples of 8,
   16px minimum.
   - **Amended 2026-08-21 — the gallery may DRAW a cell inset or round.** The
     Cells control (Solid / Gap / Dots) is a display setting like colour and
     padding: it applies to the whole set at once, `cells` are never modified,
     and no `IconDef` carries a shape. Stored data stays square — rule 3 already
     says an icon *is* its cell data and SVG is a render target, and this is
     that rule being used.
5. **Decouple the icon engine from the presentation.** The data model + editing
   operations (fill, clear, mirror, flip, rotate, undo/redo, import/export)
   must be plain, testable modules with **no rendering dependency**, so the toy
   can start as DOM/CSS-3D and later be upgraded to Three.js without rewriting
   logic. See @docs/TECH-STACK.md.
6. **Follow @docs/DESIGN.md tokens and @docs/INTERACTION.md behaviors.** No raw hex or
   one-off spacing in components; use the CSS variables. Don't invent
   interactions not specified there without flagging.
7. **Don't build deferred scope in v1:** public Contribute, curation mode, the
   npm package, or an icon font. Build the nav shells, wire them later.

## Icon data model

    type IconDef = {
      id: string;            // stable, kebab-case, unique
      name: string;
      category: Category;    // closed union of 6 (see engine/types.ts)
      tags: string[];
      cells: (string | null)[]; // length 121 (11x11), per-cell hex color or null
      author: string;        // "ilham" for v1 (owner-only)
      status: "published" | "pending" | "rejected"; // pending/rejected unused in v1
      createdAt: string;     // ISO
    };

**Naming:** `id`, `name`, and every `tag` are **kebab-case** (`arrow-right`) —
validated at module load, so a bad name fails the build. The displayed name is
therefore the same string you would paste into code, matching Lucide/Phosphor.

- v1 icon set = the repo's **static registry** (typed module in the repo)
  **plus Supabase Postgres**, merged, with the registry winning any id
  collision.
  - **Amended 2026-08-21 — icons persist in Postgres.** The composer publishes
    into a database so an icon drawn on the deployed site reaches the gallery
    without a commit. The **seeds stay in the repo**, deliberately and
    permanently: Pixle is MIT, and a clone that shows nothing without access to
    somebody else's database is not an open-source icon set. The gallery reads
    `registry + published rows`; with no database configured it shows the
    registry alone and everything still works.
  - Reads use the anon key under RLS (published rows only). **Writes use the
    service-role key and are server-only** — there is no insert policy, so no
    browser-reachable key can write. See @docs/TECH-STACK.md.
- Serialize `cells` compactly if needed, but keep it diffable for future curation.

## Build order

See @docs/PLAN.md for the phased, sub-one-month timeline and exit criteria.

## Locked decisions

- **Safe area 9x9**, advisory not enforced — the only inset that centres on an
  odd grid.
- **Taxonomy:** 6 categories, closed TS union. **Naming:** kebab-case
  throughout, validated at module load.
- **Gallery renders single-color**; duotone is parked.
- **Exports follow the gallery's display settings.**
- **Owner CRUD:** full create/read/update/delete, but `id` is immutable once
  published and delete is soft, so an id is never recycled.

The live list of what is still open, and what is deliberately parked, is
@docs/BACKLOG.md §D and §G. Don't guess on anything there — ask.

## Conventions

- TypeScript everywhere; `IconDef` is the contract between engine, registry,
  gallery, and composer.
- Names describe what the user sees. Copy is active-voice and literal.
- Keep this file short; push detail into the linked docs.
