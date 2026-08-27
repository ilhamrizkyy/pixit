import { describe, expect, it } from "vitest";
import { searchIcons } from "./search";
import { icons } from "./icons";
import type { IconDef } from "@/engine/types";

const find = (id: string): IconDef => {
  const icon = icons.find((entry) => entry.id === id);
  if (icon === undefined) throw new Error(`no seed icon "${id}"`);
  return icon;
};

const ids = (result: readonly IconDef[]) => result.map((icon) => icon.id);

describe("searchIcons", () => {
  it("matches on name", () => {
    expect(ids(searchIcons(icons, "arrow-right"))).toContain("arrow-right");
  });

  it("matches on a tag the name does not contain", () => {
    const icon = find("arrow-right");
    const tag = icon.tags.find((entry) => !icon.name.includes(entry));
    expect(tag).toBeDefined();
    expect(ids(searchIcons(icons, tag!))).toContain(icon.id);
  });

  it("ignores case and surrounding space", () => {
    const plain = ids(searchIcons(icons, "arrow"));
    expect(ids(searchIcons(icons, "  ARROW  "))).toEqual(plain);
    expect(plain.length).toBeGreaterThan(1);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchIcons(icons, "zzzzz-not-an-icon")).toHaveLength(0);
  });

  it("returns the SAME array for an empty query", () => {
    // Identity, not equality. A new array on every keystroke that clears the
    // field would re-run every consumer's memo and re-render the whole grid.
    expect(searchIcons(icons, "")).toBe(icons);
    expect(searchIcons(icons, "   ")).toBe(icons);
  });

  it("never invents a match — every result really contains the query", () => {
    const query = "arrow";
    for (const icon of searchIcons(icons, query)) {
      const hit =
        icon.name.includes(query) || icon.tags.some((tag) => tag.includes(query));
      expect(hit).toBe(true);
    }
  });
});
