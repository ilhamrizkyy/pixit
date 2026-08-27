"use client";

/**
 * A leader line running out to a named card.
 *
 * Annotations sit OUTSIDE the toy rather than under each control. On the frame
 * they had to be small and low-contrast to survive the blue, which is the wrong
 * trade for text whose entire job is to be read; out here they land on the page
 * and can simply be legible. It also keeps the toy's own surface uncluttered —
 * the legend is a layer over the object, not a change to it.
 *
 * Absolutely positioned and `aria-hidden`: turning the legend on must not move
 * a control out from under the pointer, and every control already carries this
 * same text as its accessible name.
 */
export function Callout({
  side,
  children,
}: {
  side: "left" | "right";
  children: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 z-20 flex -translate-y-1/2 items-center ${
        // Reversed on the left so the LINE stays against the control and the
        // card sits beyond it, mirroring the right-hand side exactly.
        side === "left" ? "right-full flex-row-reverse" : "left-full"
      }`}
    >
      <span className="h-px w-7 shrink-0 bg-text-faint" />
      <span className="rounded-sm border border-border bg-bg px-1.5 py-1 font-data text-[10px] leading-none whitespace-nowrap text-text shadow-[var(--shadow-raised)]">
        {children}
      </span>
    </span>
  );
}
