/**
 * Browser-only helpers for getting icons out of the page.
 *
 * These live OUTSIDE the engine on purpose: rasterizing needs a canvas and
 * saving needs the DOM, both of which the engine may not touch. The engine
 * produces the SVG string; this turns it into a file.
 */

import { CELL_UNITS, CANVAS_UNITS, GRID_SIZE } from "@/engine/constants";
import { toIndex } from "@/engine/grid";
import type { Cells } from "@/engine/types";

/** Pixels per SVG unit when rasterizing. 12 gives a 528px PNG from a 44 unit canvas. */
export const PNG_SCALE = 12;

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
export function cellsToPngBlob(
  cells: Cells,
  { scale = PNG_SCALE, padding = 0 }: { scale?: number; padding?: number } = {},
): Promise<Blob | null> {
  const cellPx = CELL_UNITS * scale;
  const padPx = padding * cellPx;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_UNITS * scale + padPx * 2;
  canvas.height = canvas.width;

  const ctx = canvas.getContext("2d");
  if (ctx === null) return Promise.resolve(null);

  // The canvas starts fully transparent and no background is ever painted,
  // so padding reads as empty space rather than a colored border.
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const color = cells[toIndex(row, col)];
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(padPx + col * cellPx, padPx + row * cellPx, cellPx, cellPx);
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
