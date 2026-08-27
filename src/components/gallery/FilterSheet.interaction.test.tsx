// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./Gallery";
import { icons } from "@/registry";

/**
 * Note on querying: jsdom applies no CSS, so the `lg:`-hidden desktop controls
 * are still in the tree alongside the sheet's copy of the same controls. Every
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
  return screen.getByRole("button", { name: "Filters" });
}

/** Icons currently rendered in the grid, scoped to the named list so the
 *  sidebar's size and padding tick buttons cannot be miscounted as icons. */
function visibleIconCount() {
  const grid = screen.getByRole("list", { name: "Icons" });
  return within(grid).getAllByRole("listitem").length;
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

  it("holds category changes as a draft until Apply", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const countBefore = visibleIconCount();

    await user.click(openSheet());
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: /Arcade/ }));

    // Draft only: the grid behind the sheet has not been filtered yet.
    expect(
      visibleIconCount(),
    ).toBe(countBefore);

    await user.click(within(sheet).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      visibleIconCount(),
    ).toBeLessThan(countBefore);
  });

  it("discards the draft when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const countBefore = visibleIconCount();

    await user.click(openSheet());
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: /Arcade/ }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Dismissing discards — the grid is untouched.
    expect(
      visibleIconCount(),
    ).toBe(countBefore);
  });

  it("Reset commits the defaults and closes", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(openSheet());
    let sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: /Arcade/ }));
    await user.click(within(sheet).getByRole("button", { name: "Apply" }));

    await user.click(openSheet());
    sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Back to every icon.
    expect(
      visibleIconCount(),
    ).toBe(icons.length);
  });
});
