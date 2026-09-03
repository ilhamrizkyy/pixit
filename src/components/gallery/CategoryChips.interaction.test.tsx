// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./Gallery";
import { icons } from "@/registry";
import { CATEGORIES } from "@/engine/types";

/**
 * The category chips and the Shape key rack, driven through the real gallery.
 *
 * These two are the board's split made testable: the CHIPS are on the screen
 * and change WHICH icons are there, so they stayed a tablist over the grid; the
 * KEYS are on the body and change HOW every icon is drawn, so they became a
 * radiogroup. The rack used to hold the categories, and the assertions that
 * followed the categories are the ones below.
 *
 * Assertions are plain DOM, matching the rest of the suite — jest-dom is not
 * installed and one test file is not a reason to add it.
 */

/** jsdom implements neither matchMedia nor layout, and the mini screen reads
 *  the `lg` breakpoint through it to decide whether it is a docked overlay. */
function stubViewport({ wide }: { wide: boolean }) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: wide && query.includes("min-width: 1024px"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

// Narrow by default — what the hook falls back to on the server.
beforeEach(() => stubViewport({ wide: false }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function tabs() {
  return within(
    screen.getByRole("tablist", { name: "Icon categories" }),
  ).getAllByRole("tab");
}

function labelOf(tab: Element) {
  return tab.textContent ?? "";
}

function selectedLabel() {
  const selected = tabs().filter(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  // Exactly one, always — two selected tabs is the bug this would otherwise
  // hide behind a find().
  expect(selected).toHaveLength(1);
  return labelOf(selected[0]);
}

function tabNamed(label: string) {
  const found = tabs().find((tab) => labelOf(tab) === label);
  if (!found) throw new Error(`No "${label}" chip`);
  return found;
}

function shapeKeys() {
  return within(
    screen.getByRole("radiogroup", { name: "Shape" }),
  ).getAllByRole("radio");
}

function checkedShape() {
  const checked = shapeKeys().filter(
    (row) => row.getAttribute("aria-checked") === "true",
  );
  expect(checked).toHaveLength(1);
  /* THE ROW'S OWN TEXT IS ITS NAME. It was an `aria-label` while these were
     transport keys carrying a glyph rather than a word; the list spells its
     values out, so a label repeating them would be a second answer to the same
     question. The capitals are `text-transform`, so the name here stays
     "Square". */
  return (checked[0].textContent ?? "").trim();
}

/** Walk the tab order until focus lands on a radio in the rack. */
async function focusRack(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 40; step++) {
    if (document.activeElement?.getAttribute("role") === "radio") return;
    await user.tab();
  }
  throw new Error("Never reached the rack");
}

function visibleIconCount() {
  const grid = screen.getByRole("list", { name: "Icons" });
  return within(grid).getAllByRole("listitem").length;
}

/** Walk the tab order until focus lands in the strip. */
async function focusTabStrip(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 40; step++) {
    if (document.activeElement?.getAttribute("role") === "tab") return;
    await user.tab();
  }
  throw new Error("Never reached the tablist");
}

const LAST = CATEGORIES[CATEGORIES.length - 1].label;

describe("category chips", () => {
  it("offers All plus every category, in order", () => {
    render(<Gallery icons={icons} />);
    expect(tabs().map(labelOf)).toEqual([
      "All",
      ...CATEGORIES.map((entry) => entry.label),
    ]);
  });

  it("starts on All, which is the strip's only tab stop", () => {
    render(<Gallery icons={icons} />);
    expect(selectedLabel()).toBe("All");

    const stops = tabs().filter((tab) => tab.getAttribute("tabindex") === "0");
    expect(stops.map(labelOf)).toEqual(["All"]);
  });

  it("moves and selects with the arrow keys, and wraps at both ends", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await focusTabStrip(user);
    expect(document.activeElement).toBe(tabNamed("All"));

    await user.keyboard("{ArrowRight}");
    expect(selectedLabel()).toBe(CATEGORIES[0].label);
    // Focus follows selection, or the next arrow key starts from the wrong place.
    expect(document.activeElement).toBe(tabNamed(CATEGORIES[0].label));

    // Back past All and around to the last category.
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(selectedLabel()).toBe(LAST);

    // Forward off the end, back to All.
    await user.keyboard("{ArrowRight}");
    expect(selectedLabel()).toBe("All");

    await user.keyboard("{End}");
    expect(selectedLabel()).toBe(LAST);

    await user.keyboard("{Home}");
    expect(selectedLabel()).toBe("All");
  });

  it("leaves keys it does not handle alone", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const strip = screen.getByRole("tablist", { name: "Icon categories" });
    expect(strip.getAttribute("aria-orientation")).toBe("horizontal");

    await focusTabStrip(user);
    await user.keyboard("{ArrowDown}{ArrowUp}");
    // A horizontal tablist must not answer the vertical arrows — they scroll
    // the page, and swallowing them strands a keyboard user on the strip.
    expect(selectedLabel()).toBe("All");
  });

  it("filters the grid to the chosen category", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const all = visibleIconCount();
    const target = CATEGORIES[0];
    const expected = icons.filter((icon) => icon.category === target.id).length;
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(all);

    await user.click(tabNamed(target.label));
    expect(visibleIconCount()).toBe(expected);

    await user.click(tabNamed("All"));
    expect(visibleIconCount()).toBe(all);
  });

  it("carries no counts", () => {
    render(<Gallery icons={icons} />);
    // Lean by construction: a number beside every label is what made the
    // control bulky, and the empty state already answers "anything in here?".
    for (const tab of tabs()) expect(tab.textContent).not.toMatch(/\d/);
  });

  it("stays horizontal at every width", () => {
    stubViewport({ wide: true });
    render(<Gallery icons={icons} />);
    // Unlike the rack they replaced, the chips are a row on the screen at every
    // size — so there is no axis to switch and no breakpoint to read.
    expect(
      screen
        .getByRole("tablist", { name: "Icon categories" })
        .getAttribute("aria-orientation"),
    ).toBe("horizontal");
  });

  it("names the panel with whichever chip is in front", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const panel = screen.getByRole("tabpanel");
    expect(panel.id).toBeTruthy();
    expect(panel.getAttribute("aria-labelledby")).toBe(tabNamed("All").id);
    expect(tabNamed("All").getAttribute("aria-controls")).toBe(panel.id);

    await user.click(tabNamed(CATEGORIES[1].label));
    expect(panel.getAttribute("aria-labelledby")).toBe(
      tabNamed(CATEGORIES[1].label).id,
    );
  });
});

