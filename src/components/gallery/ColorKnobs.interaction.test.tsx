// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./Gallery";
import { icons } from "@/registry";

/**
 * THE COLOUR SETTER — three knobs on the board's body (DESIGN.md §6).
 *
 * What is actually worth pinning here is not that a knob turns; it is that the
 * knobs are a real HSL instrument rather than three dials reading a hex back to
 * themselves. The gallery's default colour is #000000, and every hue and every
 * saturation of black is the same six characters — so a control that derived
 * its position from `colorText` would silently lose both axes the moment the
 * colour passed through black or white, which is where it STARTS. The composer
 * met this first and its own suite is named for it.
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

/**
 * The knobs on the BODY. jsdom applies no CSS, so the filter sheet's copy of
 * the same controls would be found by a bare `screen` query the moment the
 * sheet is open — every query here is scoped to the sidebar for that reason.
 */
const body = () => screen.getByRole("complementary");
const knob = (name: string) => within(body()).getByRole("slider", { name });
const hex = () =>
  within(body()).getByLabelText("Icon color, as a hex value") as HTMLInputElement;

/** What the grid is actually painting. */
const drawnColor = () =>
  screen
    .getByRole("list", { name: "Icons" })
    .querySelector("svg rect")
    ?.getAttribute("fill");

/** Shift steps by 10, so a turn is a handful of keystrokes rather than 210. */
async function turn(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  tens: number,
) {
  knob(name).focus();
  for (let i = 0; i < tens; i++) await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
}

describe("the gallery's colour knobs", () => {
  it("starts on the theme's own colour, with the field empty", () => {
    render(<Gallery icons={icons} />);

    // Light is the server/jsdom default, so the icons are black — DESIGN.md §3.
    expect(hex().value).toBe("000000");
    expect(drawnColor()).toBe("#000000");
    expect(knob("Lightness").getAttribute("aria-valuenow")).toBe("0");
  });

  it("KEEPS A HUE SET ON BLACK, which is the whole reason the knobs hold state", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    // Turn hue first, while the colour is still black. Nothing changes on
    // screen — every hue of black is black — and that is exactly the trap: a
    // knob reading its position back off the hex would now be at 0 again.
    await turn(user, "Hue", 21);
    expect(knob("Hue").getAttribute("aria-valuenow")).toBe("210");
    expect(drawnColor()).toBe("#000000");

    // Now bring the lightness up. The hue set a moment ago has to still be
    // there, or the icons come out grey.
    await turn(user, "Lightness", 5);
    await turn(user, "Saturation", 10);

    expect(knob("Hue").getAttribute("aria-valuenow")).toBe("210");
    expect(drawnColor()).toBe("#0080ff");
    // Lower case: the field is uppercased by CSS, not by the value.
    expect(hex().value).toBe("0080ff");
  });

  it("snaps the knobs to a typed hex", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.clear(hex());
    await user.type(hex(), "e11d48");

    expect(drawnColor()).toBe("#e11d48");
    // Rose, at roughly 83% saturation and 50% lightness.
    expect(Number(knob("Hue").getAttribute("aria-valuenow"))).toBeCloseTo(347, -1);
    expect(Number(knob("Saturation").getAttribute("aria-valuenow"))).toBeGreaterThan(70);
  });

  it("returns to the theme default, knobs and all", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await turn(user, "Lightness", 5);
    expect(drawnColor()).not.toBe("#000000");

    await user.click(within(body()).getByRole("button", { name: "Reset to theme default" }));

    expect(drawnColor()).toBe("#000000");
    expect(knob("Lightness").getAttribute("aria-valuenow")).toBe("0");
  });
});
