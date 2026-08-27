import { describe, expect, it } from "vitest";
import type { IconDef } from "@/engine/types";
import { icons as registry } from "@/registry";
import { mergeIcons } from "@/registry/merge";

function localIcon(id: string): IconDef {
  return { ...registry[0], id, name: id, author: "ilham" };
}

describe("mergeLocalIcons", () => {
  it("appends local icons and keeps every published one", () => {
    const merged = mergeIcons(registry, [localIcon("my-icon")]);
    expect(merged).toHaveLength(registry.length + 1);
    for (const icon of registry) expect(merged).toContain(icon);
  });

  it("lets the REGISTRY win an id collision, exactly once", () => {
    const taken = registry[0].id;
    const merged = mergeIcons(registry, [localIcon(taken)]);

    expect(merged).toHaveLength(registry.length);
    // The published record, not the local impostor — and no duplicate React key.
    expect(merged.filter((icon) => icon.id === taken)).toEqual([registry[0]]);
  });

  it("returns the same array when there is nothing local to add", () => {
    expect(mergeIcons(registry, [])).toBe(registry);
    expect(mergeIcons(registry, [localIcon(registry[0].id)])).toBe(registry);
  });
});
