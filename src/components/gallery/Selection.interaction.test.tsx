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
import { Gallery } from "@/components/gallery/Gallery";
import { icons } from "@/registry";
import { CELL_UNITS, GRID_SIZE, VIEW_BOX } from "@/engine/constants";
import { COPY_FORMATS, FORMAT_LABELS } from "@/engine/formats";
import { cellsToPngBlob, downloadSvg } from "@/lib/download";

/**
 * Selecting an icon, across the two surfaces it now touches.
 *
 * The mini screen shows it and NOTHING ELSE; the detail bar along the board's
 * bottom carries the name, the tags and every export. They were one panel until
 * 2026-08-29, and the split is the thing worth pinning — a refactor that put the
 * readout back inside the screen would look fine and would bring back the fat
 * left column it was costing.
 *
 * `@/lib/download` is MOCKED rather than spied on. userEvent installs its own
 * clipboard stub over `navigator.clipboard`, so a spy set here is replaced
 * before the click lands — which is why the old version of these tests read the
 * export out of an on-screen textarea instead. That textarea is gone with the
 * disclosure, so the export is asserted where it is actually produced.
 */

vi.mock("@/lib/download", () => ({
  copyText: vi.fn().mockResolvedValue(true),
  downloadSvg: vi.fn(),
  downloadBlob: vi.fn(),
  cellsToPngBlob: vi.fn().mockResolvedValue(new Blob()),
}));

beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.mocked(downloadSvg).mockClear();
});

/** The screen is part of the board: always present, loaded or not. */
const miniScreen = () => screen.getByRole("region", { name: "Preview screen" });
/** The bar exists only while something is selected. */
const detailBar = () => screen.getByRole("region", { name: "Selected icon" });
const noBar = () => screen.queryByRole("region", { name: "Selected icon" });

const loadIcon = async (
  user: ReturnType<typeof userEvent.setup>,
  index = 0,
) => {
  const grid = screen.getByRole("list", { name: "Icons" });
  await user.click(within(grid).getAllByRole("button")[index]);
  return detailBar();
};

/** Cell shape is the key rack, not the Display section. */
const shapeKey = (name: string) => screen.getByRole("radio", { name });

describe("the mini screen", () => {
  it("is a screen and only a screen — no name, no tags, no actions", () => {
    render(<Gallery icons={icons} />);
    const panel = miniScreen();

    // Everything that used to live in here is on the bar now. If any of it
    // comes back the left column goes fat again, which is what the split fixed.
    expect(within(panel).queryByRole("button")).toBeNull();
    expect(within(panel).queryByRole("heading")).toBeNull();
    expect(panel.textContent).not.toContain(icons[0].tags[0]);
  });

  it("is idle-but-lit before anything is chosen: the bare grid, no art", () => {
    render(<Gallery icons={icons} />);
    const svg = miniScreen().querySelector("svg")!;

    /* A pixel display that is on with nothing on it: every cell unlit, and no
       art. IT IS A DOT MATRIX, not the lattice of lines it was until
       2026-08-30 — the reveal needed somewhere for a cell to arrive FROM, and
       an unlit cell the same shape as a lit one is what a pixel display shows.
       See PixelReveal.tsx. */
    expect(svg.querySelectorAll(".pixl-reveal-dots circle")).toHaveLength(
      GRID_SIZE * GRID_SIZE,
    );
    expect(svg.querySelectorAll("rect")).toHaveLength(0);
    expect(noBar()).toBeNull();
  });

  it("announces both directions from one live region", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const status = () => miniScreen().querySelector("[aria-live]")!;

    expect(status().getAttribute("aria-live")).toBe("polite");
    expect(status().textContent).toBe("No icon selected");

    await loadIcon(user);
    expect(status().textContent).toBe(`${icons[0].name} loaded`);

    // CLEARING has to be audible too — which is exactly why the status is on
    // the screen rather than on the bar: the bar is gone by then.
    await user.click(
      within(detailBar()).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => expect(status().textContent).toBe("No icon selected"));
  });

  it("draws the art ON the grid — one SVG, so cells land in grid boxes", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    await loadIcon(user);

    const svg = miniScreen().querySelector("svg")!;
    // Same element carries both. Two SVGs is exactly how they drifted apart.
    expect(svg.getAttribute("viewBox")).toBe(VIEW_BOX);
    expect(svg.querySelectorAll(".pixl-reveal-dots circle")).toHaveLength(
      GRID_SIZE * GRID_SIZE,
    );

    /* AND IT SETTLES TO THE MERGED WALK. The reveal has to draw one node per
       cell to animate them separately, so the finished picture hands back to
       `layoutCells` — which merges horizontal runs the way the SVG writer does.
       That merge is what removes the anti-aliasing seam between abutting rects
       and what makes the picture on screen and the picture on the clipboard
       come from one function, so the resting image has to be the merged one. */
    await waitFor(() => {
      expect(
        svg.querySelectorAll(".pixl-reveal-cell"),
        "the reveal never handed over to the merged walk",
      ).toHaveLength(0);
    });

    const rects = [...svg.querySelectorAll("rect")];
    expect(rects.length).toBeGreaterThan(0);
    // Every node starts on a boundary and covers a whole number of boxes. WIDTH
    // IS A MULTIPLE, not exactly one cell, because runs are merged.
    for (const rect of rects) {
      expect(Number(rect.getAttribute("x")) % CELL_UNITS).toBe(0);
      expect(Number(rect.getAttribute("y")) % CELL_UNITS).toBe(0);
      expect(Number(rect.getAttribute("width")) % CELL_UNITS).toBe(0);
      expect(Number(rect.getAttribute("width"))).toBeGreaterThan(0);
      expect(rect.getAttribute("height")).toBe(String(CELL_UNITS));
    }
    expect(
      rects.some((r) => Number(r.getAttribute("width")) > CELL_UNITS),
      "nothing merged, so the reveal's unmerged nodes are still on screen",
    ).toBe(true);
  });
});

