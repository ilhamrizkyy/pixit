"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useWebGL } from "@/lib/useWebGL";

/* Kept out of the initial bundle: three.js is large, and the route that shows
   the most knobs — the gallery — deliberately never asks for the mesh. */
const KnobMesh = dynamic(() => import("@/composer/KnobMesh"), { ssr: false });

/**
 * A physical knob (DESIGN.md §6, INTERACTION.md §4).
 *
 * SHARED, as of 2026-08-29. It was the composer's, then the gallery's body
 * grew a colour setter built out of the same control, and two copies of a
 * pointer-capture gesture is one copy that drifts. So this is presentational
 * and prop-driven: it reads no store and knows nothing about paint or display
 * colour. `src/composer/Knob.tsx` is the thin wrapper that adds the composer's
 * annotation callout.
 *
 * Turning is RELATIVE, not absolute: grabbing the knob anywhere and turning
 * moves the value by how far you turned, rather than snapping the value to
 * wherever you happened to grab. An absolute mapping makes every grab jump the
 * colour before you have turned at all, which is not how a knob behaves.
 *
 * The dial's rotation is DERIVED from the value rather than tracked separately,
 * so the knob stays truthful when the value moves from somewhere else — a hex
 * field, the eyedropper, a theme change.
 *
 * Only the dial turns. The coloured ring and the housing shadow stay put; that
 * is what reads as a dial seated in a body rather than a spinning sticker. The
 * ring is a true annulus with clear air between it and the dial, so it reads as
 * a scale the knob turns against rather than a painted edge of the knob.
 *
 * The dial itself is drawn in WebGL where it is available and in CSS where it
 * is not. THE CONTROL IS THE SAME EITHER WAY: this element carries the role,
 * the value, the keys and the pointer handling, and the 3D canvas is an inert
 * layer underneath it. Losing WebGL costs appearance and nothing else — which
 * is also what makes `mesh={false}` a legitimate choice rather than a
 * degradation.
 */

type KnobProps = {
  label: string;
  value: number;
  /** Exclusive upper bound when wrapping (hue), inclusive when not. */
  max: number;
  /** Hue wraps through 360; lightness and saturation stop at their ends. */
  wrap: boolean;
  /** CSS background for the static ring that previews what this knob controls. */
  ring: string;
  valueText: string;
  onChange: (value: number) => void;
  /** Size and placement. The knob's own class carries the housing. */
  className?: string;
  /**
   * Draw the dial in R3F. OFF on the gallery: three.js is ~600KB and the
   * gallery is the public route almost all traffic lands on. DESIGN.md §6
   * already requires the two builds to describe ONE object, so the CSS dial is
   * the same knob rather than a fallback — and the proportions are shared by
   * name for exactly this reason.
   */
  mesh?: boolean;
  /** The composer's callout. Nothing else has one. */
  annotation?: ReactNode;
};

/** A full turn covers the whole range — on EVERY knob, by choice. */
const TURN = 360;

export function Knob({
  label,
  value,
  max,
  wrap,
  ring,
  valueText,
  onChange,
  className = "size-16 sm:size-20",
  mesh = true,
  annotation = null,
}: KnobProps) {
  // Handler-only state. Kept in refs because a re-render per pointer sample to
  // remember an angle would be a re-render that changes nothing on screen.
  const webgl = useWebGL();
  const [grabbed, setGrabbed] = useState(false);
  const center = useRef({ x: 0, y: 0 });
  const lastAngle = useRef(0);
  const carry = useRef(0);

  const angleFrom = (event: ReactPointerEvent<HTMLDivElement>) =>
    (Math.atan2(event.clientY - center.current.y, event.clientX - center.current.x) * 180) /
    Math.PI;

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    lastAngle.current =
      (Math.atan2(event.clientY - center.current.y, event.clientX - center.current.x) * 180) /
      Math.PI;
    carry.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    setGrabbed(true);
  }, []);

  /* Release AND cancel: a pointercancel that did not clear this would leave the
     knob looking held for the rest of the session. */
  const release = useCallback(() => setGrabbed(false), []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      // Normalise into (-180, 180]. Without this, dragging across the knob's
      // 180-degree seam registers as a 359-degree lurch the other way.
      let delta = angleFrom(event) - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle.current += delta;

      // Sub-unit motion is banked rather than discarded, so a slow turn still
      // moves the value instead of rounding to nothing every frame.
      const raw = carry.current + (delta / TURN) * max;
      const steps = Math.trunc(raw);
      carry.current = raw - steps;
      if (steps === 0) return;

      const next = value + steps;
      onChange(wrap ? ((next % max) + max) % max : Math.min(max, Math.max(0, next)));
    },
    [max, onChange, value, wrap],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 10 : 1;
      const move = (delta: number) => {
        event.preventDefault();
        const next = value + delta;
        onChange(wrap ? ((next % max) + max) % max : Math.min(max, Math.max(0, next)));
      };
      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight": return move(step);
        case "ArrowDown":
        case "ArrowLeft": return move(-step);
        case "Home": event.preventDefault(); return onChange(0);
        case "End": event.preventDefault(); return onChange(wrap ? max - 1 : max);
        default:
      }
    },
    [max, onChange, value, wrap],
  );

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      data-grabbed={grabbed}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={onKeyDown}
      className={`toy-knob cursor-grab touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--toy-ink)] active:cursor-grabbing ${className}`}
    >
      {/* The ring is its own element, not the housing's background: it is masked
          into an annulus, and a mask on the housing would clip the seating
          shadow with it. */}
      <span aria-hidden="true" className="toy-knob-ring" style={{ background: ring }} />

      {/* The canvas carries THE SAME INSET as `.toy-knob-dial`, and it has to:
          the camera is framed so the rim fills the canvas, which makes the
          canvas box the dial's size. They were 6% and 10% for a while, one of
          the three ways the two builds had silently drifted. */}
      {mesh && webgl ? (
        <span aria-hidden="true" className="absolute inset-[11%]">
          <KnobMesh angle={(value / max) * Math.PI * 2} />
        </span>
      ) : (
        /* THE DIAL DOES NOT TURN — only the pip does. The rotation used to sit
           on the dial itself, which carried the dome's baked lighting round
           with it: the crown highlight swung to the side and then underneath,
           so the light appeared to orbit the room. The mesh build never had
           this, being a real surface of revolution, which is exactly why the
           two had to be brought into line rather than left to differ. */
        <>
          <div className="toy-knob-dial" aria-hidden="true">
            <span className="toy-knob-cap" />
          </div>
          <div
            aria-hidden="true"
            className="toy-knob-spin"
            style={{ transform: `rotate(${(value / max) * 360}deg)` }}
          >
            <span className="toy-knob-mark" />
          </div>
        </>
      )}

      {annotation}
    </div>
  );
}
