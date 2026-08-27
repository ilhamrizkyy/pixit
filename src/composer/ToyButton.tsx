"use client";

import type { ReactNode } from "react";
import { Callout } from "./Callout";

/**
 * One of the eight tools: a soft light dome seated in a dark recessed well
 * (DESIGN.md §6). The well is a separate element from the cap so the cap can
 * sink into it on press without the well moving with it.
 */
export function ToyButton({
  label,
  children,
  pressed,
  disabled,
  onClick,
  title,
  caption,
  calloutSide,
}: {
  label: string;
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  /** Shown while annotations are on. */
  caption?: string;
  /** Which way the leader line runs. Omitted in the compact strip, where there
      is no room either side and the caption sits under the cap instead. */
  calloutSide?: "left" | "right";
}) {
  return (
    <span className="toy-well relative block size-11 shrink-0 sm:size-12">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        title={title ?? label}
        className="toy-button font-data text-[9px] leading-none tracking-tight disabled:cursor-not-allowed"
      >
        {children}
      </button>
      {caption &&
        (calloutSide ? (
          <Callout side={calloutSide}>{caption}</Callout>
        ) : (
          /* No room either side in the compact strip, so it goes under the cap.
             Still absolute, so nothing reflows. */
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 text-center font-data text-[9px] leading-tight whitespace-nowrap text-white/80"
          >
            {caption}
          </span>
        ))}
    </span>
  );
}
