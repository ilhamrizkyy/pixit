"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import { cellsToSvg, svgFileName } from "@/engine/svg";
import type { Cells, IconDef } from "@/engine/types";
import {
  cellsToPngBlob,
  copyText,
  downloadBlob,
  downloadSvg,
} from "@/lib/download";

/**
 * THE DETAIL BAR — what the mini screen used to hold, along the board's bottom.
 *
 * A device puts its readout on the screen and its controls on the chassis under
 * it. Keeping both inside the screen's frame is what made the left column fat:
 * a four-tag icon added ~110px of text to a panel 264px wide, and the whole side
 * of the board grew to hold it. Down here the same content has the full width of
 * the board and costs one strip of height.
 *
 * It exists ONLY while an icon is loaded. That is a real layout change — the
 * screen above loses the strip's height — but the icon grid scrolls inside
 * itself, so nothing reflows: the scroll container just gets shorter.
 *
 * ESCAPE LIVES HERE, at the document. This component is mounted exactly when
 * something is selected, so the listener's lifetime is the state it clears —
 * no flag to check. It has to be at the document because nothing here ever
 * takes focus: after clicking a card the focus is still on the card, and a
 * handler on this element would never see the key. It steps aside for anything
 * inside a real dialog, so the filter sheet still owns its own Escape.
 *
 * WHAT YOU SEE IS WHAT YOU COPY. Every export is built from `displayCells` and
 * the same `cellStyle` the screen draws with, so the gallery's colour and cell
 * shape travel with the icon.
 *
 * SIZE TRAVELS TOO, as of 2026-08-29, and it is the one display setting that
 * keeps going after the picture stops. The grid's seat is a fixed 64px, so it
 * draws nothing above 48 — but the scale runs to 120, and every stop past the
 * cap sets the size of the file rather than the size of the tile. That is what
 * makes the top half of the rail's travel do something instead of nothing.
 */

type DetailBarProps = {
  icon: IconDef;
  /** Cells with the gallery's display settings already applied. */
  displayCells: Cells;
  cellStyle?: CellStyle;
  /** The gallery's size scale, in px. Sets the export's dimensions. */
  size: number;
  onClose: () => void;
  onNotify: (message: string) => void;
};

export function DetailBar({
  icon,
  displayCells,
  cellStyle = DEFAULT_CELL_STYLE,
  size,
  onClose,
  onNotify,
}: DetailBarProps) {
  const [copyLabel, setCopyLabel] = useState("Copy SVG");
  const svg = cellsToSvg(displayCells, { title: icon.name, cellStyle, size });

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if ((event.target as HTMLElement | null)?.closest?.('[role="dialog"]'))
        return;
      onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const handleCopySvg = async () => {
    if (await copyText(svg)) {
      setCopyLabel("Copied");
      onNotify("SVG copied");
    } else {
      // The selectable-textarea fallback went with the disclosure. Download SVG
      // needs no clipboard API at all, so the refusal points at it rather than
      // leaving someone with a blocked clipboard no route to the markup.
      setCopyLabel("Could not copy");
      onNotify("Could not copy — use Download SVG");
    }
    setTimeout(() => setCopyLabel("Copy SVG"), 1600);
  };

  const handleDownloadPng = async () => {
    const blob = await cellsToPngBlob(displayCells, { pixels: size });
    if (blob === null) {
      onNotify("Could not render a PNG in this browser");
      return;
    }
    downloadBlob(`${icon.id}.png`, blob);
    onNotify(`Downloaded ${icon.id}.png`);
  };

  return (
    <section aria-label="Selected icon" className="pixl-detailbar">
      {/* ---- Readout ------------------------------------------------------
          The name is in the DATA face because it is a code identifier — the
          string you paste, not a title. */}
      <div className="pixl-detailbar-read">
        {/* BOLD. The data face carries real weights, unlike the pixel face
            §4 forbids synthesising one for — and the name is the one thing on
            this bar you came here to read. */}
        <h2 className="truncate font-data text-ui font-bold text-text">
          {icon.name}
        </h2>
        <p className="truncate text-caption text-text-muted">
          <span className="capitalize">{icon.category}</span>
          {icon.tags.length > 0 && ` · ${icon.tags.join(" · ")}`}
        </p>
      </div>

      {/* ---- Actions ------------------------------------------------------
          Below `lg` they scroll rather than wrap: a bar that grows a second row
          would push the screen up every time a long name arrived, which is the
          defect this whole move was fixing. */}
      <div className="pixl-detailbar-actions">
        <button type="button" onClick={handleCopySvg} className={ACTION}>
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            downloadSvg(svgFileName(icon), svg);
            onNotify(`Downloaded ${svgFileName(icon)}`);
          }}
          className={ACTION}
        >
          Download SVG
        </button>
        <button type="button" onClick={handleDownloadPng} className={ACTION}>
          Download PNG
        </button>
        <button
          type="button"
          onClick={async () =>
            onNotify(
              (await copyText(icon.name)) ? "Name copied" : "Could not copy",
            )
          }
          className={ACTION}
        >
          Copy name
        </button>
      </div>

      {/* Rightmost, and separated: it undoes the selection the rest of the bar
          acts on, so it is not one of them. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Clear selection"
        className={`${ACTION} flex size-9 items-center justify-center px-0 text-text-muted`}
      >
        ✕
      </button>
    </section>
  );
}

/* FLAT, NOT TACTILE. These are on the glass, and the board's rule is that depth
   belongs to the plastic — anything drawn on a display is drawn. They were
   `.pixl-key` domed caps, which is the body's button, and having them on a
   screen made the shelf read as a piece of chassis that had wandered inside. */
const ACTION =
  "shrink-0 whitespace-nowrap rounded-sm border border-border bg-bg px-3 py-2 " +
  "text-caption text-text transition-colors hover:bg-surface";
