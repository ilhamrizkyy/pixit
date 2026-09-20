# TECH-STACK.md — Stack & architecture

> How the pieces fit. Guiding rule: **decouple the icon engine from the
> presentation**, so the toy can start simple (DOM/CSS-3D) and level up to
> Three.js without touching the logic.

## The one architectural rule

Two layers with a hard boundary:

- **Engine (pure TypeScript, no rendering):** the `IconDef` model + every
  operation — fill, clear, drag-fill, mirror, flip, rotate, undo/redo, HSL color
  math, SVG/PNG export, SVG import. Fully unit-testable. Knows nothing about
  DOM / Canvas / WebGL.
- **Presentation:** renders the engine's state and forwards input to it. Freely
  swappable/upgradable.

This boundary is what lets the composer ship as DOM now and become a real 3D toy
later — a presentation swap, not a rewrite.

## Foundation (all phases)

- **Next.js (App Router) + TypeScript + Tailwind.** Next hosts the public
  gallery / Guide / Resources (static, fast, SEO), the API routes for owner
  auth + save, **and** the composer canvas. A Three.js canvas mounts inside a
  Next page with no friction. **Next.js is not in tension with Three.js/anime.js
  — it's the platform they run on.** The earlier worry that "Next.js won't work"
  is a misconception: it stays; the 3D/animation are added *inside* it.
- **Zustand** — composer editor state (grid, color, tools, history). Light, and
  plays cleanly with the engine boundary.
- **culori** — color conversions (HSL↔hex), nearest-color, contrast checks.
  Replaces the prototype's hand-rolled math.
- **Cloudflare Workers** — hosting, via the **`@opennextjs/cloudflare`**
  adapter (Next 16 supported). Chosen over Vercel on 2026-08-21. Nothing in the
  app blocked it: no `next/image`, no Node built-ins in server code, no
  middleware, and fonts self-host at build. Five of six routes prerender and
  `/create` is `force-dynamic`, so there is no ISR — which is why
  `open-next.config.ts` declares no R2 incremental cache and no images binding.
  - **That was four of six for a while, and `/` was the one that fell out
    (found and fixed 2026-09-18, in the deploy pre-flight).** The gallery's
    Supabase read carried `cache: "no-store"`, which makes the route that reads
    it dynamic — so the home page, the route almost all traffic lands on, ran a
    Worker and a network round trip to Postgres before it could paint. The
    build's own route table said so plainly (`ƒ /` against `○` everywhere
    else) and nobody had read it.
  - **The read is `force-cache` now and the published set is baked at build.**
    That is not a staleness trade, because there is no publish path to be stale
    against: RLS has no insert policy and the browser route is deliberately
    unbuilt (BACKLOG §H), so a row only reaches the table through
    `npm run db:seed` on the owner's machine, which is the machine deploys come
    from. The set changes when the site is deployed. Verified in the bundle:
    `/` ships as a prerendered `index.cache` entry with the Supabase response
    beside it in `__fetch`.
  - **The build now reports what it baked** (`Pixit: baked N published icon(s)
    from Supabase`). Once this read decides the contents of a static page, a
    paused project stops being a slow request that recovers and becomes a
    deploy that silently ships without the published icons. The free tier
    pauses after a week, so that is the expected path; a missing line in the
    build log is the signal.
  `esbuild` is a direct devDependency because the adapter imports it and npm
  does not hoist it out of `@opennextjs/aws`.

## Composer experience layer (Phase 3, stageable)

- **three is PINNED to 0.182.0**, not on a caret range. `@react-three/fiber`
  9.7 (the current release) still constructs `new THREE.Clock()`, and three
  deprecated Clock in favour of Timer in r183 — so every newer three prints a
  deprecation warning we cannot fix from our own code. Nothing we use changed
  in r183–r185, so the pin costs nothing. **Unpin when R3F migrates to
  THREE.Timer**, and delete this note with it.
