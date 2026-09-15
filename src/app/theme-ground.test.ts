import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE ADAPTIVE GROUND'S LIGHT PALETTE IS A COPY, SO SOMETHING HAS TO HOLD IT.
 *
 * `data-ground` on the gallery region repoints the whole palette inside it, so
 * the icons always land on a surface they read against. The DARK half costs
 * nothing — `[data-ground="dark"]` rides the theme block that already exists,
 * as a second selector on the same rule. The LIGHT half cannot: the light
 * palette lives in Tailwind's `@theme`, which is `:root`-only and cannot be
 * re-applied to a subtree, so those values are written out a second time.
 *
 * A HAND-COPIED PALETTE THAT SILENTLY DRIFTS is the exact failure that invites.
 * Change `--grid-card` in `@theme` and the page updates while a light gallery
 * on a dark page keeps the old tile, which is a bug nobody would think to look
 * for in a token file. So this parses the stylesheet and requires every value
 * under `[data-ground="light"]` to equal the one its source declares.
 *
 * It reads the CSS as TEXT rather than through a parser, deliberately. The file
 * is the artefact that ships; a parser would introduce a second opinion about
 * what it says, and the thing under test is literally "are these two strings
 * the same".
 */

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Every `--prop: value;` inside one brace-balanced block, in source order. */
function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    // Collapse the line wrapping the formatter introduces in long shadow
    // values, so `0 2px 4px\n    rgb(...)` compares equal to one line of it.
    out.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }
  return out;
}

/** The block a selector opens, from its `{` to the matching `}`. */
function blockAfter(source: string, from: number): string {
  const open = source.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) {
      return source.slice(open + 1, i);
    }
  }
  throw new Error("unbalanced block");
}

/** Every block a selector opens anywhere in the file. */
function blocksFor(selector: string): string[] {
  const blocks: string[] = [];
  let at = 0;
  for (;;) {
    const found = CSS.indexOf(selector, at);
    if (found === -1) return blocks;
    // Selectors only: skip the same text appearing inside a comment.
    const before = CSS.lastIndexOf("/*", found);
    const closed = CSS.lastIndexOf("*/", found);
    if (before === -1 || closed > before) blocks.push(blockAfter(CSS, found));
    at = found + selector.length;
  }
}

/**
 * The LIGHT source of truth: Tailwind's `@theme` plus the plain `:root` blocks
 * that carry everything `@theme` does not. Dark blocks are excluded by
 * construction — they are opened by `:root[data-theme="dark"]` or sit inside a
 * `prefers-color-scheme` media query, neither of which is a bare `:root {`.
 */
function lightSource(): Map<string, string> {
  const source = new Map<string, string>();
  for (const block of [...blocksFor("@theme {"), ...blocksFor("\n:root {")]) {
    for (const [prop, value] of declarations(block)) source.set(prop, value);
  }
  return source;
}

describe("the gallery's light ground", () => {
  it("declares nothing the light palette does not also declare", () => {
    const source = lightSource();
    const missing: string[] = [];

    for (const block of blocksFor('[data-ground="light"] {')) {
      for (const prop of declarations(block).keys()) {
        if (!source.has(prop)) missing.push(prop);
      }
    }

    expect(
      missing,
      "these are set on the light ground but nowhere in the light palette, so nothing keeps them honest",
    ).toEqual([]);
  });

  it("matches the light palette value for value", () => {
    const source = lightSource();
    const drifted: string[] = [];

    for (const block of blocksFor('[data-ground="light"] {')) {
      for (const [prop, value] of declarations(block)) {
        const expected = source.get(prop);
        if (expected !== undefined && expected !== value) {
          drifted.push(`${prop}: ${value} (source says ${expected})`);
        }
      }
    }

    expect(drifted, "the light ground has drifted from the light palette").toEqual(
      [],
    );
  });

  it("covers every token the dark ground repoints", () => {
    /* THE TWO HALVES HAVE TO COVER THE SAME SET. `[data-ground="dark"]` rides
       the existing theme blocks, so adding a token there is free — and a token
       that goes dark inside the region with no light counterpart is one that
       cannot come back when a dark PAGE shows a light gallery. That asymmetry
       is invisible until somebody picks black on a dark system theme. */
    const dark = new Set<string>();
    for (const block of blocksFor('[data-ground="dark"] {')) {
      for (const prop of declarations(block).keys()) dark.add(prop);
    }
    const light = new Set<string>();
    for (const block of blocksFor('[data-ground="light"] {')) {
      for (const prop of declarations(block).keys()) light.add(prop);
    }

    expect(dark.size, "the dark ground repoints nothing at all").toBeGreaterThan(
      30,
    );
    expect(
      [...dark].filter((prop) => !light.has(prop)),
      "repointed for a dark gallery but never restored for a light one",
    ).toEqual([]);
  });
});
