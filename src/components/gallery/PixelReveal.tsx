"use client";

import { useEffect, useRef, useState } from "react";
import { CELL_UNITS, GRID_SIZE, VIEW_BOX } from "@/engine/constants";
import { toIndex } from "@/engine/grid";
import {
  cellNode,
  DEFAULT_CELL_STYLE,
  layoutCells,
  type CellStyle,
} from "@/engine/render";
import type { Cells } from "@/engine/types";

/**
 * PIXEL MATERIALIZE — the mini screen's reveal.
 *
 * A selected icon does not appear, it ASSEMBLES. Every filled cell fades up on
 * its own delay scattered across the window, so the picture condenses out of
 * the panel in a speckled order rather than wiping or sweeping. Transient noise
 * cells light and die inside the icon's own bounds while it happens, peaking
 * about two thirds through and then dying off, which is what makes it read as
 * condensing rather than as fading in.
 *
 * IT IS A DISPLAY ANIMATION, NOT A UI TRANSITION, which is why it is allowed to
 * outrun DESIGN.md §5b's clocks at all: those govern surfaces opening and
 * closing, and this is a screen drawing a picture, the same way the hex
 * readout's segment refresh earned its own 180ms rule rather than borrowing the
 * modal's. It is NOT a licence for any number. The first build ran 880ms, which
 * took longer for one icon to arrive than the filter sheet takes to cross the
 * whole screen, and clicking through the grid felt like waiting.
 *
 * THE OFF-DOT MATRIX IS THE IDLE STATE. Every cell carries a faint dot at rest,
 * so the panel is a dot-matrix display that is on with nothing on it. It
 * replaces the lattice of lines the screen drew before, and it is the one place
 * DESIGN.md's own argument against a ghost does NOT apply: the hex readout's
 * `888888` was rejected because a full-glyph face draws two different
 * letterforms on top of each other, while on real hardware "the unlit segments
 * are the SAME shapes as the lit ones, so the ghost sits inside them and
 * disappears". A dot centred in a cell is exactly that: the lit cell covers it
 * completely.
 *
 * ONE NODE PER CELL WHILE IT ANIMATES, THEN THE MERGED RENDER. `layoutCells`
 * merges horizontal runs for `solid`, so a five-cell row is a single rect and
 * cannot animate per cell. Merging is not incidental either: DESIGN.md §6 says
 * it is what removes the hairline anti-aliasing seam between abutting rects. So
 * the reveal draws unmerged nodes and the settled picture swaps back to the
 * merged walk, leaving the resting image identical to what it was before this
 * existed.
 *
 * THE SCATTER IS HASHED, NOT RANDOM. `Math.random()` during render would
 * produce different delays on the server and the client, and this route
 * prerenders, so it would be a hydration mismatch. A hash of the icon's id and
 * the cell index is stable across both, survives a re-render, and has the
 * better property besides: an icon always materialises the same way, which
 * reads as something about the icon rather than as noise.
 *
 * REDUCED MOTION is handled in the stylesheet rather than here. The global rule
 * already collapses every duration, but it does NOT touch `animation-delay`,
 * which would leave the cells popping in one at a time across the window with
 * no fade
 * at all — worse than no animation. `.pixl-reveal` zeroes the delays and drops
 * the noise outright, so the animated layer paints identically to the settled
 * one and there is nothing to flash.
 */

/**
 * The spread of per-cell delays. A cell lights somewhere inside this.
 *
 * IT WAS 640, AND THAT WAS TOO SLOW. A reveal is not a UI transition, so it is
 * allowed to outrun DESIGN.md §5b's clocks, but not by this much: at 880ms
 * total the icon took longer to arrive than the sheet takes to cross the whole
 * screen, and clicking through a grid of icons felt like waiting. 360 plus the
 * fade lands at 530, which still reads as assembling rather than appearing.
 */
const REVEAL_WINDOW_MS = 360;
/** One cell's own flicker, once its delay is up. */
const REVEAL_FADE_MS = 170;
/** The whole reveal, and when the merged render takes over. */
const REVEAL_TOTAL_MS = REVEAL_WINDOW_MS + REVEAL_FADE_MS;

/**
 * LEAVING IS THE SAME EFFECT IN REVERSE, not a fade of the finished picture.
 *
 * It was one uniform 180ms dissolve of the merged shape, which made deselecting
 * a different KIND of event from selecting: the icon condensed cell by cell and
 * then vanished as a block. A dot-matrix panel does not clear that way. The
 * cells go out scattered, the way they came in.
 *
 * Faster than arriving, which is §5b's rule and not an exception to it.
 */
