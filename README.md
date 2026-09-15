# Pixit

An open-source pixel / 32-bit / arcade **icon set**, plus an in-browser
**composer** styled like an Etch A Sketch. MIT licensed.

> **Status: Phase 2 complete — gallery and composer both build.** The public
> gallery has 108 icons, search, filtering, a single-color customizer,
> size/padding/transform controls, and copy/download that matches what you see.
> The owner-only composer draws, transforms, undoes, imports and exports, with
> its knobs and screen recess rendered in three.js. Still open: the composer
> saves to the browser, not to the registry, so a drawn icon does not yet reach
> the published set; and the owner gate is an env flag rather than real auth.
> See [PLAN.md](docs/PLAN.md).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm test` | Vitest over the engine + registry |
npm run test:e2e   # Playwright: pointer paths, touch, WebGL
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

One rule holds the project together: **the icon engine is decoupled from
presentation.**

```
src/
  engine/      Pure TypeScript. No React, DOM, Canvas, or WebGL imports, ever.
  registry/    The static icon set, authored as ASCII art maps.
  components/  Presentation. Reads engine state, forwards input to it.
  app/         Next.js App Router + design tokens.
```

An icon **is** its 11×11 grid of cells — SVG and PNG are render targets
generated from that data, never the stored form. Because the engine knows
nothing about rendering, the composer can ship as DOM/CSS-3D now and become a
React Three Fiber toy later as a presentation swap rather than a rewrite.

### Grid

11×11 cells on `viewBox "0 0 44 44"` (4 units per cell), with a **9×9 safe
area** leaving a symmetric 1-cell margin. Colors are **baked per cell** — a
literal hex on every cell, no `currentColor`, no theme inheritance, no
downstream recoloring.

### Authoring an icon

Icons are written as art maps so a changed pixel shows up as a changed
character in review. Malformed art throws at module load, failing the build:

```ts
defineIcon({
  id: "heart",
  name: "Heart",
  category: "arcade",
  tags: ["heart", "life"],
  createdAt: "2026-08-17T00:00:00.000Z",
  palette: { "#": "#dc2626", o: "#ffffff" },
  art: [
    "...........",
    "..##...##..",
    // ...9 more rows of 11 characters
  ],
});
```

## Access control

The composer is **owner-only** and gated server-side. The public may browse the
gallery and read the Guide and Resources — nothing else. Public contribution is
a future phase.

## Deploying

**Cloudflare Workers**, via the `@opennextjs/cloudflare` adapter.

```
npm run preview   # build + run the worker locally
npm run deploy    # build + ship it
```

Both go through `scripts/build-cloudflare.mjs`, which forces the owner gate shut
in the bundle and then **verifies it**, failing the build if the flag was baked
open. This is not ceremony: the adapter bakes `.env` files into the bundle at
build time, and Cloudflare deploys run on your own machine — where `.env.local`
has the composer enabled. A Worker with no variable set falls through to that
baked value. See [TECH-STACK.md](docs/TECH-STACK.md) for the measurements.

To use the composer on a deployed Worker, set `PIXLE_COMPOSER_ENABLED=true` as
a Worker variable. Leave it unset and `/create` returns 404.

## Database (optional)

Icons published from the composer live in Supabase Postgres. **The app runs
fine without it** — leave the variables unset and the gallery shows the seed
icons in the repo.

To set it up:

1. Create a free project at supabase.com
2. SQL Editor → paste [`supabase/schema.sql`](supabase/schema.sql) → Run
3. Put `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in
   `.env.local` (see [`.env.example`](.env.example))
4. `npm run db:seed` — pushes the repo's seed icons into the table, and is safe
   to re-run

On the deployed Worker set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` only. **Never
set the service-role key there** — it bypasses row level security, and the build
guard strips it from the bundle for the same reason.

## Docs

[CLAUDE.md](CLAUDE.md) is the constitution and index; it links
[DESIGN.md](docs/DESIGN.md), [INTERACTION.md](docs/INTERACTION.md),
[TECH-STACK.md](docs/TECH-STACK.md), [PLAN.md](docs/PLAN.md), and
[BACKLOG.md](docs/BACKLOG.md).

## License

[MIT](LICENSE) © 2026 Ilham Rizky Akbar
