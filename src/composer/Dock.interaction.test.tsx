// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLOSE_MS } from "@/lib/useDismissible";
import { Composer } from "./Composer";
import { clearViewport, setViewportWidth } from "@/test/viewport";

afterEach(clearViewport);
afterEach(cleanup);

const PHONE = 375;
const DESKTOP = 1280;

const openSheet = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Icon details" }));

/**
 * The dock is the one part of the composer that changes shape with the
 * viewport, so these tests state a width before they render anything. The
 * failure they exist to prevent is not cosmetic: the wide row used to WRAP
 * below about 950px, which turned a floating toolbar into a tall slab parked
 * over the tool strip and the saturation slider — controls you could no longer
 * see, let alone reach.
 */
describe("the dock below `lg`", () => {
  beforeEach(() => setViewportWidth(PHONE));

  it("keeps only what you touch while drawing", () => {
    render(<Composer />);

    // The name gates Save, so it stays where the refusal will appear.
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeTruthy();

    // Everything set once, or read exactly, is behind the door.
    expect(screen.queryByLabelText("Category")).toBeNull();
    expect(screen.queryByLabelText("Tags")).toBeNull();
    expect(screen.queryByRole("button", { name: "Import icon" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export SVG" })).toBeNull();

    /* THE HEX IS IN NEITHER HALF OF THE DOCK. It was in the sheet, behind the
       door, on the reading that it is a value you set once — and it is not: it
       is the one metadata-shaped thing you change WHILE drawing, which is the
       line category came back over. It sits on the BOARD as a segment panel at
       the head of the colour pad, reading out what the three knobs produce, so
       on a phone it is on screen at all times rather than one tap away.
       Asserted here rather than merely deleted, because "the sheet no longer
       has it" and "nothing has it" are the same passing test otherwise. */
    expect(screen.getByLabelText("Paint color, hex")).toBeTruthy();
  });

  it("puts the rest one tap away, and says so before it is tapped", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    const door = screen.getByRole("button", { name: "Icon details" });
    expect(door.getAttribute("aria-expanded")).toBe("false");

    await openSheet(user);

    expect(door.getAttribute("aria-expanded")).toBe("true");
    const sheet = screen.getByRole("dialog", { name: "Details" });
    expect(sheet).toBeTruthy();
    expect(screen.getByLabelText("Tags")).toBeTruthy();
    /* SCOPED TO THE SHEET, and kept scoped even though category is back here
       and nothing else on the route answers to the name. `within` is what makes
       this test about the SHEET rather than about the document — the unscoped
       form passed on the board's drum for a whole run while category was over
       there, which is the failure mode worth keeping a guard against. */
    expect(within(sheet).getByLabelText("Category")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import icon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export SVG" })).toBeTruthy();
  });

  it("splits the controls rather than mirroring them", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await openSheet(user);

    // The bar is still mounted behind the sheet, so anything the sheet repeated
    // would be a second control answering to the same name in one
    // accessibility tree — the standard failure of a mobile surface that
    // duplicates its desktop one instead of dividing it.
    //
    // Ids are checked FIRST and separately, because a duplicated field would
    // carry a duplicated id, and `getByLabelText` resolves `for` through
    // `getElementById` — which returns the first match. So the label-count
    // assertion below silently passes on exactly the mistake it is written to
    // catch, unless the ids are proven unique before it runs.
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    expect([...new Set(ids)]).toHaveLength(ids.length);

    for (const label of ["Name", "Category", "Tags"]) {
      expect(screen.getAllByLabelText(label)).toHaveLength(1);
    }
    expect(screen.getAllByRole("button", { name: "Save draft" })).toHaveLength(1);
  });

  it("keeps a half-typed tag list across a close and reopen", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    await openSheet(user);
    await user.type(screen.getByLabelText("Tags"), "Arrow Right");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openSheet(user);
    // Not "arrow-right": the store holds the kebab-cased tags, and a draft
    // owned by the sheet would be re-seeded from those on every reopen.
    expect(screen.getByLabelText("Tags")).toHaveProperty("value", "Arrow Right");
  });

  it("leaves the sheet open for a view toggle, and closes it for a file action", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await openSheet(user);

    // A toggle's own pressed state is its feedback, so the sheet stays.
    const toggle = screen.getByRole("button", { name: /Show control names/ });
    await user.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    // Waited out, not merely checked: a dismissing sheet stays mounted for its
    // close animation, so asserting straight after the click would find the
    // dialog either way and prove nothing.
    await new Promise((resolve) => setTimeout(resolve, CLOSE_MS.sheet + 50));
    expect(screen.queryByRole("dialog")).toBeTruthy();

    // An export ends in a toast, and a toast behind the backdrop is a
    // confirmation nobody sees — so this one does close.
    await user.click(screen.getByRole("button", { name: "Export SVG" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("refuses an unnamed save as an assertive alert, not a line inside the bar", async () => {
    const user = userEvent.setup();
    render(<Composer />);

    const bar = screen.getByLabelText("Name").closest("div.fixed");

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("name");
    // Assertive, because a refusal means the thing you asked for did not
    // happen — that interrupts, where a confirmation only reports.
    expect(alert.getAttribute("aria-live")).toBe("assertive");

    // And it is NOT inside the bar: an error rendered there grew the toolbar
    // upward into the toy at the exact moment you were trying to read it.
    // (Only containment is asserted — jsdom gives every element a zero-height
    // rect, so a height comparison here would pass whatever the layout did.)
    expect(bar?.contains(alert)).toBe(false);
  });

  it("re-announces an identical refusal instead of leaving the first one standing", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    const save = screen.getByRole("button", { name: "Save draft" });

    await user.click(save);
    const first = screen.getByRole("alert");

    await user.click(save);
    // A new node, not the same one still sitting there. Same string, same
    // position — the only thing that tells a screen reader something happened
    // twice is the element being replaced.
    expect(screen.getByRole("alert")).not.toBe(first);
  });
});

describe("the dock at `lg` and up", () => {
  beforeEach(() => setViewportWidth(DESKTOP));

  it("is one row with no door, because everything already fits", () => {
    render(<Composer />);

    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Tags")).toBeTruthy();
    /* THE HEX IS THE ONE FIELD THAT STAYED ON THE BOARD. It reads out the
       colour the three knobs produce, so it belongs to that instrument rather
       than to this row of metadata — and unlike category, it is a value you
       change WHILE drawing. Asserted here rather than merely dropped, because
       "the dock no longer has it" and "nothing has it" are the same passing
       test otherwise. */
    expect(screen.getByLabelText("Paint color, hex")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import icon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeTruthy();

    expect(screen.queryByRole("button", { name: "Icon details" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
