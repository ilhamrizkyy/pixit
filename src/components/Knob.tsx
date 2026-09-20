"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

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
 * THE HOUSING DOES NOT TURN, whatever the face does with the value. That is
 * what reads as a dial seated in a body rather than a spinning sticker, and it
 * is why the printed scale is a sibling on the panel rather than a ring on the
 * part: a scale you turn along with the knob reports nothing.
 *
 * THE WEBGL DIAL IS GONE (2026-09-19), with the `mesh` prop and `KnobMesh`.
 * It was a lathed surface of revolution, and the composer's knobs are knurled
 * instrument controls now — a lathe cannot cut knurling, so the mesh could not
 * describe the object the toy is built from any more. The gallery never asked
 * for it (three.js is ~600KB on the public route), so with the composer moved
 * across it had no consumer at all.
 *
 * WHAT THAT BUYS, beyond the deletion: DESIGN.md §6 spends several hundred
 * words on the two builds having to describe ONE object, and lists three
 * separate times they silently drifted — gloss against matte, a seam the mesh
 * did not have, and the two drawing the dial at different sizes. There is one
 * build now, so there is nothing left to keep in step. The `face` prop below is
 * how a surface varies the look without forking the gesture.
 */

type KnobProps = {
  label: string;
  value: number;
  /** Exclusive upper bound when wrapping (hue), inclusive when not. */
  max: number;
  /** Hue wraps through 360; lightness and saturation stop at their ends. */
  wrap: boolean;
  valueText: string;
  onChange: (value: number) => void;
  /** Size and placement. The knob's own class carries the housing. */
  className?: string;
  /**
   * The knob's own body, when the caller draws one.
   *
   * THE GESTURE IS THE COMPONENT; THE FACE IS NOT. Everything that makes this a
   * knob — relative turning, the wrap/clamp, the roles, the keys, the pointer
   * capture — is here and is the single copy of it (the gallery and the
   * composer have drifted on exactly this before). What a dial LOOKS like is
   * the surface's business: the composer's are knurled instrument controls with
   * printed scale rings, and nothing about that belongs in a shared gesture.
   *
   * REQUIRED, since 2026-09-19. There was a default dial here and it lost its
   * last consumer when the composer's knobs became knurled: a default nobody
   * renders is dead code that reads as a supported option.
   */
  face: ReactNode;
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
  valueText,
  onChange,
  className = "size-16 sm:size-20",
  face,
  annotation = null,
}: KnobProps) {
  // Handler-only state. Kept in refs because a re-render per pointer sample to
  // remember an angle would be a re-render that changes nothing on screen.
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
      className={`cursor-grab touch-none select-none active:cursor-grabbing ${className}`}
    >
      {face}

      {annotation}
    </div>
  );
}
