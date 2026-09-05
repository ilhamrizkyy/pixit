import { describe, expect, it } from "vitest";
import { recolorCells } from "./color";
import {
  COPY_FORMATS,
  FORMAT_LABELS,
  componentName,
  formatIcon,
} from "./formats";
import { cellsToSvg } from "./svg";
import { getIcon } from "@/registry";

const ICON = getIcon("floppy-disk")!;
const SVG = cellsToSvg(ICON.cells, { title: ICON.name, size: 24 });

describe("componentName", () => {
  it("pascal-cases a kebab-case id", () => {
    expect(componentName("floppy-disk")).toBe("FloppyDisk");
    expect(componentName("arrow-right")).toBe("ArrowRight");
    expect(componentName("heart")).toBe("Heart");
  });

  /* A JSX component must start with a capital, and an identifier cannot start
     with a digit — so a name that begins with one has to be rescued rather than
     emitted as source that does not parse. */
  it("never emits an identifier that starts with a digit", () => {
    expect(componentName("4k-video")).toBe("Icon4kVideo");
    expect(/^[A-Za-z_$]/.test(componentName("4k-video"))).toBe(true);
  });
});

describe("formatIcon", () => {
  it("passes the SVG through untouched", () => {
    expect(formatIcon("svg", SVG, ICON.name)).toBe(SVG);
  });

  /* THE POINT OF THE REACT TAB. This writer uses no hyphenated attributes and
     `viewBox` is already camelCase, so the raw markup is valid JSX — which
     means an "element only" tab would print the SAME STRING as the SVG tab. The
     component is the thing that is actually different, and this is the
     assertion that keeps it that way. */
  it("does not duplicate the SVG tab", () => {
    expect(formatIcon("react", SVG, ICON.name)).not.toBe(SVG);
  });

  it("writes a React component named after the icon", () => {
    const source = formatIcon("react", SVG, ICON.name);
    expect(source).toContain("export function FloppyDisk(");
    expect(source).toContain("{ size = 24, ...props }");
    // Spread LAST, so a caller can override anything the writer emitted.
    expect(source.indexOf("{...props}")).toBeGreaterThan(source.indexOf("<svg"));
    // The rendered size became the prop rather than staying a literal.
    expect(source).toContain('width={size} height={size}');
    expect(source).not.toContain('width="24"');
  });

  it("keeps the drawing itself byte-for-byte inside the component", () => {
    const source = formatIcon("react", SVG, ICON.name);
    const rects = SVG.match(/<rect[^>]*\/>/g) ?? [];
    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) expect(source).toContain(rect);
  });

  /* PERCENT-ENCODED, NOT BASE64 — and `#` has to be encoded or the URI cannot
     sit inside a CSS `url()`, which is most of what a data URI is for. */
  it("writes a percent-encoded data URI whose hex is escaped", () => {
    const uri = formatIcon("uri", SVG, ICON.name);
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    expect(uri).not.toContain("#");
    expect(decodeURIComponent(uri.slice("data:image/svg+xml,".length))).toBe(SVG);
  });

  /* EVERY FORMAT IS BUILT FROM WHAT THE GALLERY IS SHOWING. Recolouring the
     cells has to reach all three, or "what you see is what you copy" holds for
     one tab and quietly fails for the other two. */
  it("carries the display's colour into every format", () => {
    const red = cellsToSvg(recolorCells(ICON.cells, "#dc2626"), { size: 24 });
    for (const format of COPY_FORMATS) {
      const out = formatIcon(format, red, ICON.name);
      // HTML, CSS and the URI all carry the colour percent-encoded.
      const needle = format === "svg" || format === "react"
        ? "#dc2626"
        : encodeURIComponent("#dc2626");
      expect(out, `${format} lost the display colour`).toContain(needle);
    }
  });

  /* THE `<img>` AND THE CSS RULE both wrap the data URI in something you would
     otherwise assemble by hand, and both need the SIZE — which lives outside
     the markup in these two and inside it in every other. */
  it("writes an <img> that carries the drawing and the chosen size", () => {
    const out = formatIcon("html", SVG, ICON.name, 48);
    expect(out).toContain('<img src="data:image/svg+xml,');
    expect(out).toContain(`alt="${ICON.name}"`);
    expect(out).toContain('width="48" height="48"');
  });

  it("writes a CSS rule whose URI is quotable and whose box is the size", () => {
    const out = formatIcon("css", SVG, ICON.name, 48);
    expect(out).toContain(`.icon-${ICON.name} {`);
    expect(out).toContain("width: 48px;");
    expect(out).toContain("background-size: contain;");
    /* THE URI SITS INSIDE `url("…")`, so an unescaped `#` would end the value
       at the first hex colour. Percent-encoding is what makes that safe, and
       this is the assertion that would catch a switch to base64 breaking it. */
    const inner = /url\("([^"]*)"\)/.exec(out);
    expect(inner, "the URI is not quotable inside url()").not.toBeNull();
    expect(inner![1]).not.toContain("#");
  });

  /* A TAB THAT PRINTS ITS NEIGHBOUR'S STRING SAYS NOTHING. This is the rule
     that keeps Vue, Svelte and the rest off the strip — they take raw SVG, so
     an SFC tab would be the SVG tab inside a `<template>`. */
  it("gives every format a string no other format produces", () => {
    const seen = new Map<string, string>();
    for (const format of COPY_FORMATS) {
      const out = formatIcon(format, SVG, ICON.name, 24);
      const clash = seen.get(out);
      expect(clash, `${format} duplicates ${clash}`).toBeUndefined();
      seen.set(out, format);
    }
  });

  it("labels every format it can emit", () => {
    for (const format of COPY_FORMATS) {
      expect(FORMAT_LABELS[format]).toBeTruthy();
      expect(formatIcon(format, SVG, ICON.name).length).toBeGreaterThan(0);
    }
  });
});
