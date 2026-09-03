"use client";

import { Knob as BaseKnob } from "@/components/Knob";
import { useComposer } from "./ComposerProvider";
import { Callout } from "./Callout";

/**
 * The composer's knob: the shared control plus this route's annotation callout.
 *
 * The gesture, the roles, the keys and both dial builds live in
 * `@/components/Knob` — the gallery's colour setter is built out of the same
 * three knobs, and a pointer-capture gesture maintained in two places is one
 * that drifts. What is composer-specific is exactly one thing: the help mode's
 * callout, which reads composer state and points at the knob from the side the
 * knob sits on.
 */

type KnobProps = {
  label: string;
  value: number;
  max: number;
  wrap: boolean;
  ring: string;
  valueText: string;
  /** Which way its annotation runs. */
  side: "left" | "right";
  onChange: (value: number) => void;
};

export function Knob({ label, side, ...rest }: KnobProps) {
  const annotations = useComposer((s) => s.annotations);

  return (
    <BaseKnob
      label={label}
      {...rest}
      className="size-16 sm:size-20"
      annotation={annotations ? <Callout side={side}>{label}</Callout> : null}
    />
  );
}
