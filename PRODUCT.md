# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Developers and designers looking for pixel icons.** They land on the
  gallery, search or filter the set, set the color, cell shape and size they
  need, and copy or download an icon for their own project. They do not sign in.
- **The owner (Ilham).** The only person who can reach the composer in v1, and
  the only author of the set.
- *Inferred, not confirmed:* people drawn by the arcade and retro-game niche
  itself, who browse the set for its character as much as for a specific glyph.

## Product Purpose

Pixit is an open-source pixel, 32-bit and arcade icon set, plus an in-browser
composer for drawing new icons on an 11 by 11 grid. The public gallery exists so
anyone can find an icon and use it immediately, in the color, shape and size
they chose. Success is a visitor leaving with an icon in their project, and the
set reading as one coherent family rather than a pile of unrelated glyphs.

## Positioning

Every icon is its own cell data on the same 11 by 11 grid, drawn cell by cell,
and the composer that draws them is part of the product rather than a private
tool. Neighbors like Phosphor, Lucide and Nucleo are vector sets; Pixit's
differentiators are the pixel niche and the composer.

## Operating Context

- Browsed on desktop and phone. Search, category filter, and the display
  controls (color, shape, size) change the whole set at once.
- Exports follow the display: copy as SVG, React, HTML, CSS or a data URI, or
  download SVG and PNG, carrying the chosen color, cell shape and size.
- A selected icon gets an address, `?icon=<id>`, with no per-icon page.

## Capabilities and Constraints

- **The composer is owner-only in v1.** It is gated server-side, and no public
  page may link to it. Public contribution is a later, invite-only phase.
- **Grid state is the source of truth.** An icon is its 121 cells; SVG and PNG
  are render targets. The grid is 11 by 11 on a 44 by 44 viewBox.
- **The gallery renders one color at a time.** Seeds are authored in a single
  color, as outlines. Display settings never modify stored cells.
- **Taxonomy is closed:** six categories (interface, media, arcade, system,
  communication, nature). Names and tags are kebab-case.
- **The seeds stay in the repo.** Postgres adds published icons; with no
  database the gallery shows the registry alone.
- **Deferred, do not build:** public Contribute flow, curation, an npm package,
  an icon font.
- **Stack:** Next.js (App Router), TypeScript, Tailwind v4, deployed to
  Cloudflare Workers. No three.js on the public route.
- **Third-party sets are concept sources, not imports.** On 2026-09-15, 84 base
  icons were chosen from Regen Icons (MIT) and redrawn cell by cell; nothing is
  traced or downsampled. Credit lives in `src/registry/icons.ts`. Any future
  set needs its license checked first.

## Brand Commitments

- Name: **Pixit**. MIT licensed. Author credit: lovvfat.
- Page copy is American English ("color") and uses no em dashes.
- Press Start 2P is the pixel face for the wordmark and headings.
- Copy is active voice and literal; names describe what the user sees.

## Evidence on Hand

- The icon registry (`src/registry/icons.ts`) and its count, which is real and
  may be printed.
- No testimonials, customers, download numbers or benchmarks exist. Do not
  invent any.

## Product Principles

1. **The icons are the stars.** Chrome frames the set; it never out-details it.
2. **What you see is what you copy.** Display settings travel into exports.
3. **Owner-only until contribution is real.** Never ship a reachable composer.
4. **Open source means it works when cloned.** Nothing depends on someone
   else's database.

## Accessibility & Inclusion

WCAG AA contrast (checked with axe and a contrast suite), full keyboard reach
with visible focus, a `prefers-reduced-motion` path for every animation, and
layouts that work down to phone width.