- **React Three Fiber (Three.js) + drei** — the real 3D "real-world" toy: actual
  depth, material/lighting on the blue frame, knobs that turn in 3D, a screen
  with a genuinely recessed material (this is what finally fixes the snub-in).
  - **Approach:** keep the 11×11 editing as a robust DOM/SVG grid overlaid on the
    screen (drei `Html`) **or** raycast a subdivided plane — either way the
    **engine stays the source of truth** and keyboard/a11y keep working. Never
    trap editing inside a canvas with no DOM fallback.
  - **Staging:** ship a polished **DOM + CSS-3D** toy first (Phases 2–3), then
    upgrade the shell to R3F. Because of the engine boundary, logic is untouched.
  - **Where it stands (2026-08-20):** the knobs and the screen's well are R3F;
    the frame, bezel and buttons are still CSS. Both meshes follow the same
    rule — they render form, never state. The knob draws a dial and reads an
    angle; the well draws a recess and reads nothing. Every control they sit
    under is DOM, so `useWebGL` returning false costs appearance only.
- **anime.js** (your pick) — timeline animation: knob inertia/settle, button
  press, the left→right erase sweep, view transitions. *(Framer Motion is the
  more React-idiomatic alternative — pick one, don't run both.)*

## Icon pipeline

- **SVGO** — optimize every exported/stored icon.
- **SVGR** — generate React components from the set for the future npm package.
- A small **build script** turns the registry → package + sprite sheet +
  (later) web font.

## The Cloudflare build bakes `.env` — and that reaches the owner gate

**Found by test on 2026-08-21, and it is the one Cloudflare difference that
matters.** The adapter reads `.env` files at BUILD time and writes what it finds
into `.open-next/cloudflare/next-env.mjs`, which the worker loads into
`process.env` at runtime.

That is safe on Vercel and is not here, because of *where the build runs*.
Vercel builds on their machine from the git checkout, where `.env.local` does
not exist, so an unset variable means a closed gate. Cloudflare's documented
workflow is `wrangler deploy` **from your own machine** — where `.env.local`
says `PIXLE_COMPOSER_ENABLED=true`, because that is what the file is for.

Measured, with no `.env.local` and no `.dev.vars` present at run time:

| Bundle baked with | Worker variable | `/create` |
|---|---|---|
| `true`  | *(none)* | **200, composer served** |
| `false` | *(none)* | 404 |
| `true`  | `false`  | 404 — the variable wins |

So a Worker variable overrides the bake when it is set, and the bake decides
when it is not. Leaving the variable unset — correct advice on Vercel — would
have shipped a publicly reachable composer here.

**The fix is `scripts/build-cloudflare.mjs`,** which `npm run deploy` and
`npm run preview` both go through. It runs the adapter with the flag forced to
`false` (an explicit environment value outranks `.env.local`), then reads the
generated bundle back and **exits non-zero if the flag is baked open**. Verified
in both directions: a deliberately-open build fails it, a normal build passes,
and the resulting bundle 404s `/create` with no variables present. Local preview
still works, because `.dev.vars` sets the variable on the Worker and the Worker
wins.

A rule that depends on remembering to set a variable is not a rule.

## Owner auth + data

**Postgres (Supabase), added 2026-08-21.** Icons published from the composer
persist in `public.icons`; the repo's seed icons stay in `src/registry/icons.ts`
and the gallery merges the two, registry first.

- **The seeds stay in the repo, permanently.** Pixit is MIT. A clone that
  renders nothing without access to someone else's database is not an
  open-source icon set, so `fetchPublishedIcons` returning `[]` — no
  credentials, project paused, network down — degrades to the seeded gallery
  rather than to an error. Supabase's free tier pauses a project after a week
  of inactivity, which makes that the expected path, not the exotic one.
- **Rows carry an ART MAP**, the same 11-row form the registry is written in,
  so a row maps to an `IconDef` through `cellsFromArt` — already written,
  already tested. One representation across repo and database instead of two
  that have to agree. A row is also readable: you can see the icon in the table.
- **No `@supabase/supabase-js`.** Its value is typed query building, realtime,
  storage and auth, and this app uses none of them — it needs two HTTP calls
  against PostgREST. `fetch` does that, runs natively on Workers, and keeps the
  dependency list honest.
- **Reads never throw.** They run while rendering the public gallery, so a bad
  row is dropped and counted rather than allowed to blank the homepage. That is
  the opposite of the composer's import, which refuses outright — an import is
  one drawing a person just chose, and refusing it is a complete answer.
  - **And the read happens at BUILD time, once** (2026-09-18), not per request.
    See the Cloudflare section above for why, and for what would make it wrong
    again. The never-throws rule is unchanged and still load-bearing: a build
    against a paused project degrades to the seeded gallery rather than failing,
    and says so in the log.
- **Writes are server-only.** RLS has a select policy and no insert/update/
  delete policy at all, so no browser-reachable key can write. The service-role
  key bypasses RLS and lives in `.env.local` for `npm run db:seed`.

**The publish-from-the-browser route is deliberately not built yet.** It needs
sign-in first. An endpoint protected only by `PIXLE_COMPOSER_ENABLED` would be a
public write path on any Worker with the composer switched on, because that flag
is per-deployment and not per-person. Until then, publishing runs from the
owner's own machine.

**The service-role key is the second thing the Cloudflare build guard strips.**
Measured: a key in `.env.local` is baked verbatim into `.open-next/cloudflare/
next-env.mjs`. `scripts/build-cloudflare.mjs` clears it for the build and
refuses to finish if it survives — and both halves, the stripping and the
detection, are verified separately (`--verify-only` exists for exactly that).

- **idb-keyval** (IndexedDB) — local composer drafts and locally saved icons.
  Still browser-local, still shown dashed in the gallery: a drafts shelf, not a
  publish step.

## Search & quality

- **Fuse.js** — fuzzy gallery search once the set grows.
- **Vitest** — unit-test the engine (transforms, import/export, color).
- **Playwright** — the composer's POINTER paths, which Vitest cannot reach:
  jsdom has no layout, so a synthetic pointerdown there proves a handler ran,
  not that it ran with the cell under the pointer. Two projects: `desktop`
  (mouse) and `touch` (iPhone 13, `hasTouch`), because a touch context sends
  `pointerType: "touch"`, no hover events, and the compact layout — three ways
  this breaks on a phone while every mouse test stays green. Runs against a
  production build on port 3100, so a dev server can stay up beside it, and so
  the dev overlay is not sitting over the toy's left knob.

  It is also the only place the 3D is actually *seen*: WebGL is unavailable in
  plain headless Chrome, which silently falls back to CSS.

## Layer → tool → phase

| Layer                         | Tool                                   | Phase        |
|-------------------------------|----------------------------------------|--------------|
| App shell / routing / hosting | Next.js, TS, Tailwind, Cloudflare      | 0            |
| Icon engine                   | plain TS (+ culori, Zustand)           | 1–2          |
| Composer UI (DOM/CSS-3D)      | React + CSS                            | 2–3          |
| 3D toy                        | React Three Fiber / Three.js, drei     | 3 (stretch)  |
| Animation                     | anime.js                               | 3            |
| Icon pipeline                 | SVGO, SVGR, build script               | 3–4          |
| Owner auth + save             | Supabase (or Octokit)                  | 3            |
| Local drafts                  | idb-keyval                             | 2            |
| Search                        | Fuse.js                                | 1 (or later) |
| Testing                       | Vitest, Playwright                     | 2–4          |

## Honest minimum for v1

**Next.js + TS + Tailwind + Zustand + culori + SVGO + Supabase (auth).**
React Three Fiber and anime.js are the **experience layer** — high value, but
stage them so they never block the ship date. Everything else is "add it when
the need actually shows up."
