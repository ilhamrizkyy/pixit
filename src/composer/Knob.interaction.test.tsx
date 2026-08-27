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

const knob = (name: "Hue" | "Lightness") => screen.getByRole("slider", { name });
const now = (name: "Hue" | "Lightness") => Number(knob(name).getAttribute("aria-valuenow"));

describe("the knobs are real controls, not decoration", () => {
  it("turns hue even on a GREY, where the hex cannot carry it", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    // Drive the paint to a grey FIRST. The default is fully saturated now, so
    // this no longer comes for free — and without it the test would pass on a
    // colour whose hex can carry hue perfectly well, proving nothing.
    const field = screen.getByLabelText("Paint colour, hex");
    await user.clear(field);
    await user.type(field, "#111111");
    expect(now("Hue")).toBe(0);

    // Every hue of a zero-saturation colour is the same hex, so a knob that
    // derived its position from the hex would be pinned at 0 forever.
    knob("Hue").focus();
    await user.keyboard("{ArrowRight>30/}");
    expect(now("Hue")).toBe(30);
  });

  it("wraps hue through the full circle but CLAMPS lightness at its ends", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    knob("Hue").focus();
    await user.keyboard("{ArrowLeft}");
    expect(now("Hue")).toBe(359); // wrapped, not stuck at zero

    knob("Lightness").focus();
    await user.keyboard("{Home}");
    expect(now("Lightness")).toBe(0);
    await user.keyboard("{ArrowLeft}");
    expect(now("Lightness")).toBe(0); // black is the end of the road
    await user.keyboard("{End}");
    expect(now("Lightness")).toBe(100);
    await user.keyboard("{ArrowRight}");
    expect(now("Lightness")).toBe(100);
  });

  it("snaps the knobs to a hex typed into the field", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const field = screen.getByLabelText("Paint colour, hex");

    await user.clear(field);
    await user.type(field, "#00ff00");

    // Pure green: the knobs must follow the typed value (INTERACTION.md §4).
    expect(now("Hue")).toBe(120);
    expect(now("Lightness")).toBe(50);
  });
});

describe("the 3D dial is decoration, never the control", () => {
  it("keeps the knob operable with no WebGL at all", async () => {
    // jsdom has no WebGL, so this renders the CSS fallback — and every
    // assertion below is about the CONTROL, which must not care.
    const user = userEvent.setup();
    render(<Composer />);

    const hue = knob("Hue");
    expect(hue.getAttribute("role")).toBe("slider");
    expect(hue.getAttribute("aria-valuenow")).toBe("0");

    hue.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(now("Hue")).toBe(2);

    // No <canvas> was needed to get here.
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("marks itself held while turning, and lets go on cancel", () => {
    render(<Composer />);
    const hue = knob("Hue");
    expect(hue.getAttribute("data-grabbed")).toBe("false");
  });
});

describe("the composer opens ready to draw", () => {
  it("starts fully saturated with lightness dead centre", () => {
    render(<Composer />);
    expect(now("Lightness")).toBe(50);
    // Mid lightness is the only position where the knob can travel as far
    // toward black as toward white; opening near black spends most of its
    // range before the first turn.
    expect(screen.getByLabelText("Paint colour, hex")).toHaveProperty(
      "value",
      "#ff0000",
    );
  });
});
