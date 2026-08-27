import { describe, expect, it } from "vitest";
import { CELL_COUNT } from "@/engine/constants";
import { inSafeArea, isValidCells, toCoords, usedColors } from "@/engine/grid";
import { CATEGORIES } from "@/engine/types";
import { cellsFromArt, isKebabCase, toKebabCase } from "./authoring";
import { getIcon, icons } from "./icons";

const CATEGORY_IDS = new Set(CATEGORIES.map((entry) => entry.id));

describe("kebab-case naming", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(isKebabCase("arrow-right")).toBe(true);
    expect(isKebabCase("play")).toBe(true);
    expect(isKebabCase("ok123")).toBe(true);
  });

  it("rejects spaces, camelCase, underscores, and stray hyphens", () => {
    expect(isKebabCase("Arrow Right")).toBe(false);
    expect(isKebabCase("arrowRight")).toBe(false);
    expect(isKebabCase("arrow_right")).toBe(false);
    expect(isKebabCase("-lead")).toBe(false);
    expect(isKebabCase("trail-")).toBe(false);
    expect(isKebabCase("double--dash")).toBe(false);
  });
});

describe("toKebabCase", () => {
  it("splits camelCase rather than welding words together", () => {
    // It is shown as the suggested fix, so a wrong suggestion is worse than
    // none.
    expect(toKebabCase("arrowRight")).toBe("arrow-right");
    expect(toKebabCase("Arrow Right")).toBe("arrow-right");
    expect(toKebabCase("  --Floppy_Disk--  ")).toBe("floppy-disk");
  });

  it("is a fixed point for values already in kebab-case", () => {
    for (const icon of icons) expect(toKebabCase(icon.name)).toBe(icon.name);
  });
});

describe("cellsFromArt", () => {
  const solid = (char: string) => new Array(11).fill(char).join("");

  it("rejects the wrong number of rows", () => {
    expect(() => cellsFromArt(new Array(10).fill(solid(".")), {})).toThrow(
      /11 rows/,
    );
  });

  it("rejects a row of the wrong length", () => {
    const art = new Array(11).fill(solid("."));
    art[3] = ".".repeat(10);
    expect(() => cellsFromArt(art, {})).toThrow(/row 3/);
  });

  it("rejects a character with no palette entry", () => {
    const art = new Array(11).fill(solid("."));
    art[0] = "#" + ".".repeat(10);
    expect(() => cellsFromArt(art, {})).toThrow(/no palette entry/);
  });

  it("rejects a palette entry that is not a hex", () => {
    const art = new Array(11).fill(solid("."));
    art[0] = "#" + ".".repeat(10);
    expect(() => cellsFromArt(art, { "#": "red" })).toThrow(/not a valid hex/);
  });

  it("treats dots and spaces as empty and normalizes palette hex", () => {
    const art = new Array(11).fill(solid("."));
    art[0] = "#" + " ".repeat(10);
    const cells = cellsFromArt(art, { "#": "F00" });
    expect(cells[0]).toBe("#ff0000");
    expect(cells.filter((cell) => cell !== null)).toHaveLength(1);
  });
});

describe("the seed set", () => {
  it("is not empty", () => {
    expect(icons.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = icons.map((icon) => icon.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is retrievable by id, and misses return undefined", () => {
    expect(getIcon(icons[0].id)?.id).toBe(icons[0].id);
    expect(getIcon("no-such-icon")).toBeUndefined();
  });

  it.each(icons.map((icon) => [icon.name, icon] as const))(
    "%s is well-formed",
    (_name, icon) => {
      expect(isKebabCase(icon.id)).toBe(true);
      expect(isKebabCase(icon.name)).toBe(true);
      icon.tags.forEach((tag) => expect(isKebabCase(tag)).toBe(true));

      expect(CATEGORY_IDS.has(icon.category)).toBe(true);
      expect(icon.author).toBe("ilham");
      expect(icon.status).toBe("published");
      expect(Number.isNaN(Date.parse(icon.createdAt))).toBe(false);

      expect(isValidCells(icon.cells)).toBe(true);
      expect(icon.cells).toHaveLength(CELL_COUNT);
      expect(icon.cells.some((cell) => cell !== null)).toBe(true);
    },
  );

  it.each(icons.map((icon) => [icon.name, icon] as const))(
    "%s draws in exactly one color",
    (_name, icon) => {
      // The gallery renders single-color, so multi-color cell data would be
      // unreachable and would only surface as a surprise in an export.
      expect(usedColors(icon.cells)).toHaveLength(1);
    },
  );

  it.each(icons.map((icon) => [icon.name, icon] as const))(
    "%s stays inside the 9x9 safe area",
    (_name, icon) => {
      const outside = icon.cells
        .map((cell, index) => ({ cell, ...toCoords(index) }))
        .filter(({ cell, row, col }) => cell !== null && !inSafeArea(row, col))
        .map(({ row, col }) => `(${row},${col})`);

      expect(outside).toEqual([]);
    },
  );
});
