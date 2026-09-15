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

/**
 * The shape control, a DROPDOWN as of 2026-09-13: a key printing the live value
 * and a menu of all three behind it. Five earlier builds — a key rack, three
 * caps, a thumbwheel, three cells and a caret stepper — see ShapeDropdown.tsx
 * for what each got right.
 *
 * The key's accessible name carries the value ("Shape, Fill"), which is what
 * lets `liveShape` read the state without opening anything: a menu button
 * announces what it currently holds, where the stepper needed a live region
 * because its buttons said the same thing before and after a press.
 */
const shapeKey = () => screen.getByRole("button", { name: /^Shape,/ });
const liveShape = () =>
  (shapeKey().getAttribute("aria-label") ?? "").replace("Shape, ", "");

/** Open the menu (idempotent) and return it. */
async function openShape(user: ReturnType<typeof userEvent.setup>) {
  if (shapeKey().getAttribute("aria-expanded") !== "true") {
    await user.click(shapeKey());
  }
  return screen.getByRole("menu", { name: "Shape" });
}

/** Choose one value by name, from a closed or open menu. */
async function chooseShape(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const menu = await openShape(user);
  await user.click(within(menu).getByRole("menuitemradio", { name: RegExp(`^${name}`) }));
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

describe("the shape dropdown", () => {
  it("is a menu button that names its own value", () => {
    render(<Gallery icons={icons} />);

    /* THE KEY CARRIES THE VALUE IN ITS NAME, which is what a menu button is for
       and what the five earlier builds each solved differently — a live region
       on the stepper, a window on the drum, the depth of a cap on the key rack.
       Here the control simply says what it is set to. */
    expect(liveShape()).toBe("Fill");
    expect(shapeKey().getAttribute("aria-haspopup")).toBe("menu");
    // Closed, it controls nothing: `aria-controls` pointing at an id that is
    // not in the document is worse than no attribute at all.
    expect(shapeKey().getAttribute("aria-expanded")).toBe("false");
    expect(shapeKey().getAttribute("aria-controls")).toBeNull();
  });

  it("offers all three at once, with the live one checked", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    /* THIS IS WHAT THE STEPPER COULD NOT DO. Two carets and a readout show you
       one value and reach the far one in two presses; a menu shows all three
       and reaches any of them in one. */
    const menu = await openShape(user);
    const items = within(menu).getAllByRole("menuitemradio");
    /* Split on the hint's first word rather than on a character: the names are
       "Fill" / "Inset" / "Round" and the hints all begin "Cells", so the label
       is everything before it. */
    expect(
      items.map((item) => (item.textContent ?? "").split("Cells")[0].trim()),
    ).toEqual([
      "Fill",
      "Inset",
      "Round",
    ]);
    expect(
      items.filter((item) => item.getAttribute("aria-checked") === "true"),
    ).toHaveLength(1);
  });

  it("reaches any value in one press", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    // Round is the FAR value: on the stepper it was two presses away in either
    // direction, which is the cost this build exists to remove.
    await chooseShape(user, "Round");
    expect(liveShape()).toBe("Round");
    expect(screen.queryByRole("menu", { name: "Shape" })).toBeNull();
  });

  it("moves focus with the arrows and does NOT change the value", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    /* THE CRITICAL DIFFERENCE FROM EVERY EARLIER BUILD. The stepper and the
       radiogroup both CHANGED the shape as you arrowed, because in those the
       focused thing was the chosen thing — and on this page that redraws every
       icon in the grid. A menu is open OVER a value that has not changed yet,
       so arrowing through it must move focus and nothing else. */
    const menu = await openShape(user);
    await user.keyboard("{ArrowDown}");
    expect(liveShape()).toBe("Fill");
    await user.keyboard("{ArrowDown}");
    expect(liveShape()).toBe("Fill");
    expect(menu.contains(document.activeElement)).toBe(true);

    // And Enter on the focused item is what commits it.
    await user.keyboard("{Enter}");
    expect(liveShape()).toBe("Round");
  });

  it("closes on Escape without choosing, and hands focus back", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await openShape(user);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu", { name: "Shape" })).toBeNull();
    expect(liveShape()).toBe("Fill");
    // Focus lands back on the key, or the next Tab restarts from the top of
    // the page.
    expect(document.activeElement).toBe(shapeKey());
  });

  it("does not filter — every icon stays on screen at any shape", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const before = visibleIconCount();
    await chooseShape(user, "Inset");
    expect(liveShape()).toBe("Inset");
    // This control carried the CATEGORIES once, as a key rack. A shape that
    // silently filtered would be that old job still running underneath.
    expect(visibleIconCount()).toBe(before);
  });
});

/**
 * THE GLYPHS CAME BACK AND WENT AGAIN, within a day, and both moves were right.
 *
 * The words arrived with the drum, because a drum is a printed scale and a
 * scale names its values. The cost was recorded here at the time: the 2x2
 * patches were drawn by the engine's own `cellNode`, so a geometry change moved
 * them and they could never say the old thing, whereas a word can. Build 4
 * brought the patches back and paid nothing for them.
 *
 * Build 5 gives them up again on purpose. A stepper's grammar is one value
 * centred between two arrows, and a drawing in that seat reads as a third
 * button — so the name is back and the engine link is gone with it.
 * `SHAPE_HINTS` carries the behaviour in the tooltip and nothing checks it
 * against the engine: if the shapes ever change what they MEAN, this is still
 * the thing that will not notice.
 */
