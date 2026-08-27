"use client";

import { useState } from "react";
import { IconPreview } from "@/components/IconPreview";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import { cellsToSvg, svgFileName } from "@/engine/svg";
import type { Cells, IconDef } from "@/engine/types";
import { useDialog } from "@/lib/useDialog";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import {
  cellsToPngBlob,
  copyText,
  downloadBlob,
  downloadSvg,
} from "@/lib/download";

/**
 * Icon detail — a DOCKED PANEL, not a modal.
 *
 * It spans the content width along the bottom edge and dims nothing. The grid
 * above stays visible and clickable, so picking another icon swaps the panel's
 * contents rather than closing and reopening it. That is the whole point of
 * the pattern: comparing icons is the common task, and a modal makes you
 * dismiss one before you can look at the next.
 *
 * Being non-modal has real consequences, honoured here: no backdrop, no
 * scroll lock, no focus trap, and no `aria-modal`. Trapping Tab inside a panel
 * the page still uses would strand the keyboard.
 *
 * The preview sits ON the cell lattice, not merely over it: art and grid
 * share one SVG, so a filled cell is always exactly one grid box.
 *
 * WHAT YOU SEE IS WHAT YOU COPY. Exports are built from `displayCells` and the
 * same `cellStyle` the preview draws with, so the gallery's colour, flip,
 * rotation, padding and cell style all travel with the icon.
 *
 * A styled export is a PICTURE rather than a description: an inset or a circle
 * cannot be read back as cells, so `svgToCells` refuses one outright instead of
 * importing something quietly wrong. Solid still round-trips, which is the
 * guarantee BACKLOG.md D actually makes.
 */

type IconDetailProps = {
  icon: IconDef;
  /** Cells with the gallery's display settings already applied. */
  displayCells: Cells;
  padding: number;
  cellStyle?: CellStyle;
  onClose: () => void;
  onNotify: (message: string) => void;
};

export function IconDetail({
  icon,
  displayCells,
  padding,
  cellStyle = DEFAULT_CELL_STYLE,
  onClose,
  onNotify,
}: IconDetailProps) {
  const { closing, requestClose } = useDismissible(onClose, CLOSE_MS.sheet);
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(requestClose, {
    modal: false,
  });
  const [copyLabel, setCopyLabel] = useState("Copy SVG");
  const svg = cellsToSvg(displayCells, { title: icon.name, padding, cellStyle });

  const handleCopySvg = async () => {
    if (await copyText(svg)) {
      setCopyLabel("Copied");
      onNotify("SVG copied");
    } else {
      setCopyLabel("Select the code below");
    }
    setTimeout(() => setCopyLabel("Copy SVG"), 1600);
  };

  const handleDownloadPng = async () => {
    const blob = await cellsToPngBlob(displayCells, { padding });
    if (blob === null) {
      onNotify("Could not render a PNG in this browser");
      return;
    }
    downloadBlob(`${icon.id}.png`, blob);
    onNotify(`Downloaded ${icon.id}.png`);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${icon.name} details`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`pixl-detail fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg shadow-[var(--shadow-overlay)] outline-none lg:left-[var(--sidebar-width)] ${
        closing ? "is-closing" : ""
      }`}
    >
      <button
        type="button"
        onClick={requestClose}
        aria-label="Close"
        className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-sm text-body text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        ✕
      </button>

      <div className="flex max-h-[60vh] gap-5 overflow-y-auto p-5 sm:gap-7 sm:p-7">
        {/* ---- Preview: the icon ON its own grid ------------------------
            One SVG draws both, so every filled cell occupies exactly one
            lattice box at any size or padding. Layering two SVGs is what let
            them drift apart. */}
        <div className="size-28 shrink-0 rounded-md bg-surface p-2 sm:size-44 sm:p-3">
          <IconPreview
            cells={displayCells}
            title={icon.name}
            padding={padding}
            cellStyle={cellStyle}
            grid
            className="size-full"
          />
        </div>

        {/* ---- Detail --------------------------------------------------- */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 pr-10">
          <div>
            <h2 className="font-data text-h3 break-all text-text">
              {icon.name}
            </h2>
            {icon.tags.length > 0 && (
              <p className="mt-1.5 text-ui text-text-muted">
                {icon.tags.join(" · ")}
              </p>
            )}
          </div>

          <p>
            <span className="inline-block rounded-full bg-surface px-3 py-1 text-caption text-text-muted">
              {icon.category}
            </span>
          </p>

          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              className="rounded-sm bg-accent px-4 py-2.5 text-ui text-bg transition-colors hover:bg-accent-hover"
            >
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

          <details className="group">
            <summary className="cursor-pointer list-none text-caption text-text-muted transition-colors hover:text-text">
              Show SVG markup
            </summary>
            <textarea
              readOnly
              value={svg}
              aria-label={`SVG markup for ${icon.name}`}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 h-20 w-full resize-none rounded-sm border border-border bg-surface-2 p-2.5 font-data text-caption text-text-muted"
            />
          </details>
        </div>
      </div>
    </div>
  );
}

const ACTION =
  "rounded-sm border border-border bg-surface px-4 py-2.5 text-ui text-text transition-colors hover:border-text-faint";
