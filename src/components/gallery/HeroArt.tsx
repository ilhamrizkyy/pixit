"use client";

import { useSyncExternalStore } from "react";
import { IconPreview } from "@/components/IconPreview";
import { GRID_SIZE } from "@/engine/constants";
import { getIcon } from "@/registry";
import type { Cells } from "@/engine/types";
import { INTRO } from "./introTimeline";

/**
 * THE HERO'S ART: the set's own icons, composed the way phosphoricons.com
 * composes its hero (rebuilt 2026-09-15, by request).
 *
 * WHAT PHOSPHOR ACTUALLY DOES, measured rather than remembered: two big
 * objects that BLEED OFF THE SCREEN (an iPad cropped by the top edge, a synth
 * cropped by the bottom right), a few small pieces scattered between them, and
 * every piece is `inspectable`. Hover one and its colour fades out to reveal an
 * X-RAY: a line drawing with callouts naming the icons it is built from, under
 * `cursor: cell`.
 *
 * PIXIT'S X-RAY SHOWS ITS OWN MECHANISM. Phosphor's names the glyphs inside an
 * illustration. Ours reveals the thing every Pixit icon is: an 11 by 11 lattice
 * with some cells lit. The neon drawing goes out, the grid it was drawn on
 * comes up, and a tag names the icon, the same id you would search for below.
 *
 * NOTHING IS ROTATED. Phosphor tilts its paperclips; a pixel icon turned off the
 * axis is resampled, and an antialiased edge is the one thing this set refuses.
 *
 * SIZES ARE WHOLE CELLS, AND THE BIG PIECES SIT ON THE BACKGROUND GRID. The
 * hero's grid is 24px cells in 11 by 11 blocks, so a 264px icon (24px a cell)
 * or a 528px one (48px) lands its cells on the grid lines, and its x-ray
 * lattice is the background's own lattice, lit. Positions snap to the 24px
 * pitch in CSS for the same reason.
 *
 * `aria-hidden` throughout. Every one of these is in the gallery below, named,
 * focusable and copyable.
 */

type Neon = "cyan" | "yellow" | "orange" | "green";

/** The cabinet's neon, and only these: no magenta (see the hero's CSS). */
const NEON: readonly Neon[] = ["cyan", "yellow", "orange", "green"];

type Slot = {
  /** Left and top edge, as a percentage of the hero, snapped to the grid in CSS. */
  x: number;
  y: number;
  /** Pixels per cell. The drawn size is eleven of these. */
  cell: number;
  /** Where the x-ray tag sits: whichever corner stays on screen. */
  tag: "top" | "bottom";
  /** Small pieces idle; the big bleeding ones are objects, and stay put. */
  bob?: boolean;
};

/**
 * THE COMPOSITION IS FIXED; WHAT FILLS IT IS NOT (2026-09-15, by request). The
 * six seats are Phosphor's arrangement and they stay put, because the layout is
 * what was measured: clear of the type, two pieces bleeding off the edges. Which
 * icon sits in each seat, and in which neon, is dealt fresh on every load.
 */
const SLOTS: readonly Slot[] = [
  { x: 60, y: -9, cell: 24, tag: "bottom" },
  { x: 86, y: 10, cell: 8, tag: "bottom", bob: true },
  { x: 92, y: 33, cell: 8, tag: "bottom", bob: true },
  { x: 62, y: 42, cell: 12, tag: "bottom", bob: true },
  { x: 52, y: 72, cell: 12, tag: "top", bob: true },
  { x: 72, y: 56, cell: 48, tag: "top" },
];

/** The two seats that bleed off the screen, which must not share a colour. */
const BIG = [0, 5] as const;

/**
 * WHO MAY BE DEALT. Not the whole set: a seat is up to 528px, and a glyph made
 * of one thin line (dots, minus, a chevron, the text-like list) turns into a
 * stray stroke at that size rather than a picture. These are the icons that
 * are OBJECTS, with a silhouette that holds at any scale.
 */
const POOL = [
  "coin", "ghost", "trophy", "floppy-disk", "heart", "star", "robot", "target",
  "diamond", "cube", "key", "shield", "sparkle", "camera", "music", "headphones",
  "mic", "image", "video", "monitor", "smartphone", "keyboard", "database",
  "server", "terminal", "bug", "calendar", "clock", "globe", "zap", "bulb",
  "home", "lock", "bell", "mail", "folder", "battery", "sun", "moon", "cloud",
  "archive", "shopping-bag", "wallet", "chart-pie", "power", "settings",
] as const;

