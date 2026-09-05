/**
 * COPY-AS FORMATS — the same drawing, written three ways.
 *
 * BACKLOG §E asked for "JSX / React component / data URI"; this is that list,
 * and it is deliberately short. Lucide offers eight FRAMEWORK tabs because it
 * ships eight packages. Pixit ships none — Resources lists the npm package, the
 * icon font and the sprite sheet as planned — so a React tab reading
 * `import { FloppyDisk } from "pixit"` would be code that does not run.
 *
 * WHAT IS OFFERED IS THEREFORE FORMATS, NOT FRAMEWORKS: every one of these is
 * built from cells we already have, with no package behind it. When the package
 * lands the tab strip is already the right container for the framework tabs.
 *
 * AND THE LIST STOPS WHERE A TAB WOULD DUPLICATE ITS NEIGHBOUR. Vue, Svelte,
 * Preact and Solid all take raw SVG markup as-is, so an SFC tab would print the
 * SVG tab's own string inside a `<template>` — a tab that says nothing new.
 * React earns its place because a component genuinely differs: it needs the
 * wrapper, the `size` prop and the spread. HTML and CSS earn theirs because
 * both are artifacts you would otherwise assemble by hand around the data URI.
 *
 * EVERY FORMAT IS BUILT FROM THE SVG THE GALLERY IS SHOWING, never from the
 * stored `IconDef` — so the display's colour, cell shape and size travel into
 * all three, which is the rule the rest of the exports already follow.
 *
 * IT LIVES IN THE ENGINE because it is a pure string transform with no
 * rendering dependency, which is where TECH-STACK.md's one architectural rule
 * puts it. The panel that shows these knows nothing about how they are made.
 */

export type CopyFormat = "svg" | "react" | "html" | "css" | "uri";

/** Print order, which is also the tab order. */
export const COPY_FORMATS: readonly CopyFormat[] = [
  "svg",
  "react",
  "html",
  "css",
  "uri",
];

/** What a person reads. The engine keeps its own words, the UI keeps these. */
export const FORMAT_LABELS: Record<CopyFormat, string> = {
  svg: "SVG",
  react: "React",
  html: "HTML",
  css: "CSS",
  uri: "Data URI",
};

/** The clipboard's own name for each, used in the confirmation toast.
 *
 * THE NOUN MAY DIFFER FROM THE MENU'S LABEL; THE CASE MAY NOT. A tab reads
 * `React` because it is naming a format in a strip of five, and a toast reads
 * `React component copied` because it is a sentence and can afford the extra
 * word. What was wrong was `Copy Data URI` confirming as `data URI copied` —
 * the same noun, recased, which reads as a different thing rather than as a
 * fuller description of the same one. */
export const FORMAT_NOUNS: Record<CopyFormat, string> = {
  svg: "SVG",
  react: "React component",
  html: "HTML",
  css: "CSS rule",
  uri: "Data URI",
};

/**
 * `floppy-disk` -> `FloppyDisk`.
 *
 * Ids are kebab-case and validated at module load, so this only ever sees
 * lower-case words and hyphens — but it tolerates anything, because a
 * component name that came out empty would produce source that does not parse.
 */
export function componentName(name: string): string {
  const pascal = name
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  // A JSX component must start with a capital letter, and an identifier cannot
  // start with a digit. `4k-video` would otherwise emit `4KVideo`.
  return /^[A-Za-z]/.test(pascal) ? pascal : `Icon${pascal}`;
}

/**
 * The SVG as a React component.
 *
 * A "JSX" tab that emitted the element alone would print the SAME STRING as the
 * SVG tab: this writer uses no hyphenated attributes, and `viewBox` is already
 * camelCase, so the markup is valid JSX untouched. A tab that silently
 * duplicates its neighbour is worse than no tab, so this is the component —
 * which is what §E asked for and is the thing that is actually different.
 *
 * `{...props}` comes LAST so a caller can override anything, and `size` is
 * lifted to a prop because it is the one dimension the gallery's own rail
 * already treats as variable.
 */
function toReact(svg: string, name: string): string {
  const component = componentName(name);
  // The rendered size is a prop, so its literal comes out of the markup.
  const body = svg
    .replace(/ width="\d+" height="\d+"/, " width={size} height={size}")
    .replace(/<svg /, "<svg ")
    .replace(/>$/, ">");
  const open = body.indexOf(">");
  const attrs = body.slice(0, open);
  const rest = body.slice(open);
  return (
    `export function ${component}({ size = 24, ...props }) {\n` +
    `  return (\n` +
    `    ${attrs} {...props}${rest}\n` +
    `  );\n` +
    `}\n`
  );
}

/**
 * A data URI, percent-encoded rather than base64.
 *
 * Base64 is the other convention and it is worse here on both counts: it is
 * opaque, so the panel would show 800 characters of noise instead of something
 * you can read, and `btoa` throws on anything outside Latin-1. Percent-encoding
 * survives any title and stays inspectable. It also encodes `#`, which a hex
 * fill needs before it can sit inside a CSS `url()`.
 */
function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * An `<img>` carrying the drawing inline.
 *
 * The one format here that needs no build step and no framework at all: paste
 * it into a page and the icon is there. It is also part of why the data URI is
 * percent-encoded rather than base64 — this has to sit inside an attribute.
 */
function toHtml(svg: string, name: string, size: number): string {
  return (
    `<img src="${toDataUri(svg)}"\n` +
    `     alt="${escapeAttr(name)}" width="${size}" height="${size}">\n`
  );
}

/**
 * A CSS rule, which is what a data URI is most often FOR.
 *
 * `background-size: contain` rather than relying on the intrinsic size, so the
 * rule survives being applied to a box of another size — which is the thing
 * people do to icon backgrounds constantly.
 */
function toCss(svg: string, name: string, size: number): string {
  return (
    `.icon-${cssClass(name)} {\n` +
    `  width: ${size}px;\n` +
    `  height: ${size}px;\n` +
    `  background-image: url("${toDataUri(svg)}");\n` +
    `  background-size: contain;\n` +
    `  background-repeat: no-repeat;\n` +
    `}\n`
  );
}

/** Ids are kebab-case and validated at load, so this is belt and braces. */
function cssClass(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe.length === 0 ? "icon" : safe;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * The one entry point. `svg` is what the gallery is displaying, and `size` is
 * the rail's value — already baked into the SVG's own `width`/`height`, and
 * needed again here because HTML and CSS carry it outside the markup.
 */
export function formatIcon(
  format: CopyFormat,
  svg: string,
  name: string,
  size = 24,
): string {
  switch (format) {
    case "svg":
      return svg;
    case "react":
      return toReact(svg, name);
    case "html":
      return toHtml(svg, name, size);
    case "css":
      return toCss(svg, name, size);
    case "uri":
      return toDataUri(svg);
  }
}
