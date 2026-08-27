"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useWebGL } from "@/lib/useWebGL";
import { useComposer } from "./ComposerProvider";
import { Callout } from "./Callout";

/* Kept out of the initial bundle: three.js is large, and the gallery — which is
   most of the traffic — never renders a knob. */
const KnobMesh = dynamic(() => import("./KnobMesh"), { ssr: false });

/**
 * A physical knob (DESIGN.md §6, INTERACTION.md §4).
 *
 * Turning is RELATIVE, not absolute: grabbing the knob anywhere and turning
 * moves the value by how far you turned, rather than snapping the value to
 * wherever you happened to grab. An absolute mapping makes every grab jump the
 * colour before you have turned at all, which is not how a knob behaves.
 *
 * The dial's rotation is DERIVED from the value rather than tracked separately,
 * so the knob stays truthful when the value moves from somewhere else — the hex
 * field, a preset, the eyedropper.
 *
 * Only the dial turns. The coloured ring and the housing shadow stay put; that
 * is what reads as a dial seated in a body rather than a spinning sticker. The
 * ring is a true annulus with clear air between it and the dial, so it reads as
 * a scale the knob turns against rather than a painted edge of the knob.
 *
 * The dial itself is drawn in WebGL where it is available and in CSS where it
 * is not. THE CONTROL IS THE SAME EITHER WAY: this element carries the role,
 * the value, the keys and the pointer handling, and the 3D canvas is an inert
 * layer underneath it. Losing WebGL costs appearance and nothing else.
 */

type KnobProps = {
  label: string;
  value: number;
  /** Exclusive upper bound when wrapping (hue), inclusive when not. */
  max: number;
  /** Hue wraps through 360; lightness stops at its ends. */
  wrap: boolean;
  /** CSS background for the static ring that previews what this knob controls. */
  ring: string;
  valueText: string;
  /** Which way its annotation runs. */
  side: "left" | "right";
  onChange: (value: number) => void;
};

/** A full turn covers the whole range — on BOTH knobs, by choice. */
const TURN = 360;

export function Knob({
  label,
  value,
  max,
  wrap,
  ring,
  valueText,
  onChange,
  side,
}: KnobProps) {
  // Handler-only state. Kept in refs because a re-render per pointer sample to
  // remember an angle would be a re-render that changes nothing on screen.
  const webgl = useWebGL();
  const annotations = useComposer((s) => s.annotations);
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
      className="toy-knob size-16 cursor-grab touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:cursor-grabbing sm:size-20"
    >
      {/* The ring is its own element, not the housing's background: it is masked
          into an annulus, and a mask on the housing would clip the seating
          shadow with it. */}
      <span aria-hidden="true" className="toy-knob-ring" style={{ background: ring }} />

      {webgl ? (
        <span aria-hidden="true" className="absolute inset-[6%]">
          <KnobMesh angle={(value / max) * Math.PI * 2} />
        </span>
      ) : (
        <div
          className="toy-knob-dial"
          style={{ transform: `rotate(${(value / max) * 360}deg)` }}
        >
          <span className="toy-knob-cap" aria-hidden="true" />
          <span className="toy-knob-mark" aria-hidden="true" />
        </div>
      )}

      {annotations && <Callout side={side}>{label}</Callout>}
    </div>
  );
}