/**
 * DOWNLOAD SVG MOVED BEHIND THE CHEVRON on 2026-09-03, when the shelf's four
 * flat buttons became a split button plus a menu. Copy is one press; every
 * other way of getting the icon out is one press further.
 *
 * These tests use Download SVG to inspect the markup rather than to test the
 * download, so they open the menu first. Asserted where the markup is actually
 * produced: Copy and Download are built from the same string, so one of them
 * covers the guarantee for both.
 */
async function downloadButton(user: ReturnType<typeof userEvent.setup>, bar: HTMLElement) {
  await user.click(
    within(bar).getByRole("button", { name: "More export options" }),
  );
  return within(bar).getByRole("menuitem", { name: "Download SVG" });
}

describe("the detail bar", () => {
  it("appears only with a selection, and carries the readout and every action", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    expect(noBar()).toBeNull();

    const bar = await loadIcon(user);
    expect(within(bar).getByRole("heading", { level: 2 }).textContent).toBe(
      icons[0].name,
    );
    /* THE TAGS AND THE CATEGORY, IN THAT ORDER — the identity column reads
       name, tags, category, action. The tags came off on 2026-09-03 (BACKLOG
       §D called them the weakest thing here) and came back the same day by
       request, set as one clipped line of printing rather than a row of pills:
       they are the variable-width element on this shelf, and a line that can
       only ever be one line tall is what stops that forcing a scroll again. */
    expect(bar.querySelector(".pixl-detail-tags")!.textContent).toBe(
      icons[0].tags.join(", "),
    );
    expect(bar.querySelector(".pixl-cat")!.textContent).toBe(
      icons[0].category,
    );

    /* AND IN THAT READING ORDER: what it is called, what it is near, which
       shelf it came off, and then what to do about it. The action was up on
       the first line beside the name until 2026-09-03, where it read as a
       button dropped into a row of text. DOM order, because that is what a
       screen reader and the Tab key both follow. */
    const column = bar.querySelector(".pixl-detail-read")!;
    expect(
      [...column.children].map((el) =>
        el.tagName === "H2"
          ? "name"
          : el.classList.contains("pixl-detail-tags")
            ? "tags"
            : el.classList.contains("pixl-cat")
              ? "category"
              : "action",
      ),
    ).toEqual(["name", "tags", "category", "action"]);

    /* ON THE SHELF ITSELF: the format tabs, the split button, and the ✕.
       "Copy name" went with the rebuild — the name is right there to select,
       and the split button's three formats are what people actually came for. */
    /* TWO WAYS TO COPY, WITH TWO NAMES. The pill and the block's own button do
       the same thing, which is what the reference does — but they must not
       share an accessible name, or a screen-reader user has no way to tell
       which one they are on. They did for one pass. */
    for (const name of [
      "Copy SVG",
      "Copy source",
      "More export options",
      "Close",
    ]) {
      expect(within(bar).getByRole("button", { name })).toBeTruthy();
    }

    /* EVERY FORMAT GETS A TAB, read from the engine rather than listed here —
       a hard-coded list would keep passing after a sixth format was added and
       never printed. */
    for (const format of COPY_FORMATS) {
      expect(
        within(bar).getByRole("tab", { name: FORMAT_LABELS[format] }),
      ).toBeTruthy();
    }

    // AND BEHIND THE CHEVRON: every format again, plus the two downloads.
    await user.click(
      within(bar).getByRole("button", { name: "More export options" }),
    );
    for (const format of COPY_FORMATS) {
      expect(
        within(bar).getByRole("menuitem", {
          name: `Copy ${FORMAT_LABELS[format]}`,
        }),
      ).toBeTruthy();
    }
    for (const name of ["Download SVG", "Download PNG"]) {
      expect(within(bar).getByRole("menuitem", { name })).toBeTruthy();
    }
  });

  it("is NOT a dialog, and picking another icon swaps it rather than reopening", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const bar = await loadIcon(user);

    expect(bar.getAttribute("aria-modal")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");

    const swapped = await loadIcon(user, 1);
    expect(swapped).toBe(bar);
    expect(within(swapped).getByRole("heading", { level: 2 }).textContent).toBe(
      icons[1].name,
    );
  });

  it("clears on Escape and on the ✕", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await loadIcon(user);
    // Escape is read at the DOCUMENT: focus is still on the card that was
    // clicked, so a handler on the bar would never see it.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(noBar()).toBeNull());

    const bar = await loadIcon(user);
    await user.click(
      within(bar).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => expect(noBar()).toBeNull());
  });
});