const CLEAR_WINDOW_MS = 190;
const CLEAR_FADE_MS = 120;
const CLEAR_TOTAL_MS = CLEAR_WINDOW_MS + CLEAR_FADE_MS;

/** How long a noise cell lives. Short: it is a flicker, not a pixel. */
const NOISE_LIFE_MS = 130;

/** The dot every cell carries at rest, in grid units. */
const DOT_RADIUS = 0.45;

/**
 * A stable pseudo-random in [0, 1) from a seed and an index.
 *
 * FNV-1a with a xorshift finisher. Deterministic, dependency free, and good
 * enough for scattering: what matters is that neighbouring indices land far
 * apart, which a plain modulo would not give.
 */
function hashed(seed: string, index: number): number {
  let h = 2166136261 ^ index;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Every cell that carries paint, with the box they sit inside. */
function filledCells(cells: Cells) {
  const filled: { row: number; col: number; color: string }[] = [];
  let top = GRID_SIZE;
  let left = GRID_SIZE;
  let bottom = -1;
  let right = -1;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const color = cells[toIndex(row, col)];
      if (color === null || color === undefined) continue;
      filled.push({ row, col, color });
      top = Math.min(top, row);
      left = Math.min(left, col);
      bottom = Math.max(bottom, row);
      right = Math.max(right, col);
    }
  }

  return { filled, top, left, bottom, right };
}

type PixelRevealProps = {
  /** Cells with the gallery's display settings applied, or null when idle. */
  cells: Cells | null;
  /** What identifies this drawing, and seeds its scatter. */
  seed: string | null;
  cellStyle?: CellStyle;
  className?: string;
};