type Deal = readonly { id: string; neon: Neon }[];

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One deal per page load, cached, because `useSyncExternalStore` requires the
 * same snapshot back on every read. Icons never repeat. Each neon appears at
 * most twice (two of each, shuffled, six taken), and the two big pieces are
 * swapped apart if they came out the same.
 */
let deal: Deal | null = null;

function getDeal(): Deal {
  if (deal === null) {
    const ids = shuffled(POOL.filter((id) => getIcon(id) !== undefined));
    const colours = shuffled([...NEON, ...NEON]).slice(0, SLOTS.length);
    const [a, b] = BIG;
    if (colours[a] === colours[b]) {
      const swap = colours.findIndex((c, i) => i !== a && i !== b && c !== colours[a]);
      if (swap !== -1) [colours[b], colours[swap]] = [colours[swap], colours[b]];
    }
    deal = SLOTS.map((_, i) => ({ id: ids[i], neon: colours[i] }));
  }
  return deal;
}

const noSubscription = () => () => {};

/**
 * Remapped to `currentColor`, so the art inherits its neon and no hex reaches a
 * component. A DISPLAY, like the gallery's: the stored cells are untouched.
 */
function inkCells(id: string): Cells | null {
  const icon = getIcon(id);
  if (icon === undefined) return null;
  return icon.cells.map((cell) => (cell === null ? null : "currentColor"));
}

/** Every grid line of the 44-unit canvas, as one path. */
const LATTICE = Array.from({ length: GRID_SIZE + 1 }, (_, i) => {
  const at = i * 4;
  return `M${at} 0V44M0 ${at}H44`;
}).join("");

/** The x-ray: the canvas's lattice, with the lit cells drawn as hollow squares. */
function XRay({ cells, size }: { cells: Cells; size: number }) {
  return (
    <svg
      className="pixl-sprite-xray"
      viewBox="0 0 44 44"
      width={size}
      height={size}
      fill="none"
    >
      <path className="pixl-sprite-lattice" d={LATTICE} />
      {cells.map((cell, index) =>
        cell === null ? null : (
          <rect
            key={index}
            className="pixl-sprite-cell"
            x={(index % GRID_SIZE) * 4}
            y={Math.floor(index / GRID_SIZE) * 4}
            width={4}
            height={4}
          />
        ),
      )}
    </svg>
  );
}

/**
 * DEALT IN THE BROWSER, NOT ON THE SERVER. A random pick during render would
 * give the server and the client two different pictures, which is a hydration
 * error. The server snapshot is "nothing yet", so the seats are empty in the
 * HTML and the deal arrives on hydration, where each sprite rasters in row by
 * row. That entrance is what makes a sprite arriving a moment late read as the
 * screen drawing it rather than as a flash. They are `aria-hidden` decoration,
 * so nothing is lost without scripts.
 */
export function HeroArt() {
  const dealt = useSyncExternalStore(noSubscription, getDeal, () => null);

  return (
    <div aria-hidden="true" className="pixl-hero-art">
      {dealt?.map(({ id, neon }, index) => {
        const cells = inkCells(id);
        const { x, y, cell, tag, bob } = SLOTS[index];
        // A decoration degrades to absence rather than to a crash.
        if (cells === null) return null;
        const size = cell * GRID_SIZE;
        return (
          <span
            key={`${index}-${id}`}
            className="pixl-hero-sprite"
            data-neon={neon}
            data-tag={tag}
            data-bob={bob ? "" : undefined}
            style={
              {
                "--x": `${x}%`,
                "--y": `${y}%`,
                "--size": `${size}px`,
                "--i": index,
                "--at": `${INTRO.sprites + index * INTRO.spriteStagger}ms`,
              } as React.CSSProperties
            }
          >
            <span className="pixl-sprite-art">
              <IconPreview cells={cells} size={size} />
            </span>
            <XRay cells={cells} size={size} />
            <span className="pixl-sprite-tag">{id}</span>
          </span>
        );
      })}
    </div>
  );
}
