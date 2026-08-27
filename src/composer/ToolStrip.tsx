"use client";

import { useCallback, useRef, useState } from "react";
import { ToolGlyph } from "./ToolGlyph";
import { ToyButton } from "./ToyButton";
import { useTools } from "./ToolRail";
import { useComposer } from "./ComposerProvider";

/**
 * The eight tools on a narrow screen: one strip under the board showing FOUR at
 * a time, paged by dragging or by the arrows at either end.
 *
 * Stacking all eight above and below the board is what a column layout wants,
 * but on a phone it eats the height the board needs — and the board is the
 * thing you came for. Four at a time keeps every tool one gesture away while
 * costing a single row.
 *
 * It is a real scroller, not a transform: dragging is native, momentum is
 * native, and it stays operable if scripting is having a bad day. Scroll
 * snapping is what makes a drag land on a button boundary rather than halfway
 * through one.
 */
export function ToolStrip() {
  const tools = useTools();
  const annotations = useComposer((s) => s.annotations);
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (el === null) return;
    setAtStart(el.scrollLeft <= 1);
    // A pixel of slack: fractional widths mean scrollLeft rarely lands exactly.
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
  }, []);

  const page = useCallback((direction: 1 | -1) => {
    const el = scroller.current;
    if (el === null) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * el.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="flex w-full items-center gap-1 sm:hidden">
      <Arrow direction="left" disabled={atStart} onClick={() => page(-1)} />

      <div
        ref={scroller}
        onScroll={sync}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto"
      >
        {tools.map((tool) => (
          <div
            key={tool.name}
            /* Exactly four across, gaps included, so a page lands cleanly. */
            className="shrink-0 basis-[calc((100%-2.25rem)/4)] snap-start"
          >
            <ToyButton
              label={tool.label}
              title={tool.title}
              pressed={tool.pressed}
              disabled={tool.disabled}
              onClick={tool.onClick}
              caption={annotations ? tool.caption : undefined}
            >
              <ToolGlyph name={tool.name} />
            </ToyButton>
          </div>
        ))}
      </div>

      <Arrow direction="right" disabled={atEnd} onClick={() => page(1)} />
    </div>
  );
}

/**
 * Paging control. Deliberately NOT a toy button — it moves the shelf, it is not
 * a tool, and dressing it as one would put nine buttons on a toy that has
 * eight.
 */
function Arrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous tools" : "Next tools"}
      className="flex size-7 shrink-0 items-center justify-center rounded-sm text-white/70 transition-opacity disabled:opacity-25"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
      </svg>
    </button>
  );
}