describe("cell shape", () => {
  const artNodes = () => {
    const grid = screen.getByRole("list", { name: "Icons" });
    const svg = within(grid).getAllByRole("button")[0].querySelector("svg");
    return {
      rects: [...svg!.querySelectorAll("rect")],
      circles: [...svg!.querySelectorAll("circle")],
    };
  };

  it("draws square cells flush to the grid by default", () => {
    render(<Gallery icons={icons} />);
    const { rects, circles } = artNodes();

    expect(circles).toHaveLength(0);
    for (const rect of rects) {
      expect(Number(rect.getAttribute("x")) % CELL_UNITS).toBe(0);
      expect(rect.getAttribute("height")).toBe(String(CELL_UNITS));
    }
  });

  it("Inset insets every node so the grid shows between neighbours", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(shapeKey("Inset"));

    const { rects } = artNodes();
    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) {
      // Half-unit offsets, and never merged into a bar — a merged run would
      // weld neighbours back together and erase the gap being asked for.
      //
      // The inset was taken to ZERO for one pass and put straight back: the
      // lattice is drawn UNDER the art, so a node that fills its cell covers
      // the very grid line the mode exists to show. The gap is not a margin
      // around the node, it is the only way the grid gets to be visible.
      expect(Number(rect.getAttribute("x")) % CELL_UNITS).toBe(0.5);
      expect(rect.getAttribute("width")).toBe("3");
      expect(rect.getAttribute("height")).toBe("3");
    }
  });

  it("Round replaces every node with a circle", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(shapeKey("Round"));

    const { rects, circles } = artNodes();
    expect(circles.length).toBeGreaterThan(0);
    expect(rects).toHaveLength(0);
    for (const circle of circles) {
      expect(circle.getAttribute("r")).toBe("1.5");
      expect(Number(circle.getAttribute("cx")) % CELL_UNITS).toBe(2);
    }
  });

  it.each([
    ["Inset", "<rect", 'width="3"'],
    ["Round", "<circle", 'r="1.5"'],
  ])(
    "carries %s into the exported markup — what you see is what you copy",
    async (style, tag, detail) => {
      const user = userEvent.setup();
      render(<Gallery icons={icons} />);

      await user.click(shapeKey(style));
      const bar = await loadIcon(user);
      await user.click(await downloadButton(user, bar));

      // Asserted where the markup is actually produced. Download and Copy are
      // built from the same string, so one of them covers the guarantee.
      const [, markup] = vi.mocked(downloadSvg).mock.calls[0];
      expect(markup).toContain(tag);
      expect(markup).toContain(detail);
    },
  );

  it("exports square markup when nothing is chosen", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);
    const bar = await loadIcon(user);
    await user.click(await downloadButton(user, bar));

    const [, markup] = vi.mocked(downloadSvg).mock.calls[0];
    expect(markup).toContain("<rect");
    expect(markup).not.toContain("<circle");
  });

  it("is covered by the sheet's Reset, now that it lives in that pad", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(shapeKey("Round"));
    expect(artNodes().circles.length).toBeGreaterThan(0);

    // THIS ASSERTION IS THE REVERSE of what it was, deliberately. Shape sat on
    // its own key rack outside the Display pad, so Reset had to leave it alone;
    // it is one of the pad's three controls now, so a Reset that skipped it
    // would be the bug. A reset covers exactly what its section contains — the
    // rule did not change, the section did.
    //
    // THE SHEET'S Reset, because the pad's own went with the section heading
    // on 2026-08-29: it duplicated, wholesale, what the colour field's ✕ and the
    // size ticks already do one control at a time. The sheet's footer is where
    // a reset-everything still lives, so that is where the guarantee is checked.
    await user.click(screen.getByRole("button", { name: "Display settings" }));
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(artNodes().circles).toHaveLength(0);
    expect(artNodes().rects.length).toBeGreaterThan(0);
  });
  /**
   * THE SCALE OUTRUNS THE PICTURE, ON PURPOSE.
   *
   * The grid's seat is a fixed 64px, so it draws nothing above 48 — but the
   * scale runs to 120, and the stops past the cap set the size of the FILE.
   * That is the whole reason the top half of the rail's travel is not inert,
   * and it is invisible on screen by definition: the one place the difference
   * shows is in the markup and in what the rasterizer is asked for.
   */
  it("caps what the grid draws at 48 and exports the size actually chosen", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.click(screen.getByRole("button", { name: "Display settings" }));
    const sheet = screen.getByRole("dialog");
    fireEvent.change(within(sheet).getByRole("slider", { name: "Size" }), {
      target: { value: "120" },
    });
    await user.click(within(sheet).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // The picture stopped at the cap.
    const grid = screen.getByRole("list", { name: "Icons" });
    expect(grid.querySelector("svg")?.getAttribute("width")).toBe("48");

    const bar = await loadIcon(user);
    await user.click(await downloadButton(user, bar));
    const [, markup] = vi.mocked(downloadSvg).mock.calls[0];
    expect(markup).toContain('width="120"');
    expect(markup).toContain('height="120"');
    // The viewBox is the canvas and never moves — CLAUDE.md rule 4. Only the
    // rendered dimensions follow the scale.
    expect(markup).toContain(`viewBox="${VIEW_BOX}"`);

    // Behind the chevron too, with Download SVG.
    await user.click(
      within(bar).getByRole("button", { name: "More export options" }),
    );
    await user.click(within(bar).getByRole("menuitem", { name: "Download PNG" }));
    expect(vi.mocked(cellsToPngBlob).mock.calls[0][1]).toEqual({ pixels: 120 });
  });

  it("still exports at the size on screen while the scale is under the cap", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    const bar = await loadIcon(user);
    await user.click(await downloadButton(user, bar));
    const [, markup] = vi.mocked(downloadSvg).mock.calls[0];
    // The default, drawn and exported at the same number.
    expect(markup).toContain('width="24"');
  });
});
