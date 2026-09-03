# PLAN.md — Timeline (target: under 1 month)

> Solo build with Claude Code. The v9 prototype already de-risks the hardest
> logic, so the month is mostly productionizing + the experience layer. Ranges
> are ~working days over ~4 weeks — slot them into your real calendar.

## Guardrails baked into the plan

- Public = gallery only. **The composer is owner-only** — build the gate no later
  than Phase 3, and never deploy it publicly reachable.
- The **engine is decoupled from presentation** from day one (see @docs/TECH-STACK.md).
- The full **Three.js 3D toy is a stretch goal.** A polished DOM/CSS-3D composer
  is a valid v1 — protect the ship date over the 3D.

## Phase 0 — Foundation · Days 1–2

Goal: a deployable skeleton with the rules encoded.
- Next.js + TS + Tailwind repo; @docs/DESIGN.md tokens as CSS variables; MIT LICENSE;
  CLAUDE.md at the repo root.
- Define the **IconDef** type + a small **engine** module (data + op stubs); seed
  ~6 icons in a static registry.
- Deploy an empty shell (host: Cloudflare Workers — see @docs/TECH-STACK.md).

Exit: repo builds green and deploys; tokens live; engine module compiles.

## Phase 1 — Gallery (public) · Days 3–8 → ran long, by choice

Goal: the public product, read-only.

**Done, as originally scoped**
- Gallery: sidebar, icon grid, detail modal (Copy SVG / Download SVG+PNG /
  Copy name); reads the static registry; empty state; focus + a11y.
- Guide + Resources pages; Contribute = "coming soon".
- 24 seed icons across all six categories.

**Added during the phase** — not in the original scope. The plan grew because
the interface bar rose, which is a deliberate trade, not slippage to hide:
- Whole-app **Light/Dark theme** (token redefinition, system default).
- **Colour** control: one hex recolours the whole gallery, Lucide-style.
- **Padding** (0–3 cells) and **Transform** (flip H/V, rotate). *Both removed
  again on 2026-08-28 with the board rebuild — see @docs/BACKLOG.md §D.*
- **Exports follow display settings** — what you see is what you copy.
- Mobile pass to a **Lucide-like layout**: square cards everywhere, 4-column
  grid, hamburger nav, and a **bottom-sheet** filter surface with Apply/Reset.
- **Vitest** pulled forward from Phase 2: 143 tests over engine + registry.

Exit: **met.** A stranger can browse, search, filter, and copy/download icons
on desktop and mobile.

**Deferred out of this phase:** the `/guide` interface pass (content is done),
and Fuse.js search (unnecessary at 24 icons).

## Phase 2 — Composer engine + DOM UI (owner build) · Days 9–16

Goal: a fully functional composer (DOM/CSS-3D) wired to the engine.
- Port v9 into engine + React: 11×11 grid, **drag-fill**, second-tap clear,
  multi-color **HSL picker** (2 knobs + saturation + hex + presets + eyedropper),
  transforms (mirror / flip / rotate), progressive **slide-to-clear**,
  undo/redo, metadata dock, Save, Export, **Import (in the dock)**.
- Apply the **polish fixes** (@docs/BACKLOG.md A): thinner bezel, better snub-in,
  slimmer dock, corner knobs (bigger), remove the pixel count.
- idb-keyval drafts. (Vitest already landed in Phase 1 — extend it to the new
  composer ops rather than setting it up.)

Confirmed for this phase: **keep both knobs** — they are the toy's identity,
they choose the authoring colour, and they gain a second job if duotone ever
lands. Drag-fill **overwrites** filled cells it crosses.

Exit: the owner can draw a multi-color icon end-to-end and it shows in the
gallery; engine tests pass.

## Phase 3 — Access + experience + content · Days 17–24

Goal: lock it down, make it feel real, finish content.
- **Owner auth gate** (Supabase) on the composer route — server-side, not a
  hidden button. Wire Save to persist.
- Experience layer: **anime.js** micro-interactions; begin the **R3F 3D toy**
  shell (stretch — if it slips, keep the polished CSS-3D toy).
- Fill in Guide + Resources; lock **taxonomy** + **safe area** with the owner.

Exit: composer is owner-only and persists; the toy feels tactile; content pages
are real.

**Where it stands (2026-08-20).** Owner-only: MET, by the env gate — closed by
default, checked in the route handler, `/create` 404s without it. Tactile: MET.
Persists: met by a **Copy entry** action rather than a backend. The composer
emits the registry source for the owner to paste and commit, which closes the
loop the set actually needs and matches CLAUDE.md's "static registry in the
repo". Supabase stays parked (BACKLOG §G) — it buys authoring on the deployed
site, which the owner does not need to author locally.

## Phase 4 — Ship v1 · Days 25–30

Goal: production-ready launch.
- SVGO pipeline on stored icons; (optional) package/sprite build script.
- QA: Playwright **(53 tests)**; a11y **(axe, clean)**; cross-browser **(clean)**;
  reduced-motion **(verified, not assumed)**.
- Export size: **SVGO was not the answer.** Icons are stored as cells, not SVG,
  and the writer already merged horizontal runs — so a build-time optimiser had
  nothing to optimise and could not have run client-side where the exports
  actually happen. The real waste was every rect repeating the same `fill`. The
  dominant colour now sits on the root and its rects inherit: **807 → 626 bytes
  average, 22% smaller**, and the pasted markup is legible.
- **Remaining: deploy.**

  Pulled forward from Phase 4 because it covered the one gap Vitest structurally
  could not: jsdom has no layout, so a synthetic pointerdown proves a handler
  ran, not that it ran with the cell the user was over. Drag-fill (including the
  rectangle SHRINKING as the pointer returns), second-tap clear, erase-drag,
  one-undo-step, the slide-to-clear wipe, knob drag, and a real touch drag over
  CDP are now covered against a production build.

  It also gave the project its first browser with WebGL. Everything in the
  composer's 3D had been verified numerically and never seen; the first look
  found the knob's dish reading flat, traced to a fill light from below erasing
  the very shadow that makes a dish look sunken.
- README; final sweep of @docs/BACKLOG.md; deploy v1.
- **Host: Cloudflare Workers** (`@opennextjs/cloudflare`), decided 2026-08-21.
  `npm run deploy` goes through a build guard that refuses to produce a bundle
  with the owner gate baked open — see @docs/TECH-STACK.md for the measurements
  behind it.

Exit: v1 live — public gallery + owner-only composer, MIT, documented.

## Milestones

| #  | Milestone                          | ~Day |
|----|------------------------------------|------|
| M1 | Deployable shell + engine stub     | 2    |
| M2 | Public gallery usable              | 8 (ran long — interface raised) |
| M3 | Composer functional (DOM)          | 16   |
| M4 | Owner-gated + content done         | 24   |
| M5 | **v1 launched**                    | 30   |

## Deferred (post-v1 — "make it better later")

Public **Contribute** flow + **curation mode** + backend; the full **Three.js**
toy if not reached in Phase 3; **npm package** + **web font**; gallery
enhancements (@docs/BACKLOG.md E).

## Top risks

- **Interface polish expands scope.** Phase 1 ran well past its window because
  the bar rose mid-phase. Worth it, but the same pull will hit the composer —
  timebox the toy's polish separately from its function.
- **3D toy overruns** → mitigated: it's a stretch; CSS-3D ships if needed.
- **Auth/save scope creep** → keep v1 to a single-owner gate; real multi-user
  auth waits for the contribution phase.
- **Taxonomy indecision** blocks the composer category dropdown + gallery filter
  → lock a rough 5–8 category list early in Phase 2.
