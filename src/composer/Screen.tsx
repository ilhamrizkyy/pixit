"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useWebGL } from "@/lib/useWebGL";
import { Board } from "./Board";

/* Kept out of the initial bundle alongside the knobs: three.js is large, and
   the gallery — which is most of the traffic — never renders the toy. */
const ScreenMesh = dynamic(() => import("./ScreenMesh"), { ssr: false });

/**
 * The screen: a 3D well with the drawing grid laid on its floor.
 *
 * THE LAYERING IS THE ARCHITECTURE. The canvas underneath renders the recess
 * and nothing else; the grid above it is the same DOM/SVG board it has always
 * been, and it keeps every pointer event, every key, and the entire
 * accessibility tree (CLAUDE.md §5, INTERACTION.md §8). Losing WebGL costs the
 * walls their shading and costs the drawing nothing — which is the only
 * arrangement in which shipping 3D here is safe at all.
 *
 * The grid is inset by exactly the wall width, whether or not the canvas
 * renders, so the layout is identical in both cases and the fallback is not a
 * second layout to keep in step.
 */
export function Screen() {
  const webgl = useWebGL();
  const ref = useRef<HTMLDivElement>(null);
  const [screenColor, setScreenColor] = useState("");

  /* Read the token rather than restating it. One source of truth for the
     screen's colour, as DESIGN.md §7 requires — a hex copied into the mesh
     would drift the first time the token moved, and it has.

     `--crt-glass` since the scope reskin (2026-09-19). It was `--lcd`, the
     sage segment panel the gallery's mini screen is also made of, and the two
     surfaces stopped being one part the moment this became a CRT: a cathode
     tube's face is near-black and its art GLOWS, where a segment panel is pale
     and its art is dark. The mesh renders the well the tube sits in, so it
     takes the glass's own colour and the walls stay in its family. */
  useEffect(() => {
    if (ref.current === null) return;
    setScreenColor(getComputedStyle(ref.current).getPropertyValue("--crt-glass").trim());
  }, []);

  return (
    <div ref={ref} className="scope-crt aspect-square w-full">
      {webgl && screenColor !== "" && (
        <span className="toy-well-canvas" aria-hidden="true">
          <ScreenMesh color={screenColor} />
        </span>
      )}
      <div className="toy-well-floor">
        <Board />
      </div>

      {/* THE GLASS, over everything and deaf to the pointer. Three things in
          paint order: the vignette that darkens the tube toward its corners,
          the scanlines, and one soft reflection running off the top-left —
          which is where the key is on every other part of this object.

          `pointer-events: none` in the stylesheet is load-bearing, not tidy:
          this covers the whole drawing surface, and without it the board would
          stop taking a single click. */}
      <span aria-hidden="true" className="scope-crt-glass" />
    </div>
  );
}
