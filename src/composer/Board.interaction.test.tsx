// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "./Composer";
import { clearViewport, setViewportWidth } from "@/test/viewport";

// These suites are about the toy, which only lays out its tool columns and
// its full dock row on a wide screen. Stating the width keeps them from
// silently testing the phone layout instead.
beforeEach(() => setViewportWidth(1280));
afterEach(clearViewport);
afterEach(cleanup);

/**
 * Covers the seam between the store and the React layer. The store's own tests
 * prove the stroke model; these prove the UI actually reaches it — and that the
 * board is operable with no pointer at all (INTERACTION.md §8).
 */
describe("the board is fully operable from the keyboard", () => {
  const filled = () => document.querySelectorAll('svg[role="application"] rect[fill^="#"]');

  it("fills a cell with Space, clears it on a second press, and undoes", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const board = screen.getByRole("application");
    board.focus();

    await user.keyboard("{ }");
    expect(filled()).toHaveLength(1);

    // Second press on the same cell clears it — there is no separate eraser.
    await user.keyboard("{ }");
    expect(filled()).toHaveLength(0);

    // Each keystroke was one complete gesture, so one undo brings back one cell.
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(filled()).toHaveLength(1);
  });

  it("moves the caret with the arrow keys, so cells are reachable", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    screen.getByRole("application").focus();

    await user.keyboard("{ }{ArrowRight}{ }{ArrowDown}{ }");
    expect(filled()).toHaveLength(3);
  });

  it("announces the focused cell rather than being silently operable", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    screen.getByRole("application").focus();

    const status = document.getElementById("pixl-board-status");
    expect(status?.textContent).toContain("empty");
    await user.keyboard("{ }");
    expect(status?.textContent).toContain("filled");
  });
});

describe("the compact tool strip", () => {
  it("renders ONE control per tool, so nothing answers to a label twice", () => {
    render(<Composer />);
    // matchMedia is absent here, so the wide layout renders — the point of the
    // assertion is that the two layouts are mutually exclusive, not which one
    // won. Two copies of eight buttons would be two "Undo"s in the a11y tree.
    for (const name of ["Mirror", "Grid guide", "Eyedropper", "Undo", "Redo"]) {
      expect(screen.getAllByRole("button", { name })).toHaveLength(1);
    }
  });

  it("keeps every tool reachable in both layouts from one definition", () => {
    render(<Composer />);
    // ToolColumn and ToolStrip both consume useTools(), so a tool added in one
    // place cannot go missing from the other.
    const labels = ["Mirror", "Grid guide", "Eyedropper", "Undo",
                    "Flip horizontally", "Flip vertically", "Rotate 90° clockwise", "Redo"];
    for (const name of labels) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });
});

describe("the mirror aid previews both sides", () => {
  // By MEANING, not by styling: `rect[stroke]` also matched the safe-area
  // outline the moment it was added, and the test failed for a reason that had
  // nothing to do with mirroring.
  const outlines = () =>
    document.querySelectorAll('svg[role="application"] rect[data-caret]');

  it("shows only the caret while Mirror is off", async () => {
    render(<Composer />);
    screen.getByRole("application").focus();
    expect(outlines()).toHaveLength(1);
  });

  it("adds a marker on the far side once Mirror is on", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await user.click(screen.getByRole("button", { name: "Mirror" }));

    const board = screen.getByRole("application");
    board.focus();
    // The caret starts on the centre column, whose reflection is itself — no
    // second marker there, or the middle of the board double-draws.
    expect(outlines()).toHaveLength(1);

    await user.keyboard("{ArrowLeft}");
    expect(outlines()).toHaveLength(2);
  });

  it("paints both sides, matching what the preview promised", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await user.click(screen.getByRole("button", { name: "Mirror" }));

    const board = screen.getByRole("application");
    board.focus();
    await user.keyboard("{ArrowLeft}{ }");
    expect(
      document.querySelectorAll('svg[role="application"] rect[fill^="#"]'),
    ).toHaveLength(2);
  });
});

