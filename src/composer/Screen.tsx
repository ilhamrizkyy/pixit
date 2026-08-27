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

  /* Read the token rather than restating it: --screen is composer-scoped, so it
     has to be read from an element INSIDE the scope, not off the document. One
     source of truth for the screen's colour, as DESIGN.md §7 requires — a hex
     copied into the mesh would drift the first time the token moved, and it
     just did. */
  useEffect(() => {
    if (ref.current === null) return;
    setScreenColor(getComputedStyle(ref.current).getPropertyValue("--screen").trim());
  }, []);

  return (
    <div ref={ref} className="toy-screen aspect-square w-full">
      {webgl && screenColor !== "" && (
        <span className="toy-well-canvas" aria-hidden="true">
          <ScreenMesh color={screenColor} />
        </span>
      )}
      <div className="toy-well-floor">
        <Board />
      </div>
    </div>
  );
}
