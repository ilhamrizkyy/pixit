// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gallery } from "./Gallery";
import { icons } from "@/registry";

/**
 * THE COLOUR SETTER — a saturation/lightness field with a hue strip (§6).
 *
 * IT WAS THREE KNOBS UNTIL 2026-09-12, and this suite kept its name for as long
 * as they did. What it actually pins survived the swap intact, because none of
 * it was ever about a knob: the gallery's colour control is a real HSL
 * INSTRUMENT rather than a control reading a hex back to itself. The default
 * colour is #000000, and every hue and every saturation of black is the same
 * six characters — so a control deriving its position from `colorText` would
 * silently lose both axes at the value the gallery STARTS on. The composer met
 * this first and its own suite is named for it.
 *
 * That is why the swap could be made at all: `GallerySettings.hsl` is the
 * state, the control is a view of it, and this suite tests the state through
 * whichever view is mounted.
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
 * THE INSTRUMENT LIVES BEHIND A KEY as of 2026-09-13. The sidebar it used to
 * stand in is gone: the display controls lie down in the gallery's sticky
 * toolbar, and a 264px saturation square cannot stand in a 64px bar, so the
 * swatch is a button and the field is in a popover behind it.
 *
 * Every query is still scoped, and for the reason it always was — jsdom applies
 * no CSS, so the filter sheet's copy of the same controls is findable by a bare
 * `screen` query the moment the sheet is open. What changed is the box: the
 * popover's own group, rather than the sidebar's `complementary`.
 *
 * Opening is idempotent and synchronous, so the tests that had no `user` still
 * do not need one. `fireEvent` rather than `userEvent` deliberately: userEvent
 * fires a real `pointerdown`, which is exactly what the popover's
 * close-on-outside-press listener is watching for.
 */
const body = () => {
  const key = screen.getByRole("button", { name: /Choose a color/ });
  if (key.getAttribute("aria-expanded") !== "true") fireEvent.click(key);
  return screen.getByRole("group", { name: "COLOR" });
};
const field = () =>
  within(body()).getByRole("slider", { name: "Saturation and lightness" });
const hue = () =>
  within(body()).getByRole("slider", { name: "Hue" }) as HTMLInputElement;
const hex = () =>
  within(body()).getByLabelText(
    "Icon color, as a hex value",
  ) as HTMLInputElement;

/** What the grid is actually painting. */
const drawnColor = () =>
  screen
    .getByRole("list", { name: "Icons" })
    .querySelector("svg rect")
    ?.getAttribute("fill");

/** Saturation and lightness, read off the field's own announcement. */
function readField() {
  const text = field().getAttribute("aria-valuetext") ?? "";
  const [, s, l] = text.match(/Saturation (\d+)%, lightness (\d+)%/) ?? [];
  return { s: Number(s), l: Number(l) };
}

/** Shift steps by 10, which is the step every other control on this page uses. */
async function press(
  user: ReturnType<typeof userEvent.setup>,
  key: string,
  tens: number,
) {
  field().focus();
  for (let i = 0; i < tens; i++) {
    await user.keyboard(`{Shift>}{${key}}{/Shift}`);
  }
}

describe("the gallery's colour field", () => {
  it("starts on the theme's own colour, with the field empty", () => {
    render(<Gallery icons={icons} />);

    // Light is the server/jsdom default, so the icons are black — DESIGN.md §3.
    expect(hex().value).toBe("000000");
    expect(drawnColor()).toBe("#000000");
    expect(readField().l).toBe(0);
  });

  it("KEEPS A HUE SET ON BLACK, which is the whole reason the state is held", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    // Move hue first, while the colour is still black. Nothing changes on
    // screen — every hue of black is black — and that is exactly the trap: a
    // control reading its position back off the hex would now be at 0 again.
    /* A range input is set directly rather than typed into: dragging is not
       something jsdom can do and typing is not a gesture a person makes on one.
       What is under test is the STATE surviving a pass through black, not the
       drag that sets it. */
    const strip = hue();
    strip.focus();
    await user.tab({ shift: true });
    fireEvent.change(strip, { target: { value: "210" } });

    expect(hue().value).toBe("210");
    expect(drawnColor()).toBe("#000000");

    // Now bring the lightness up and the saturation out. The hue set a moment
    // ago has to still be there, or the icons come out grey.
    await press(user, "ArrowUp", 5);
    await press(user, "ArrowRight", 10);

    expect(hue().value).toBe("210");
    expect(drawnColor()).toBe("#0080ff");
    // Lower case: the readout is uppercased by CSS, not by the value.
    expect(hex().value).toBe("0080ff");
  });

  it("snaps the field to a typed hex", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await user.clear(hex());
    await user.type(hex(), "e11d48");

    expect(drawnColor()).toBe("#e11d48");
    // Rose, at roughly 83% saturation and 50% lightness.
    expect(Number(hue().value)).toBeCloseTo(347, -1);
    expect(readField().s).toBeGreaterThan(70);
  });

  it("returns to the theme default, field and all", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    await press(user, "ArrowUp", 5);
    expect(drawnColor()).not.toBe("#000000");

    await user.click(
      within(body()).getByRole("button", { name: "Reset to theme default" }),
    );

    expect(drawnColor()).toBe("#000000");
    expect(readField().l).toBe(0);
  });

  it("clamps at the ends rather than wrapping", async () => {
    const user = userEvent.setup();
    render(<Gallery icons={icons} />);

    // Lightness starts at 0, so Down has nowhere to go. A field that wrapped
    // would jump black to white on one keystroke, which is the one move a
    // colour control must never make by accident.
    await press(user, "ArrowDown", 3);
    expect(readField().l).toBe(0);

    await press(user, "ArrowUp", 20);
    expect(readField().l).toBe(100);
  });
});
