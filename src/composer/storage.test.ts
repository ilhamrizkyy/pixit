import { describe, expect, it } from "vitest";
import { createEmptyCells, fillCell } from "@/engine/grid";
import type { IconDef } from "@/engine/types";
import { isIdTaken, isIconDef, parseTags, toIconId } from "./storage";

const drawn = fillCell(createEmptyCells(), 0, "#111111");

function icon(overrides: Partial<IconDef> = {}): unknown {
  return {
    id: "arrow-right",
    name: "arrow-right",
    category: "interface",
    tags: ["arrow"],
    cells: drawn,
    author: "ilham",
    status: "published",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("names must be unique", () => {
  it("kebab-cases the display name into an id", () => {
    expect(toIconId("Arrow Right")).toBe("arrow-right");
    expect(toIconId("arrowRight")).toBe("arrow-right");
  });

  it("returns empty for a name with nothing to build an id from", () => {
    expect(toIconId("   ")).toBe("");
    expect(toIconId("!!!")).toBe("");
  });

  it("REFUSES a taken name rather than silently suffixing it", () => {
    // Auto-suffixing would hand the owner an icon named something they never
    // chose — and an id is immutable once published, so it would be permanent.
    expect(isIdTaken("arrow-right", ["arrow-right"])).toBe(true);
    expect(isIdTaken("arrow-right", ["arrow-left"])).toBe(false);
    expect(isIdTaken("arrow-right", [])).toBe(false);
  });
});

describe("parseTags", () => {
  it("kebab-cases, drops empties, and de-duplicates", () => {
    expect(parseTags("Arrow, right ,, arrow")).toEqual(["arrow", "right"]);
    expect(parseTags("Volume Up, volumeUp")).toEqual(["volume-up"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("isIconDef guards what comes back out of storage", () => {
  it("accepts a well-formed record", () => {
    expect(isIconDef(icon())).toBe(true);
  });

  it("rejects records that would corrupt the gallery", () => {
    // A draft from an older build, or a hand-edit in devtools, must be dropped
    // rather than loaded — every later export is built from these cells.
    expect(isIconDef(icon({ cells: [] as unknown as IconDef["cells"] }))).toBe(false);
    expect(isIconDef(icon({ category: "weather" as IconDef["category"] }))).toBe(false);
    expect(isIconDef(icon({ id: "Arrow Right" }))).toBe(false);
    expect(isIconDef(icon({ status: "draft" as IconDef["status"] }))).toBe(false);
    expect(isIconDef(icon({ tags: [1] as unknown as string[] }))).toBe(false);
    expect(isIconDef(null)).toBe(false);
    expect(isIconDef("arrow-right")).toBe(false);
  });
});
