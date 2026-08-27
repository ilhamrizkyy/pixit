import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cellsFromArt, toRegistryEntry } from "./authoring";
import { insertIconEntry, type RegistryDraft } from "./insert";
import { CATEGORIES } from "@/engine/types";

/**
 * These run against the REAL `icons.ts`, not a fixture.
 *
 * The transform's whole risk is that it assumes a shape the file might stop
 * having — a renamed header, a reordered section, a different way of closing
 * the array. A fixture would keep passing through exactly that drift and hand
 * the publish flow a corrupt registry. Reading the real file means restructuring
 * icons.ts fails here first.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("./icons.ts", import.meta.url)),
  "utf8",
);

const ART = [
  "...........",
  "...........",
  "...#####...",
  "...#...#...",
  "...#...#...",
  "...#...#...",
  "...#...#...",
  "...#####...",
  "...........",
  "...........",
  "...........",
];

function draft(over: Partial<RegistryDraft> = {}): RegistryDraft {
  return {
    id: "test-box",
    name: "test-box",
    category: "interface",
    tags: ["box", "square"],
    cells: cellsFromArt(ART, { "#": "#111111" }),
    createdAt: "2026-08-20T00:00:00.000Z",
    ...over,
  };
}

/** Where each category's header sits in a given source. */
function headerIndex(source: string, category: string): number {
  const at = new RegExp(String.raw`^ {2}/\* -+ ${category} -+ \*/$`, "m").exec(source);
  if (at === null) throw new Error(`no ${category} header`);
  return at.index;
}

describe("insertIconEntry", () => {
  it("lands inside its own category section, not at the end of the array", () => {
    const result = insertIconEntry(SOURCE, draft({ category: "arcade" }));
    const at = result.indexOf('id: "test-box"');

    expect(at).toBeGreaterThan(headerIndex(result, "arcade"));
    expect(at).toBeLessThan(headerIndex(result, "system"));
  });

  it.each(CATEGORIES.map((c, i) => [c.id, CATEGORIES[i + 1]?.id] as const))(
    "writes into the %s section and no further",
    (category, next) => {
      // BOTH bounds. A lower bound alone is satisfied by appending to the end
      // of the array, since that is after every header — the exact bug this
      // test exists to catch.
      const result = insertIconEntry(SOURCE, draft({ category }));
      const at = result.indexOf('id: "test-box"');

      expect(at).toBeGreaterThan(headerIndex(result, category));
      expect(at).toBeLessThan(
        next === undefined ? result.indexOf("\n];") : headerIndex(result, next),
      );
    },
  );

  it("appends to the LAST section, where the boundary is `];` and not a header", () => {
    // The final category has no header after it, so the section's end can only
    // be found from the array close. Getting this wrong writes the entry
    // outside the array, which does not compile.
    const last = CATEGORIES[CATEGORIES.length - 1].id;
    const result = insertIconEntry(SOURCE, draft({ category: last }));

    const at = result.indexOf('id: "test-box"');
    expect(at).toBeGreaterThan(headerIndex(result, last));
    expect(at).toBeLessThan(result.indexOf("\n];"));
  });

  it("changes nothing else in the file", () => {
    // The strongest guarantee this transform can offer: the diff is one added
    // block and no other byte moves. Anything else shows up in review as an
    // unrelated change to an icon nobody touched.
    const icon = draft();
    const result = insertIconEntry(SOURCE, icon);
    const added = `\n\n${toRegistryEntry(icon).replace(/\s*$/, "")}`;

    expect(result).toContain(added);
    expect(result.replace(added, "")).toBe(SOURCE);
  });

  it("separates entries by exactly one blank line, like the rest of the file", () => {
    const result = insertIconEntry(SOURCE, draft());
    expect(result).not.toMatch(/\n\n\n/);
    expect(result).toMatch(/ {2}\}\),\n\n {2}defineIcon\(\{\n {4}id: "test-box"/);
  });

  it("leaves the array closed and adds exactly one entry", () => {
    const count = (text: string) => text.split("defineIcon({").length - 1;
    const result = insertIconEntry(SOURCE, draft());

    expect(count(result)).toBe(count(SOURCE) + 1);
    expect(result.endsWith("\n")).toBe(true);
    expect(/^\];$/m.test(result)).toBe(true);
  });

  it("refuses an id the registry already publishes", () => {
    // An id is immutable once published (BACKLOG.md D), so a collision is not
    // something to resolve by suffixing — it has to stop here.
    expect(() => insertIconEntry(SOURCE, draft({ id: "arrow-right" }))).toThrow(
      /already in the registry/,
    );
  });

  it("refuses a duplicate even when the rest of the draft is different", () => {
    expect(() =>
      insertIconEntry(SOURCE, draft({ id: "cloud", category: "arcade" })),
    ).toThrow(/already in the registry/);
  });

  it("refuses when the section it was told to write into is missing", () => {
    const withoutArcade = SOURCE.replace(
      new RegExp(String.raw`^ {2}/\* -+ arcade -+ \*/$`, "m"),
      "",
    );
    expect(() => insertIconEntry(withoutArcade, draft({ category: "arcade" }))).toThrow(
      /No "arcade" section/,
    );
  });

  it("refuses when the array is never closed", () => {
    expect(() => insertIconEntry(SOURCE.replace(/^\];$/m, ""), draft())).toThrow(
      /closing/,
    );
  });

  it("accepts a second icon into a section it has already written to", () => {
    const once = insertIconEntry(SOURCE, draft());
    const twice = insertIconEntry(once, draft({ id: "test-box-2", name: "test-box-2" }));

    expect(twice.indexOf('id: "test-box"')).toBeLessThan(
      twice.indexOf('id: "test-box-2"'),
    );
    expect(twice).not.toMatch(/\n\n\n/);
  });
});
