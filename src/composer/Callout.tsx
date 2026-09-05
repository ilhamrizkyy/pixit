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
 * a control out from under the pointer, and every control's accessible name
 * CONTAINS the caption it is labelled with — which is what WCAG 2.5.3 asks, so
 * a speech-input user can say the word they can see.
 *
 * That claim used to read "carries this same text", and it was false in exactly
 * one place: the eyedropper's caption is `Pick` and its name was `Eyedropper`,
 * with no overlap at all. Corrected on both sides 2026-09-04 — the name is now
 * `Pick color (eyedropper)`. The comment is recorded here rather than deleted
 * because a docblock asserting a rule is how the one violation stayed invisible.
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
