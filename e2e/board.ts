import { expect, type Locator, type Page } from "@playwright/test";
import { GRID_SIZE } from "../src/engine/constants";

/**
 * Addressing the drawing grid by CELL rather than by pixel.
 *
 * The board is one SVG over an 11x11 viewBox, drawn `preserveAspectRatio`
 * default into a square box — so the mapping from cell to viewport point is
 * exact, and every test can say "row 3, column 5" instead of carrying
 * coordinates around. Recomputed from the live bounding box each time, because
 * the board is sized against the viewport and moves when the window does.
 */

export async function openComposer(page: Page): Promise<Locator> {
  await page.goto("/create");
  const board = page.getByRole("application", { name: /Drawing grid/ });
  await expect(board).toBeVisible();

  /* AND WAIT FOR THE TOY TO LAND. `.toy-frame` enters on `toy-in`, so for the
     first ~400ms the board is still travelling — and `cellPoint` takes ONE
     bounding box and hands the coordinates to a tap that happens later. Measure
     during the flight and the tap lands on whatever has moved under it.
     Measured: the board settled from y=56.2 to y=49.3, and on a phone, where a
     cell is a few pixels, seven pixels is more than a whole row. The test then
     reports the wrong cell painted, which reads as a drawing bug anywhere but
     here.
     It was visible only as an intermittent failure while the board was large.
     Waiting on the animations rather than a timeout keeps it exact, and
     reduced-motion runs simply have nothing to wait for. */
  await page.evaluate(() =>
    Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]),
  );
  return board;
}

/** Viewport point at the centre of a cell. */
export async function cellPoint(
  board: Locator,
  row: number,
  col: number,
): Promise<{ x: number; y: number }> {
  const box = await board.boundingBox();
  if (box === null) throw new Error("the board has no box");
  return {
    x: box.x + ((col + 0.5) * box.width) / GRID_SIZE,
    y: box.y + ((row + 0.5) * box.height) / GRID_SIZE,
  };
}

/** Which cells are actually drawn, as engine indices. */
export async function drawn(page: Page): Promise<number[]> {
  const indices = await page
    .locator("[data-cell]")
    .evaluateAll((nodes) => nodes.map((node) => Number((node as HTMLElement).dataset.cell)));
  return indices.sort((a, b) => a - b);
}

/** Every index inside the rectangle spanned by two cells, as the engine orders them. */
export function rect(from: [number, number], to: [number, number]): number[] {
  const [r1, c1] = from;
  const [r2, c2] = to;
  const indices: number[] = [];
  for (let row = Math.min(r1, r2); row <= Math.max(r1, r2); row++) {
    for (let col = Math.min(c1, c2); col <= Math.max(c1, c2); col++) {
      indices.push(row * GRID_SIZE + col);
    }
  }
  return indices.sort((a, b) => a - b);
}

/**
 * A real press-move-release with the mouse. Moves in STEPS rather than jumping,
 * because a single move to the far corner would pass the whole gesture in one
 * pointermove and never exercise the live-preview path that recomputes the
 * rectangle on every sample.
 */
export async function dragCells(
  page: Page,
  board: Locator,
  from: [number, number],
  waypoints: Array<[number, number]>,
): Promise<void> {
  const start = await cellPoint(board, from[0], from[1]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [row, col] of waypoints) {
    const point = await cellPoint(board, row, col);
    await page.mouse.move(point.x, point.y, { steps: 6 });
  }
  await page.mouse.up();
}

export async function tapCell(
  page: Page,
  board: Locator,
  row: number,
  col: number,
): Promise<void> {
  const point = await cellPoint(board, row, col);
  await page.mouse.click(point.x, point.y);
}

/**
 * Open the gallery's colour popover and return its panel.
 *
 * THE INSTRUMENT MOVED BEHIND A KEY on 2026-09-13, when the 264px control
 * column became a row in the gallery's sticky toolbar. A saturation square
 * cannot stand in a 64px bar, so the swatch is a button and the field is behind
 * it — which means every test that reaches for the hue strip, the hex readout
 * or the field has to open it first.
 *
 * Idempotent: it reads `aria-expanded` rather than toggling blind, so calling
 * it twice does not close what the first call opened.
 */
export async function openColor(page: Page): Promise<Locator> {
  const key = page.getByRole("button", { name: /Choose a color/ });
  if ((await key.getAttribute("aria-expanded")) !== "true") await key.click();
  const panel = page.getByRole("group", { name: "COLOR" });
  await expect(panel).toBeVisible();
  return panel;
}
