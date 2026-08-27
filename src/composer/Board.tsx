"use client";

import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CELL_UNITS,
  CANVAS_UNITS,
  GRID_SIZE,
  SAFE_AREA_MAX,
  SAFE_AREA_MIN,
  SAFE_AREA_SIZE,
  VIEW_BOX,
} from "@/engine/constants";
import { mirrorIndex } from "@/engine/draw";
import { toCoords, toIndex } from "@/engine/grid";
import { useComposer, useComposerStore } from "./ComposerProvider";

/**
 * The 11x11 drawing surface.
 *
 * Drawn as ONE SVG over the engine's viewBox rather than a CSS grid of divs.
 * Cells, gridlines, hover preview and the keyboard cursor then share a single
 * coordinate space, so a filled cell cannot drift from the box it belongs to —
 * the same lesson the gallery's detail preview already learned.
 *
 * Stroke semantics live entirely in the store. This component's whole job is
 * turning pointer and key input into cell indices.
 */

/** Faint gridlines across the whole canvas. */
const GUIDE_PATH = (() => {
  const segments: string[] = [];
  for (let i = 0; i <= GRID_SIZE; i++) {
    const o = i * CELL_UNITS;
    segments.push(`M${o} 0V${CANVAS_UNITS}`, `M0 ${o}H${CANVAS_UNITS}`);
  }
  return segments.join("");
})();

/** How long the caret waits before retiring. */
const CARET_IDLE_MS = 4000;

