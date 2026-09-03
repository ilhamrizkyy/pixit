/**
 * Browser-only helpers for getting icons out of the page.
 *
 * These live OUTSIDE the engine on purpose: rasterizing needs a canvas and
 * saving needs the DOM, both of which the engine may not touch. The engine
 * produces the SVG string; this turns it into a file.
 */

import { GRID_SIZE } from "@/engine/constants";
import { toIndex } from "@/engine/grid";
import type { Cells } from "@/engine/types";

/**
 * The PNG's size in pixels when nothing asks for one.
 *
 * It was `PNG_SCALE = 12` — pixels per SVG unit, so 528px from a 44-unit
 * canvas. The gallery's size scale now names the export size directly, so the
 * multiplier became an indirection with one caller and no meaning of its own.
 */
export const DEFAULT_PNG_SIZE = 528;

/** Trigger a browser download for a blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(filename: string, svg: string): void {
  downloadBlob(filename, new Blob([svg], { type: "image/svg+xml" }));
}

/**
 * Rasterize cells to a PNG blob.
 *
 * Drawn cell by cell rather than by loading the SVG into an Image, which
 * avoids the canvas tainting and async-decode problems that come with
 * data-URI SVG sources. Transparent where cells are empty.
 */
/**
 * The 12 cell boundaries of a `pixels`-wide raster, in whole pixels.
 *
 * CELL EDGES SNAP, and that is the difference between a pixel icon and a
 * smudge. 11 divides almost nothing, so a 24px export puts every boundary on a
 * 2.18px fraction — and a fractional `fillRect` is anti-aliased, which softens
 * the exact edges this format exists to keep. Rounding each boundary instead
 * makes some cells 2px and some 3px with no blur anywhere: nearest-neighbour,
 * which is what a pixel scaler does.
 *
 * Exported because it is the only testable part of the rasterizer — jsdom has
 * no canvas, so the drawing itself cannot be reached from a unit test.
 */
export function pngCellEdges(pixels: number): number[] {
  return Array.from({ length: GRID_SIZE + 1 }, (_, i) =>
    Math.round((i * pixels) / GRID_SIZE),
  );
}

export function cellsToPngBlob(
  cells: Cells,
  {
    pixels = DEFAULT_PNG_SIZE,
    padding = 0,
  }: { pixels?: number; padding?: number } = {},
): Promise<Blob | null> {
  const cellPx = pixels / GRID_SIZE;
  const padPx = Math.round(padding * cellPx);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pixels) + padPx * 2;
  canvas.height = canvas.width;

  const ctx = canvas.getContext("2d");
  if (ctx === null) return Promise.resolve(null);

  const edges = pngCellEdges(pixels);

  // The canvas starts fully transparent and no background is ever painted,
  // so padding reads as empty space rather than a colored border.
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const color = cells[toIndex(row, col)];
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        padPx + edges[col],
        padPx + edges[row],
        edges[col + 1] - edges[col],
        edges[row + 1] - edges[row],
      );
    }
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Copy text to the clipboard. Returns false when the browser refuses — the
 * caller shows the SVG in a selectable field as the fallback, so a failure
 * here is recoverable rather than a dead end.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
