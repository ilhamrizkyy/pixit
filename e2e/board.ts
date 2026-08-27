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
