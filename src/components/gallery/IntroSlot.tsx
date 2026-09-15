import type { ReactNode } from "react";

/**
 * A PIECE OF THE HERO THAT ARRIVES DURING THE BOOT (2026-09-15).
 *
 * It wipes in, in hard columns, at its `resolve` time. That is all it does now.
 * It also drew a skeleton block over its content for a pass: a dithered
 * rectangle that filled column by column under a scan bar and stamped OK. The
 * owner asked for the boot without them, and they were a layer over the content
 * rather than part of it, so they came off without touching anything else.
 *
 * THE CONTENT IS ALWAYS IN THE DOM AND ALWAYS THE DEFAULT. The hiding rule
 * applies only under `html[data-intro="play"]`, so a screen reader, a crawler
 * and a visitor without scripts all read the finished hero from the first byte.
 */

type IntroSlotProps = {
  /** When the content wipes in, in ms from the start of the boot. */
  resolve: number;
  className?: string;
  children: ReactNode;
};

export function IntroSlot({ resolve, className, children }: IntroSlotProps) {
  return (
    <div
      className={className ? `pixl-slot ${className}` : "pixl-slot"}
      style={{ "--resolve": `${resolve}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
