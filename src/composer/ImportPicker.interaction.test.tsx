// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { icons as registryIcons } from "@/registry";
import { clearViewport, setViewportWidth } from "@/test/viewport";
import { Composer } from "./Composer";

afterEach(clearViewport);
afterEach(cleanup);

const PHONE = 375;
const DESKTOP = 1280;

/**
 * Import picks an icon out of the SET. It replaced a file input that read an
 * SVG off disk, which meant the only way to reach art already in the gallery
 * was to export it and upload it back.
 */

const SUBJECT = "arrow-right";

function seed(id: string) {
  const icon = registryIcons.find((entry) => entry.id === id);
  if (icon === undefined) throw new Error(`no seed icon "${id}"`);
  return icon;
}

/** How many cells are painted on the board right now. */
const filled = () => document.querySelectorAll("[data-cell]").length;

const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Import icon" }));
  return screen.getByRole("dialog", { name: "Import icon" });
};

describe("the import picker", () => {
  beforeEach(() => setViewportWidth(DESKTOP));

  it("offers the published set to choose from", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    const dialog = await openPicker(user);
    expect(within(dialog).getByRole("button", { name: SUBJECT })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "cloud" })).toBeTruthy();
  });

  it("has no file input left anywhere in the composer", () => {
    render(<Composer />);
    // The control it replaced. An orphaned file input is a second, unlabelled
    // way to do the same thing — the exact defect the a11y pass removed once.
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("filters as you search, by name and by tag", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const dialog = await openPicker(user);

    await user.type(within(dialog).getByLabelText("Search icons"), "cloud");

    expect(within(dialog).getByRole("button", { name: "cloud" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: SUBJECT })).toBeNull();
  });

  it("says so when nothing matches, rather than showing an empty grid", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const dialog = await openPicker(user);

    await user.type(within(dialog).getByLabelText("Search icons"), "zzzznope");
    expect(within(dialog).getByText(/Nothing matches/)).toBeTruthy();
  });

  it("puts the chosen icon's art on the board and closes", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    expect(filled()).toBe(0);

    const dialog = await openPicker(user);
    await user.click(within(dialog).getByRole("button", { name: SUBJECT }));

    const expected = seed(SUBJECT).cells.filter((cell) => cell !== null).length;
    await waitFor(() => expect(filled()).toBe(expected));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Import icon" })).toBeNull(),
    );
  });

  it("confirms the import by name", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const dialog = await openPicker(user);
    await user.click(within(dialog).getByRole("button", { name: SUBJECT }));

    await waitFor(() =>
      expect(document.querySelector('[data-toast="info"]')?.textContent).toContain(
        `Imported ${SUBJECT}`,
      ),
    );
  });

  it("leaves the name, category and tags alone", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    const name = screen.getByLabelText("Name") as HTMLInputElement;
    await user.type(name, "my-own-name");

    const dialog = await openPicker(user);
    await user.click(within(dialog).getByRole("button", { name: SUBJECT }));

    // Art only. Taking the name too would hand back a board that Save and Copy
    // entry both refuse, since the id is already published.
    await waitFor(() => expect(filled()).toBeGreaterThan(0));
    expect(name.value).toBe("my-own-name");
  });

  it("is ONE undo step, so the board you had comes back", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    // Import twice: the second lands over the first, and undo has to return
    // the first rather than an empty board or nothing at all.
    const first = await openPicker(user);
    await user.click(within(first).getByRole("button", { name: SUBJECT }));
    const firstCount = seed(SUBJECT).cells.filter((cell) => cell !== null).length;
    await waitFor(() => expect(filled()).toBe(firstCount));

    const second = await openPicker(user);
    await user.click(within(second).getByRole("button", { name: "cloud" }));
    const secondCount = seed("cloud").cells.filter((cell) => cell !== null).length;
    await waitFor(() => expect(filled()).toBe(secondCount));

    // `loadCells` would have reset history and left this disabled — which is
    // exactly why import does not use it.
    const undo = screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
    expect(undo.disabled).toBe(false);

    await user.click(undo);
    await waitFor(() => expect(filled()).toBe(firstCount));
  });

  it("closes on Escape without importing anything", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await openPicker(user);

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Import icon" })).toBeNull(),
    );
    expect(filled()).toBe(0);
  });
});

describe("the import picker below `lg`", () => {
  beforeEach(() => setViewportWidth(PHONE));

  it("replaces the details sheet rather than stacking on top of it", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    await user.click(screen.getByRole("button", { name: "Icon details" }));
    expect(screen.getByRole("dialog", { name: "Details" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Import icon" }));

    // Two stacked modal surfaces means two focus traps and no way to tell which
    // Escape belongs to which.
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Import icon" })).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Details" })).toBeNull(),
    );
  });
});
