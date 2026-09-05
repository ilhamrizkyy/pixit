"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COPY_FORMATS,
  FORMAT_NOUNS,
  formatIcon,
  type CopyFormat,
} from "@/engine/formats";
import { DEFAULT_CELL_STYLE, type CellStyle } from "@/engine/render";
import { cellsToSvg, svgFileName } from "@/engine/svg";
import type { Cells, IconDef } from "@/engine/types";
import type { ToastTone } from "@/components/Toast";
import {
  cellsToPngBlob,
  copyText,
  downloadBlob,
  downloadSvg,
} from "@/lib/download";

/**
 * WHAT A SELECTED ICON CAN DO — shared by the two surfaces that offer it.
 *
 * There are two, and they are not a phone version of one thing: the desktop
 * board has a DETAIL PANEL in a column of its own, and below `lg` the whole
 * left side of the board is hidden, so the same actions live on a bar inside
 * the screen. Putting the handlers here is what stops the two drifting — a copy
 * that carried the display's colour on one surface and not the other would be
 * invisible until somebody noticed their icon came out black.
 *
 * EVERY EXPORT IS BUILT FROM `displayCells`, never from the stored `IconDef`,
 * so the gallery's colour, cell shape and size travel with whatever leaves.
 */

/** The two places Copy appears on the detail shelf. */
export type CopySource = "primary" | "block";

type Options = {
  icon: IconDef;
  displayCells: Cells;
  cellStyle?: CellStyle;
  /** The gallery's size scale, in px. Sets the export's dimensions. */
  size: number;
  onNotify: (message: string, tone?: ToastTone) => void;
};

export function useIconActions({
  icon,
  displayCells,
  cellStyle = DEFAULT_CELL_STYLE,
  size,
  onNotify,
}: Options) {
  const [format, setFormat] = useState<CopyFormat>(COPY_FORMATS[0]);
  /* WHICH BUTTON WAS PRESSED, not just what happened.

     Copy appears TWICE on the shelf on purpose — the filled primary at the foot
     of the identity column, and the same control in its outlined weight in the
     source block's corner. They shared one `copyLabel`, so pressing either one
     turned BOTH of them to "Copied": a button reporting an action nobody took
     on it, two columns away from the press. Feedback has to belong to the
     control that was pressed.

     The menu's items attribute to `primary`, because the chevron is the other
     half of that same split button. */
  const [feedback, setFeedback] = useState<{
    source: CopySource;
    label: string;
  } | null>(null);
  /* ONE TIMER, HELD. It was a bare `setTimeout` per press, so pressing twice
     stacked two of them and the first fired mid-way through the second's
     feedback — the label snapped back to "Copy" while the copy it belonged to
     was still fresh. Held, it can be cleared and restarted. */
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (reset.current !== null) clearTimeout(reset.current);
    },
    [],
  );

  const svg = cellsToSvg(displayCells, { title: icon.name, cellStyle, size });
  const source = formatIcon(format, svg, icon.name, size);

  /* COPY A NAMED FORMAT, which the menu needs and the button does not: a menu
     item chooses and copies in one press, and `setFormat` has not landed by the
     time the handler runs. So the format is an argument and the button passes
     the live one. */
  const copyAs = useCallback(
    async (which: CopyFormat, source: CopySource = "primary") => {
      const text = formatIcon(which, svg, icon.name, size);
      if (await copyText(text)) {
        setFeedback({ source, label: "Copied" });
        onNotify(`${FORMAT_NOUNS[which]} copied`);
      } else {
        /* The selectable-textarea fallback went with the SVG disclosure.
           Download SVG needs no clipboard API at all, so a refusal points at it
           rather than leaving somebody with a blocked clipboard no route to the
           markup. */
        setFeedback({ source, label: "Could not copy" });
        onNotify("Could not copy. Use Download SVG.", "error");
      }
      if (reset.current !== null) clearTimeout(reset.current);
      reset.current = setTimeout(() => {
        reset.current = null;
        setFeedback(null);
      }, 1600);
    },
    [svg, icon.name, size, onNotify],
  );

  const copy = useCallback(
    (source: CopySource = "primary") => copyAs(format, source),
    [copyAs, format],
  );

  /** What one button should be showing right now. The other stays at rest. */
  const labelFor = useCallback(
    (source: CopySource) =>
      feedback !== null && feedback.source === source ? feedback.label : "Copy",
    [feedback],
  );

  const saveSvg = useCallback(() => {
    downloadSvg(svgFileName(icon), svg);
    onNotify(`Downloaded ${svgFileName(icon)}`);
  }, [icon, svg, onNotify]);

  const savePng = useCallback(async () => {
    const blob = await cellsToPngBlob(displayCells, { pixels: size });
    if (blob === null) {
      onNotify(
        "Could not render a PNG in this browser. Download the SVG instead.",
        "error",
      );
      return;
    }
    downloadBlob(`${icon.id}.png`, blob);
    onNotify(`Downloaded ${icon.id}.png`);
  }, [displayCells, size, icon.id, onNotify]);

  return { format, setFormat, source, labelFor, copy, copyAs, saveSvg, savePng };
}
