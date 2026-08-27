"use client";

import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GRID_SIZE } from "@/engine/constants";
import { useComposer, useComposerStore } from "./ComposerProvider";

/**
 * Slide to clear (INTERACTION.md §3).
 *
 * Dragging the handle left to right erases the drawing progressively BY COLUMN,
 * following the handle. Release snaps the handle back; whatever was wiped stays
 * wiped, as ONE undo step.
 *
 * The store owns the furthest column reached, so dragging back leftward does
 * not restore paint — a real Etch A Sketch does not un-erase either. This
 * component therefore reports the column under the handle and lets the store
 * decide what that means, rather than treating its own position as the truth.
 */

const REST = -1;

export function SlideToClear() {
  const store = useComposerStore();
  const wiping = useComposer((s) => s.wipe !== null);
  const [handle, setHandle] = useState(REST);
  /* Tracked separately from the store's wipe. The handle must follow the
     pointer even when there is nothing to erase — a control that refuses to
     move reads as broken, not as "the board is already empty". */
  const [dragging, setDragging] = useState(false);

  const columnAt = useCallback((event: ReactPointerEvent<HTMLDivElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return REST;
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(ratio * GRID_SIZE)));
  }, []);

  const finish = useCallback(() => {
    setDragging(false);
    setHandle(REST);
    store.getState().endWipe();
  }, [store]);

  return (
    <div
        role="slider"
        tabIndex={0}
        aria-label="Slide to clear the drawing"
        aria-valuemin={0}
        aria-valuemax={GRID_SIZE}
        aria-valuenow={handle + 1}
        aria-valuetext={
          handle < 0 ? "At rest" : `${handle + 1} of ${GRID_SIZE} columns erased`
        }
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          store.getState().beginWipe();
          const column = columnAt(event);
          setHandle(column);
          store.getState().wipeTo(column);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          const column = columnAt(event);
          setHandle(column);
          store.getState().wipeTo(column);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            store.getState().beginWipe();
            const column = Math.min(GRID_SIZE - 1, handle + 1);
            setHandle(column);
            store.getState().wipeTo(column);
            // A full sweep is unambiguously finished, so commit it rather than
            // leaving the entry hanging on a blur the owner may never trigger.
            if (column === GRID_SIZE - 1) finish();
          } else if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            finish();
          }
        }}
        /* Committing on blur is what makes the keyboard path a single undo
           entry: each arrow press extends the same wipe, and leaving the
           control ends the gesture, exactly as lifting a finger does. */
        onBlur={() => wiping && finish()}
        className="toy-groove w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ touchAction: "none" }}
      >
      {/* The instruction rides in the groove rather than sitting under it as a
          caption — it is the only thing the groove has to say, and a line of
          text below cost the board height it could use. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center font-data text-[10px] tracking-widest text-white/65 uppercase"
      >
        Drag to clear
      </span>
      <span
        aria-hidden="true"
        className="toy-groove-handle"
        /* Travels the FULL groove: at the last column the handle's right edge
           meets the right end, so its reachable track is the groove minus its
           own width. The old divisor capped it at 11/12 of the way across. */
        style={{ left: `calc(${(handle + 1) / GRID_SIZE} * (100% - 34px))` }}
      />
    </div>
  );
}