export function Board() {
  const store = useComposerStore();
  const cells = useComposer((s) => s.cells);
  const gridGuide = useComposer((s) => s.gridGuide);
  const currentColor = useComposer((s) => s.currentColor);
  const armed = useComposer((s) => s.eyedropperArmed);
  const mirror = useComposer((s) => s.mirror);

  // Local, not store state: a hover highlight and a keyboard caret are views of
  // the pointer, not properties of the drawing. Putting them in the store would
  // put a re-render of every subscriber behind every mouse move.
  const [hover, setHover] = useState<number | null>(null);
  const [caret, setCaret] = useState(toIndex(Math.floor(GRID_SIZE / 2), Math.floor(GRID_SIZE / 2)));
  const [caretIdle, setCaretIdle] = useState(true);
  // A counter, not a timestamp: it restarts the timer even when the caret is
  // woken without moving — pressing Space on the same cell is still use.
  const [caretWoke, setCaretWoke] = useState(0);

  /** Any use of the caret. Called from handlers, never from an effect. */
  const wakeCaret = useCallback(() => {
    setCaretIdle(false);
    setCaretWoke((n) => n + 1);
  }, []);

  useEffect(() => {
    if (caretIdle) return;
    const timer = setTimeout(() => setCaretIdle(true), CARET_IDLE_MS);
    return () => clearTimeout(timer);
  }, [caretWoke, caretIdle]);

  /**
   * Which cell a pointer is over. Read from the element's own box, so it stays
   * correct at any rendered size and through any CSS scaling — deriving it from
   * a fixed pixel size would break the moment the toy is resized in slice 3.
   */
  const cellAt = useCallback((event: ReactPointerEvent<SVGSVGElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_SIZE);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return toIndex(row, col);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      // Primary button only. A right-click drag opening a context menu must not
      // leave a stroke painting behind it.
      if (event.button !== 0) return;
      const index = cellAt(event);
      if (index === null) return;
      // Capture on press: the release then arrives here even if it happens off
      // the board, and a drag that wanders outside and back keeps painting.
      event.currentTarget.setPointerCapture(event.pointerId);
      store.getState().pressCell(index);
      setCaret(index);
      wakeCaret();
    },
    [cellAt, store, wakeCaret],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const index = cellAt(event);
      setHover(index);
      if (index === null) return;
      // dragToCell no-ops unless a stroke is open, so hovering costs nothing.
      store.getState().dragToCell(index);
    },
    [cellAt, store],
  );

  /**
   * pointercancel matters as much as pointerup. The browser cancels a pointer
   * for its own gestures, and a cancel that did not end the stroke would leave
   * it open forever — every later tap would keep painting in the dead stroke's
   * mode.
   */
  const onPointerFinish = useCallback(() => store.getState().endStroke(), [store]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      const { row, col } = toCoords(caret);
      wakeCaret();
      const move = (dRow: number, dCol: number) => {
        event.preventDefault();
        setCaret(
          toIndex(
            Math.min(GRID_SIZE - 1, Math.max(0, row + dRow)),
            Math.min(GRID_SIZE - 1, Math.max(0, col + dCol)),
          ),
        );
      };
      switch (event.key) {
        case "ArrowUp": return move(-1, 0);
        case "ArrowDown": return move(1, 0);
        case "ArrowLeft": return move(0, -1);
        case "ArrowRight": return move(0, 1);
        case " ": {
          event.preventDefault();
          // Press then release: one keystroke is a complete gesture, so it must
          // reach history as one entry exactly like a tap does.
          store.getState().pressCell(caret);
          store.getState().endStroke();
          return;
        }
        default:
      }
    },
    [caret, store, wakeCaret],
  );

  const rects = [];
  for (let i = 0; i < cells.length; i++) {
    const color = cells[i];
    if (color === null) continue;
    const { row, col } = toCoords(i);
    rects.push(
      <rect
        key={i}
        /* The drawing, addressable. Every other rect in this SVG is chrome —
           hover preview, carets, the safe area — and they are all the same
           element with the same attributes. Without a name, anything asking
           "what is drawn?" has to guess from styling, which is how a test ends
           up passing because it matched the safe-area outline. */
        data-cell={i}
        x={col * CELL_UNITS}
        y={row * CELL_UNITS}
        width={CELL_UNITS}
        height={CELL_UNITS}
        fill={color}
      />,
    );
  }

  const caretCoords = toCoords(caret);
  const hoverCoords = hover === null ? null : toCoords(hover);

  /**
   * Where the mirror aid will ALSO paint. Null when it is off, and null on the
   * centre column, whose reflection is itself — drawing a second marker there
   * would stack two translucent fills and make the middle of the board look
   * like a different colour from the rest.
   */
  const echo = (index: number | null) => {
    if (!mirror || index === null) return null;
    const reflected = mirrorIndex(index);
    return reflected === index ? null : toCoords(reflected);
  };
  const hoverEcho = echo(hover);
  const caretEcho = echo(caret);

  /**
   * The safe-area outline appears only as you APPROACH it — from the boundary
   * ring outward. Drawn permanently it is just more lattice, and the eye stops
   * seeing it exactly when it starts mattering; drawn on approach it is a
   * warning that arrives with one cell still in hand.
   */
  const active = hover ?? caret;
  const { row: activeRow, col: activeCol } = toCoords(active);
  const nearEdge =
    activeRow <= SAFE_AREA_MIN ||
    activeRow >= SAFE_AREA_MAX ||
    activeCol <= SAFE_AREA_MIN ||
    activeCol >= SAFE_AREA_MAX;

  return (
    <div className="h-full w-full">
      <svg
        viewBox={VIEW_BOX}
        role="application"
        tabIndex={0}
        aria-label={`Drawing grid, ${GRID_SIZE} by ${GRID_SIZE}. Arrow keys move the cursor, Space fills or clears the cell.`}
        aria-describedby="pixl-board-status"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerFinish}
        onPointerCancel={onPointerFinish}
        onPointerLeave={() => setHover(null)}
        onFocus={wakeCaret}
        /* Retires immediately on blur: a cursor belongs to the focused control. */
        onBlur={() => setCaretIdle(true)}
        onKeyDown={onKeyDown}
        className={`block h-full w-full ${armed ? "cursor-copy" : "cursor-crosshair"}`}
        /* Without this a touch drag scrolls the page instead of painting. */
        style={{ touchAction: "none" }}
      >
        {/* PAINT ORDER, deliberately: lattice, then the art, then the things
            that describe the art. Anything that comments on the drawing has to
            sit above it — a guide underneath the cells is hidden precisely
            where cells cover it, which is where you needed to see it. */}
        {gridGuide && (
          <path d={GUIDE_PATH} stroke="var(--board-line)" strokeWidth={0.25} fill="none" />
        )}

        {rects}

        {/* Hover preview of the paint about to land (INTERACTION.md §1). */}
        {hoverCoords && (
          <rect
            x={hoverCoords.col * CELL_UNITS}
            y={hoverCoords.row * CELL_UNITS}
            width={CELL_UNITS}
            height={CELL_UNITS}
            fill={currentColor}
            opacity={0.35}
            pointerEvents="none"
          />
        )}

        {/* The same preview on the far side, because with Mirror on that cell
            is going to be painted too. Showing only the cell under the pointer
            makes the mirrored half arrive as a surprise. */}
        {hoverEcho && (
          <rect
            x={hoverEcho.col * CELL_UNITS}
            y={hoverEcho.row * CELL_UNITS}
            width={CELL_UNITS}
            height={CELL_UNITS}
            fill={currentColor}
            opacity={0.35}
            pointerEvents="none"
          />
        )}

        {/* The 9x9 safe area (CLAUDE.md) — advisory, never enforced. In the
            WARNING colour rather than the lattice grey: a boundary drawn in the
            same ink as the grid reads as more grid. NOT behind the grid toggle,
            because a warning you can switch off without meaning to is not one. */}
        <rect
          data-safe-area=""
          x={SAFE_AREA_MIN * CELL_UNITS}
          y={SAFE_AREA_MIN * CELL_UNITS}
          width={SAFE_AREA_SIZE * CELL_UNITS}
          height={SAFE_AREA_SIZE * CELL_UNITS}
          rx={1.5}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={0.5}
          /* Round caps and airy gaps: a hard rectangular dash reads as another
             edge of the drawing, which is the one thing an advisory boundary
             must not do. Rounded corners for the same reason. */
          strokeDasharray="0.9 2.4"
          strokeLinecap="round"
          opacity={nearEdge ? 0.55 : 0}
          style={{ transition: "opacity var(--duration-fast) var(--ease-smooth-out)" }}
          pointerEvents="none"
        />

        {/* The mirrored caret, drawn lighter: it marks a consequence, not where
            the cursor is. */}
        {caretEcho && (
          <rect
            data-caret="mirror"
            className={`pixl-caret ${caretIdle ? "is-idle" : ""}`}
            x={caretEcho.col * CELL_UNITS + 0.25}
            y={caretEcho.row * CELL_UNITS + 0.25}
            width={CELL_UNITS - 0.5}
            height={CELL_UNITS - 0.5}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={0.5}
            strokeDasharray="1 1"
            opacity={0.6}
            pointerEvents="none"
          />
        )}

        {/* The keyboard caret. Drawn inside the cell's edge so it never implies
            the cell is larger than it is. */}
        <rect
          data-caret="cursor"
          className={`pixl-caret ${caretIdle ? "is-idle" : ""}`}
          x={caretCoords.col * CELL_UNITS + 0.25}
          y={caretCoords.row * CELL_UNITS + 0.25}
          width={CELL_UNITS - 0.5}
          height={CELL_UNITS - 0.5}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={0.5}
          pointerEvents="none"
        />
      </svg>

      {/* Announced to screen readers as the caret moves — without it the grid is
          operable but silent, which is not the same as accessible. */}
      <p id="pixl-board-status" aria-live="polite" className="sr-only">
        {`Row ${caretCoords.row + 1}, column ${caretCoords.col + 1}, ${
          cells[caret] === null ? "empty" : `filled ${cells[caret]}`
        }`}
      </p>
    </div>
  );
}