describe("the shape list", () => {
  it("is a radiogroup, not a tablist — it changes drawing, not contents", () => {
    render(<Gallery icons={icons} />);

    // The distinction is not pedantry: a tab reveals a panel, and these three
    // reveal nothing. They redraw the one panel the chips already govern, so
    // claiming `aria-controls` over it would give the grid two owners.
    /* PRINTED IN WHEEL ORDER, NOT ENGINE ORDER (2026-08-30). `CELL_STYLES` is
       solid / gap / dots because that is the data; this is where a value sits
       on a drum, and SQUARE — the default — is printed in the middle. A
       three-position wheel resting at one end can only be turned one way, and
       the value you start on is the one with nothing above it.

       The DOM order is the printed order, which is what lets ArrowDown reach
       the value below the live one: a group whose reading order and moving
       order disagree is one where the arrow skips past what you can see. */
    expect(shapeKeys().map((row) => (row.textContent ?? "").trim())).toEqual([
      "Inset",
      "Square",
      "Round",
    ]);
    for (const row of shapeKeys()) {
      expect(row.getAttribute("aria-controls")).toBeNull();
      // No `aria-label`: the row's own text is its name, so a label would be a
      // second answer to the same question and the one that wins silently.
      expect(row.getAttribute("aria-label")).toBeNull();
    }
  });

  it("starts on Square, which is the group's only tab stop", () => {
    render(<Gallery icons={icons} />);
    expect(checkedShape()).toBe("Square");

    const stops = shapeKeys().filter(
      (row) => row.getAttribute("tabindex") === "0",
    );
    expect(stops.map((row) => (row.textContent ?? "").trim())).toEqual([
      "Square",
    ]);
    // And it is the MIDDLE of the three, so the wheel can be turned either way
    // from rest and both neighbours are half in the window before you touch it.
    expect(shapeKeys().indexOf(stops[0])).toBe(1);
  });

  it("answers ALL FOUR arrows, as the APG asks of a radiogroup", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await focusRack(user);
    // The tab stop is the LIVE value, which is the middle face of the drum.
    expect(document.activeElement).toBe(shapeKeys()[1]);

    // Three items is a small enough group that keeping both axes inside it
    // costs a keyboard user nothing, and the APG asks for all four on radios.
    // Down moves to the value printed BELOW, which is what a drum's own order
    // means — Inset, Square, Round from the top.
    await user.keyboard("{ArrowDown}");
    expect(checkedShape()).toBe("Round");
    await user.keyboard("{ArrowUp}");
    expect(checkedShape()).toBe("Square");
    await user.keyboard("{ArrowLeft}");
    expect(checkedShape()).toBe("Inset");
    await user.keyboard("{ArrowRight}");
    expect(checkedShape()).toBe("Square");

    // Wraps at both ends, so the far value is one key away.
    await user.keyboard("{ArrowUp}");
    expect(checkedShape()).toBe("Inset");
    await user.keyboard("{ArrowUp}");
    expect(checkedShape()).toBe("Round");
    await user.keyboard("{ArrowDown}");
    expect(checkedShape()).toBe("Inset");

    await user.keyboard("{End}");
    expect(checkedShape()).toBe("Round");
    await user.keyboard("{Home}");
    expect(checkedShape()).toBe("Inset");
  });

  it("keeps focus with the selection, so the next arrow starts from here", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await focusRack(user);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(shapeKeys()[2]);
  });

  it("does not filter — every icon stays on screen at any shape", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const before = visibleIconCount();
    await user.click(shapeKeys()[2]);
    expect(checkedShape()).toBe("Round");
    // This control carried the CATEGORIES once, as a key rack. A shape that
    // silently filtered would be that old job still running underneath.
    expect(visibleIconCount()).toBe(before);
  });
});

/**
 * THE WORDS REPLACED THE GLYPHS on 2026-08-30, and this suite went with them.
 *
 * Worth stating rather than deleting quietly: the 2x2 patches were drawn by the
 * engine's own `cellNode`, so a geometry change moved them and they could never
 * say the old thing. A word can. `SHAPE_HINTS` — the tooltip — is what carries
 * the shape's actual behaviour now, and nothing checks it against the engine.
 * If the shapes ever change what they mean, this is the thing that will not
 * notice.
 */