export function PixelReveal({
  cells,
  seed,
  cellStyle = DEFAULT_CELL_STYLE,
  className,
}: PixelRevealProps) {
  /* SETTLED means the reveal has finished and the merged walk can take over.
     It stores a RUN number rather than the seed, for two reasons. It means the
     effect never has to reset it synchronously, since a fresh run simply does
     not match; and it fixes the case a seed cannot see, which is clearing an
     icon and choosing the same one again. */
  const [settled, setSettled] = useState(-1);
  const runs = useRef(0);

  /* The drawing on its way out, running the SAME scatter in reverse. It
     OVERLAPS the incoming reveal rather than running before it: sequential
     would mean waiting out a dissolve before the icon you just clicked began to
     appear. */
  const [leaving, setLeaving] = useState<{
    cells: Cells;
    seed: string;
    run: number;
  } | null>(null);
  const first =
    cells !== null && seed !== null ? { cells, seed, run: 0 } : null;
  const [shown, setShown] = useState(first);
  const previous = useRef(first);

  /* THE REVEAL KEYS ON THE ICON, NEVER ON THE CELLS, and that distinction is
     load-bearing rather than tidy. `displayCells` is rebuilt whenever colour,
     shape or size changes, so a version that replayed on any new array would
     re-materialise the whole picture on every frame of a knob drag. A new
     drawing replays; a recolour of the drawing already on screen does not. */
  useEffect(() => {
    const next = cells !== null && seed !== null ? { cells, seed } : null;
    const prior = previous.current;

    if (prior?.seed === next?.seed) {
      if (next !== null && prior !== null && prior.cells !== next.cells) {
        // A recolour of what is already on screen: same run, new paint.
        const repainted = { ...next, run: prior.run };
        previous.current = repainted;
        setShown(repainted);
      }
      return;
    }

    if (prior !== null) setLeaving(prior);
    const started = next === null ? null : { ...next, run: ++runs.current };
    previous.current = started;
    setShown(started);
  }, [cells, seed]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = setTimeout(() => setLeaving(null), CLEAR_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  /* Keyed on the RUN, not the cells: a recolour must not put a settled picture
     back into its reveal. Nothing is reset here on the way in, because a run
     that has not finished simply does not match the last one that did. */
  const shownRun = shown?.run ?? null;
  useEffect(() => {
    if (shownRun === null) return;
    const timer = setTimeout(() => setSettled(shownRun), REVEAL_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [shownRun]);

  const isSettled = shown !== null && settled === shown.run;

  return (
    <svg
      viewBox={VIEW_BOX}
      className={className}
      role="presentation"
      aria-hidden="true"
      style={
        {
          "--reveal-fade": `${REVEAL_FADE_MS}ms`,
          "--reveal-noise": `${NOISE_LIFE_MS}ms`,
          "--reveal-clear": `${CLEAR_FADE_MS}ms`,
        } as React.CSSProperties
      }
    >
      {/* THE PANEL AT REST: one faint dot per cell. It is under everything, so
          a lit cell simply covers its own dot. */}
      <g className="pixl-reveal-dots">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => (
          <circle
            key={index}
            cx={(index % GRID_SIZE) * CELL_UNITS + CELL_UNITS / 2}
            cy={Math.floor(index / GRID_SIZE) * CELL_UNITS + CELL_UNITS / 2}
            r={DOT_RADIUS}
          />
        ))}
      </g>

      {leaving !== null && (
        <Scatter
          key={`out-${leaving.run}`}
          shown={leaving}
          cellStyle={cellStyle}
          direction="out"
        />
      )}

      {shown !== null &&
        (isSettled ? (
          <Settled cells={shown.cells} cellStyle={cellStyle} />
        ) : (
          <Scatter
            key={`in-${shown.run}`}
            shown={shown}
            cellStyle={cellStyle}
            direction="in"
          />
        ))}
    </svg>
  );
}

/** The finished picture: the merged walk, exactly as every other surface draws it. */
function Settled({ cells, cellStyle }: { cells: Cells; cellStyle: CellStyle }) {
  return (
    <g>
      {layoutCells(cells, cellStyle).map(({ key, color, shape }) =>
        shape.kind === "circle" ? (
          <circle
            key={key}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={color}
          />
        ) : (
          <rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={color}
          />
        ),
      )}
    </g>
  );
}

/**
 * The scatter, in either direction: unmerged cells on shuffled delays, with
 * noise over the icon's own bounds.
 *
 * ONE COMPONENT FOR BOTH WAYS, because they are one effect. Arriving and
 * leaving used to be different KINDS of event — the icon condensed cell by cell
 * and then vanished as a block — and a dot-matrix panel does not clear that
 * way. Out reuses the same hashed order on a shorter clock, so a cell that was
 * late to light is late to go out.
 */
function Scatter({
  shown,
  cellStyle,
  direction,
}: {
  shown: { cells: Cells; seed: string; run: number };
  cellStyle: CellStyle;
  direction: "in" | "out";
}) {
  const out = direction === "out";
  const window_ = out ? CLEAR_WINDOW_MS : REVEAL_WINDOW_MS;
  const { filled, top, left, bottom, right } = filledCells(shown.cells);

  /* Noise scales with the drawing, so a sparse icon does not disappear under
     its own static and a dense one still crackles. */
  const noiseCount = out
    ? Math.min(10, Math.max(3, Math.round(filled.length * 0.2)))
    : Math.min(20, Math.max(6, Math.round(filled.length * 0.45)));
  const width = right - left + 1;
  const height = bottom - top + 1;

  return (
    /* The direction is on the GROUP rather than on every cell: one attribute
       for the stylesheet to hang the reverse keyframes off, and one hook for a
       test to read a single layer while both are on screen. */
    <g data-reveal={direction}>
      {/* UNDER the art, so the true cells stay crisp however busy it gets. */}
      {width > 0 &&
        height > 0 &&
        Array.from({ length: noiseCount }, (_, i) => {
          const col =
            left + Math.floor(hashed(shown.seed, 900 + i * 3) * width);
          const row =
            top + Math.floor(hashed(shown.seed, 901 + i * 3) * height);
          /* TRIANGULAR, so density PEAKS rather than running flat. Averaging
             two uniforms peaks at the middle; mapped onto 30%..100% of the
             window that lands the crest at about two thirds through, which is
             where the spec wants the static at its loudest. */
          const t =
            (hashed(shown.seed, 902 + i * 3) +
              hashed(shown.seed, 903 + i * 3)) /
            2;
          const shape = cellNode(row, col, cellStyle, 1);
          const delay = window_ * (0.3 + 0.7 * t);
          return shape.kind === "circle" ? (
            <circle
              key={`noise-${i}`}
              className="pixl-reveal-noise"
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              style={{ animationDelay: `${Math.round(delay)}ms` }}
            />
          ) : (
            <rect
              key={`noise-${i}`}
              className="pixl-reveal-noise"
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              style={{ animationDelay: `${Math.round(delay)}ms` }}
            />
          );
        })}

      {filled.map(({ row, col, color }) => {
        const shape = cellNode(row, col, cellStyle, 1);
        const delay = Math.round(
          hashed(shown.seed, toIndex(row, col)) * window_,
        );
        const style = { animationDelay: `${delay}ms` } as React.CSSProperties;
        return shape.kind === "circle" ? (
          <circle
            key={`${row}-${col}`}
            className="pixl-reveal-cell"
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={color}
            style={style}
          />
        ) : (
          <rect
            key={`${row}-${col}`}
            className="pixl-reveal-cell"
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={color}
            style={style}
          />
        );
      })}
    </g>
  );
}
