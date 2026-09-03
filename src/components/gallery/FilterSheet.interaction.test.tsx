// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./Gallery";
import { icons } from "@/registry";

/**
 * Note on querying: jsdom applies no CSS, so the `lg:`-hidden body controls are
 * still in the tree alongside the sheet's copy of the same controls. Every
 * query inside an open sheet is therefore scoped with `within(dialog)` rather
 * than reaching through `screen`.
 */

beforeAll(() => {
  // jsdom implements neither; the theme store probes both.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(cleanup);

function openSheet() {
  return screen.getByRole("button", { name: "Display settings" });
}

/** Icons currently rendered in the grid, scoped to the named list so the
 *  sidebar's size tick buttons cannot be miscounted as icons. */
function visibleIconCount() {
  const grid = screen.getByRole("list", { name: "Icons" });
  return within(grid).getAllByRole("listitem").length;
}

/**
 * The pixel size the grid is currently drawing at.
 *
 * The draft tests have now lost two observables to layout changes — first the
 * category buttons, then Cells, as each left the sheet for a surface that is
 * always in view. Size is what the sheet actually holds after the board
 * rebuild, and it is a better probe than either: it is a number read straight
 * off the rendered SVG, so "did the grid change yet?" has an exact answer
 * rather than a count that several unrelated things could move.
 */
function drawnSize() {
  const grid = screen.getByRole("list", { name: "Icons" });
  return grid.querySelector("svg")?.getAttribute("width");
}

/**
 * Drag the sheet's size scale to a stop.
 *
 * It used to click a printed number, which was a button while there were five
 * of them. The scale runs to 120 now, and fourteen redundant tab stops in front
 * of a slider that already reaches every one of their values is not worth the
 * convenience — so the numbers are printing and this drives the control.
 */
function setSize(sheet: HTMLElement, value: number) {
  fireEvent.change(within(sheet).getByRole("slider", { name: "Size" }), {
    target: { value: String(value) },
  });
}

describe("filter sheet", () => {
  it("does not exist until the Filters button is pressed", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(openSheet());

    const sheet = screen.getByRole("dialog");
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(within(sheet).getByRole("button", { name: "Apply" })).toBeTruthy();
    expect(within(sheet).getByRole("button", { name: "Reset" })).toBeTruthy();
  });

  it("holds display changes as a draft until Apply", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    expect(drawnSize()).toBe("24");

    await user.click(openSheet());
    const sheet = screen.getByRole("dialog");
    setSize(sheet, 48);

    // Draft only: the grid behind the sheet is still drawing at 24.
    expect(drawnSize()).toBe("24");

    await user.click(within(sheet).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(drawnSize()).toBe("48");
  });

  it("discards the draft when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const countBefore = visibleIconCount();

    await user.click(openSheet());
    const sheet = screen.getByRole("dialog");
    setSize(sheet, 48);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Dismissing discards — the grid is untouched.
    expect(drawnSize()).toBe("24");
    expect(visibleIconCount()).toBe(countBefore);
  });

  it("Reset commits the defaults and closes", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(openSheet());
    let sheet = screen.getByRole("dialog");
    setSize(sheet, 48);
    await user.click(within(sheet).getByRole("button", { name: "Apply" }));
    expect(drawnSize()).toBe("48");

    await user.click(openSheet());
    sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Reset COMMITS the defaults, so the size it just applied is gone. An
    // icon-count assertion would pass here without Reset doing anything at
    // all — Size never changes how many icons are shown.
    expect(drawnSize()).toBe("24");
    expect(visibleIconCount()).toBe(icons.length);
  });
});