describe("the safe area warns on approach", () => {
  const safeArea = () =>
    document.querySelector('svg[role="application"] rect[data-safe-area]');

  it("stays invisible in the middle of the board and fades in near the edge", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const board = screen.getByRole("application");
    board.focus();

    // The caret opens dead centre — nothing to warn about yet.
    expect(safeArea()?.getAttribute("opacity")).toBe("0");

    // Four steps left puts it on the safe area's own boundary, which is the
    // last cell before you leave it. The warning arrives with a cell in hand.
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(Number(safeArea()?.getAttribute("opacity"))).toBeGreaterThan(0);
  });

  it("is drawn in the WARNING colour, not the lattice grey", () => {
    render(<Composer />);
    // A boundary drawn in the same ink as the grid reads as more grid.
    expect(safeArea()?.getAttribute("stroke")).toBe("var(--color-warning)");
  });

  it("does not hide behind the grid toggle", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await user.click(screen.getByRole("button", { name: "Grid guide" }));
    // A warning you can switch off without meaning to is not a warning.
    expect(safeArea()).toBeTruthy();
  });

  it("marks the 9x9 inset the seed icons are authored inside", () => {
    render(<Composer />);
    expect(safeArea()?.getAttribute("x")).toBe("4");
    expect(safeArea()?.getAttribute("width")).toBe("36");
  });
});

describe("the help toggle annotates the toy", () => {
  it("names every control, and names nothing until asked", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const help = screen.getByRole("button", { name: "Show control names on the toy" });

    expect(help.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Flip H")).toBeNull();

    await user.click(help);
    expect(help.getAttribute("aria-pressed")).toBe("true");
    for (const caption of ["Mirror", "Grid", "Pick", "Undo", "Flip H", "Flip V", "Rotate", "Redo"]) {
      expect(screen.getByText(caption)).toBeTruthy();
    }
    // The knobs get named too — they are the controls that explain themselves least.
    expect(screen.getAllByText("Hue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lightness").length).toBeGreaterThan(0);
  });

  it("adds no accessible names, because every control already had one", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const before = screen.getAllByRole("button").length;
    await user.click(screen.getByRole("button", { name: "Show control names on the toy" }));
    expect(screen.getAllByRole("button")).toHaveLength(before);
    // Captions are decoration: the button's own label was always the real name.
    expect(screen.getByRole("button", { name: "Flip horizontally" })).toBeTruthy();
  });
});

describe("annotations are callouts, not labels on the toy", () => {
  it("runs a leader line out to a card on the correct side", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await user.click(screen.getByRole("button", { name: "Show control names on the toy" }));

    // Left column and left knob point left; right column and right knob right.
    const leftward = [...document.querySelectorAll("span.right-full")].map((n) => n.textContent);
    const rightward = [...document.querySelectorAll("span.left-full")].map((n) => n.textContent);

    expect(leftward).toEqual(expect.arrayContaining(["Mirror", "Grid", "Pick", "Undo", "Hue"]));
    expect(rightward).toEqual(
      expect.arrayContaining(["Flip H", "Flip V", "Rotate", "Redo", "Lightness"]),
    );
  });
});

describe("the caret behaves like a text cursor", () => {
  const caret = () => document.querySelector('rect[data-caret="cursor"]');

  it("retires until the board is actually being used", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    // Nothing has touched the board yet, so the cursor is not advertising.
    expect(caret()?.getAttribute("class")).toContain("is-idle");

    const board = screen.getByRole("application");
    board.focus();
    await user.keyboard("{ArrowRight}");
    expect(caret()?.getAttribute("class")).not.toContain("is-idle");
  });

  it("retires immediately when focus leaves — a cursor belongs to its control", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const board = screen.getByRole("application");
    board.focus();
    await user.keyboard("{ArrowRight}");
    expect(caret()?.getAttribute("class")).not.toContain("is-idle");

    await user.click(screen.getByRole("button", { name: "Grid guide" }));
    expect(caret()?.getAttribute("class")).toContain("is-idle");
  });

  it("stays in the DOM when retired, so nothing about the grid shifts", () => {
    render(<Composer />);
    expect(caret()).toBeTruthy();
  });
});
