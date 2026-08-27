import { describe, expect, it } from "vitest";
import { DEFAULT_COLOR } from "@/engine/color";
import { GRID_SIZE } from "@/engine/constants";
import { createEmptyCells, toIndex } from "@/engine/grid";
import type { Cells } from "@/engine/types";
import {
  createComposerStore,
  selectCanRedo,
  selectCanUndo,
  toIconDraft,
  type ComposerStore,
} from "./store";

const RED = "#ff0000";
const LAST = GRID_SIZE - 1;

function at(cells: Cells, row: number, col: number) {
  return cells[toIndex(row, col)];
}

/** Every cell painted — enough to see a column wipe against. */
function fullBoard(color: string): Cells {
  return createEmptyCells().map(() => color);
}

/** How many undo steps deep the store is. */
function depth(store: ComposerStore): number {
  return store.getState().history.past.length;
}

/** Press, drag through each cell in order, release — one complete gesture. */
function stroke(store: ComposerStore, path: readonly number[]): void {
  const [first, ...rest] = path;
  store.getState().pressCell(first);
  for (const index of rest) store.getState().dragToCell(index);
  store.getState().endStroke();
}

describe("drawing a stroke", () => {
  it("paints every cell the drag crossed and lands as ONE undo step", () => {
    const store = createComposerStore();

    store.getState().pressCell(toIndex(5, 2));
    store.getState().dragToCell(toIndex(5, 3));
    store.getState().dragToCell(toIndex(5, 6));

    // The board updates live, but nothing has reached history yet — that is
    // what makes a whole drag one undo press (INTERACTION.md §2).
    expect(depth(store)).toBe(0);
    for (let col = 2; col <= 6; col++) {
      expect(at(store.getState().cells, 5, col)).toBe(DEFAULT_COLOR);
    }

    store.getState().endStroke();
    expect(depth(store)).toBe(1);

    store.getState().undo();
    expect(store.getState().cells).toEqual(createEmptyCells());
  });

  it("fills the cells a fast drag skipped over", () => {
    const store = createComposerStore();
    // (5,3) is never sampled; a coarse pointer jumped straight past it.
    stroke(store, [toIndex(5, 2), toIndex(5, 4)]);
    expect(at(store.getState().cells, 5, 3)).toBe(DEFAULT_COLOR);
  });

  it("erases for the whole stroke once it starts on a filled cell", () => {
    const store = createComposerStore();
    let board = createEmptyCells();
    board[toIndex(5, 0)] = RED;
    board[toIndex(5, 2)] = RED;
    board[toIndex(5, 4)] = RED;
    store.getState().loadCells(board);

    // Press lands on paint, so the mode is erase and STAYS erase across the
    // empty cells between — it must not start painting at (5,1).
    stroke(store, [toIndex(5, 0), toIndex(5, 4)]);

    board = store.getState().cells;
    for (let col = 0; col <= 4; col++) expect(at(board, 5, col)).toBeNull();
  });

  it("uses the current color, and a later color change leaves it alone", () => {
    const store = createComposerStore();
    store.getState().setColor(RED);
    stroke(store, [toIndex(1, 1)]);
    store.getState().setColor("#00ff00");

    // Rule 2: a new color applies only to the NEXT cells drawn.
    expect(at(store.getState().cells, 1, 1)).toBe(RED);
  });

  it("ignores a drag that never had a press behind it", () => {
    const store = createComposerStore();
    store.getState().dragToCell(toIndex(4, 4));
    store.getState().endStroke();

    expect(store.getState().cells).toEqual(createEmptyCells());
    expect(depth(store)).toBe(0);
  });
});

describe("history granularity", () => {
  it("costs exactly one undo press for a press and release on one cell", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(0, 0)]);
    expect(depth(store)).toBe(1);
  });

  it("records nothing for a press that draws nothing", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(2, 2)]);
    const before = depth(store);

    // The reachable no-op press: armed, a tap samples a color instead of
    // drawing, so it must not spend an undo press.
    store.getState().armEyedropper();
    store.getState().pressCell(toIndex(2, 2));
    store.getState().endStroke();

    // And a sample from a pointer that slid off the board.
    store.getState().pressCell(-1);
    store.getState().pressCell(GRID_SIZE * GRID_SIZE);
    store.getState().endStroke();

    expect(depth(store)).toBe(before);
  });

  it("paints the RECTANGLE spanned by the origin and the pointer", () => {
    const store = createComposerStore();
    store.getState().setColor(RED);
    store.getState().pressCell(toIndex(2, 2));
    store.getState().dragToCell(toIndex(4, 5));

    const cells = store.getState().cells;
    for (let row = 2; row <= 4; row++) {
      for (let col = 2; col <= 5; col++) expect(at(cells, row, col)).toBe(RED);
    }
    // Nothing outside the rectangle.
    expect(at(cells, 1, 2)).toBeNull();
    expect(at(cells, 5, 5)).toBeNull();
    expect(at(cells, 2, 6)).toBeNull();
  });

  it("SHRINKS when the pointer comes back toward the origin", () => {
    // The ratchet bug: building each sample on the running result instead of on
    // the pre-gesture board would leave everything the drag ever covered
    // painted, so the rectangle could only ever grow.
    const store = createComposerStore();
    store.getState().setColor(RED);
    store.getState().pressCell(toIndex(0, 0));
    store.getState().dragToCell(toIndex(4, 4));
    store.getState().dragToCell(toIndex(1, 1));

    const cells = store.getState().cells;
    expect(at(cells, 1, 1)).toBe(RED);
    expect(at(cells, 4, 4)).toBeNull();
    expect(at(cells, 2, 2)).toBeNull();
  });

  it("normalises the corners, so dragging up-left covers the same cells", () => {
    const forward = createComposerStore();
    forward.getState().pressCell(toIndex(1, 1));
    forward.getState().dragToCell(toIndex(3, 3));

    const backward = createComposerStore();
    backward.getState().pressCell(toIndex(3, 3));
    backward.getState().dragToCell(toIndex(1, 1));

    expect(backward.getState().cells).toEqual(forward.getState().cells);
  });

  it("allocates nothing when the pointer has not left its cell", () => {
    const store = createComposerStore();
    store.getState().pressCell(toIndex(4, 4));
    const afterPress = store.getState().cells;
    store.getState().dragToCell(toIndex(4, 4));
    // A pointer moving WITHIN one cell fires many samples; none may re-render
    // the board.
    expect(store.getState().cells).toBe(afterPress);
  });

  it("does not record a clear of an already-blank board", () => {
    const store = createComposerStore();
    store.getState().clearAll();
    expect(depth(store)).toBe(0);

    stroke(store, [toIndex(3, 3)]);
    store.getState().clearAll();
    expect(depth(store)).toBe(2);
    store.getState().undo();
    expect(at(store.getState().cells, 3, 3)).toBe(DEFAULT_COLOR);
  });

  it("does not record a transform of a blank board", () => {
    const store = createComposerStore();
    store.getState().rotate();
    store.getState().flipH();
    store.getState().flipV();
    expect(depth(store)).toBe(0);
  });

  it("gives each transform press its own entry", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(0, 0)]);
    store.getState().rotate();
    store.getState().rotate();
    expect(depth(store)).toBe(3);
  });
});

describe("mirror", () => {
  it("paints both sides while on, and stays out of the saved icon", () => {
    const store = createComposerStore();
    store.getState().toggleMirror();
    stroke(store, [toIndex(3, 1)]);

    const draft = toIconDraft(store.getState());
    expect(at(draft.cells, 3, 1)).toBe(DEFAULT_COLOR);
    expect(at(draft.cells, 3, LAST - 1)).toBe(DEFAULT_COLOR);

    // A drawing aid, not a property of the icon (INTERACTION.md §1).
    expect(store.getState().mirror).toBe(true);
    expect("mirror" in draft).toBe(false);
    expect(Object.keys(draft).sort()).toEqual([
      "category",
      "cells",
      "name",
      "tags",
    ]);
  });

  it("mirrors the erase half of a stroke too", () => {
    const store = createComposerStore();
    store.getState().toggleMirror();
    stroke(store, [toIndex(3, 1)]);
    stroke(store, [toIndex(3, 1)]);

    expect(at(store.getState().cells, 3, 1)).toBeNull();
    expect(at(store.getState().cells, 3, LAST - 1)).toBeNull();
  });
});

describe("eyedropper", () => {
  it("takes the color from the picked cell and disarms after one pick", () => {
    const store = createComposerStore();
    const board = createEmptyCells();
    board[toIndex(2, 2)] = RED;
    board[toIndex(7, 7)] = "#00ff00";
    store.getState().loadCells(board);

    store.getState().armEyedropper();
    expect(store.getState().eyedropperArmed).toBe(true);

    store.getState().pressCell(toIndex(2, 2));
    expect(store.getState().currentColor).toBe(RED);
    expect(store.getState().eyedropperArmed).toBe(false);
    // Sampling is not drawing: the cell it sampled is untouched.
    expect(at(store.getState().cells, 2, 2)).toBe(RED);

    // Disarmed, the very next press draws again rather than picking a second
    // color — "deactivates after one pick".
    store.getState().pressCell(toIndex(7, 7));
    store.getState().endStroke();
    expect(store.getState().currentColor).toBe(RED);
    expect(at(store.getState().cells, 7, 7)).toBeNull();
  });

  it("spends the pick on an empty cell rather than leaving the droplet stuck", () => {
    const store = createComposerStore();
    store.getState().armEyedropper();
    store.getState().pickColorAt(toIndex(0, 0));

    expect(store.getState().eyedropperArmed).toBe(false);
    expect(store.getState().currentColor).toBe(DEFAULT_COLOR);
  });
});

describe("slide to clear", () => {
  it("keeps the furthest column reached and lands as one undo step", () => {
    const store = createComposerStore();
    const board = fullBoard(RED);
    store.getState().loadCells(board);

    store.getState().beginWipe();
    store.getState().wipeTo(3);
    store.getState().wipeTo(1);
    store.getState().endWipe();

    const cells = store.getState().cells;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= 3; col++) expect(at(cells, row, col)).toBeNull();
      // Dragging back leftward must not un-erase, and must not erase further.
      for (let col = 4; col < GRID_SIZE; col++) expect(at(cells, row, col)).toBe(RED);
    }

    expect(depth(store)).toBe(1);
    store.getState().undo();
    expect(store.getState().cells).toEqual(board);
  });

  it("records nothing when the handle never leaves rest", () => {
    const store = createComposerStore();
    store.getState().loadCells(fullBoard(RED));
    store.getState().beginWipe();
    store.getState().endWipe();
    expect(depth(store)).toBe(0);
  });

  it("never starts on a blank board", () => {
    const store = createComposerStore();
    store.getState().beginWipe();
    store.getState().wipeTo(5);
    store.getState().endWipe();
    expect(depth(store)).toBe(0);
  });

  it("ignores a press while the handle is moving", () => {
    const store = createComposerStore();
    store.getState().loadCells(fullBoard(RED));
    store.getState().beginWipe();
    store.getState().pressCell(toIndex(9, 9));

    expect(store.getState().stroke).toBeNull();
    expect(at(store.getState().cells, 9, 9)).toBe(RED);
  });
});

describe("transforms", () => {
  it("returns the original drawing after four rotate presses", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(0, 0), toIndex(0, 3)]);
    const original = store.getState().cells;

    for (let turn = 0; turn < 4; turn++) store.getState().rotate();

    expect(store.getState().cells).toEqual(original);
    // Four presses, four undo steps — one press is never folded into another.
    expect(depth(store)).toBe(5);
  });

  it("rotates clockwise, the only direction one press offers", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(0, 0)]);
    store.getState().rotate();
    expect(at(store.getState().cells, 0, LAST)).toBe(DEFAULT_COLOR);
  });

  it("flips the whole drawing on each axis", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(0, 0)]);

    store.getState().flipH();
    expect(at(store.getState().cells, 0, LAST)).toBe(DEFAULT_COLOR);

    store.getState().flipV();
    expect(at(store.getState().cells, LAST, LAST)).toBe(DEFAULT_COLOR);
  });
});

describe("undo and redo", () => {
  it("steps back and forward through the same drawings", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(1, 1)]);
    stroke(store, [toIndex(2, 2)]);

    expect(selectCanUndo(store.getState())).toBe(true);
    expect(selectCanRedo(store.getState())).toBe(false);

    store.getState().undo();
    expect(at(store.getState().cells, 2, 2)).toBeNull();
    expect(at(store.getState().cells, 1, 1)).toBe(DEFAULT_COLOR);
    expect(selectCanRedo(store.getState())).toBe(true);

    store.getState().redo();
    expect(at(store.getState().cells, 2, 2)).toBe(DEFAULT_COLOR);
  });

  it("discards the redo stack once a new edit branches off", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(1, 1)]);
    stroke(store, [toIndex(2, 2)]);
    store.getState().undo();
    expect(selectCanRedo(store.getState())).toBe(true);

    stroke(store, [toIndex(3, 3)]);

    expect(selectCanRedo(store.getState())).toBe(false);
    expect(at(store.getState().cells, 3, 3)).toBe(DEFAULT_COLOR);
    expect(at(store.getState().cells, 2, 2)).toBeNull();
  });

  it("no-ops at either end of the stack", () => {
    const store = createComposerStore();
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().cells).toEqual(createEmptyCells());
    expect(selectCanUndo(store.getState())).toBe(false);
  });
});

describe("color", () => {
  it("normalizes a typed hex and rejects an unusable one", () => {
    const store = createComposerStore();

    store.getState().setColor("#ABC");
    expect(store.getState().currentColor).toBe("#aabbcc");

    // A half-typed field must not change the paint color.
    store.getState().setColor("#ab");
    expect(store.getState().currentColor).toBe("#aabbcc");
  });
});

describe("loading a document", () => {
  it("replaces the drawing and leaves nothing to undo back into", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(1, 1)]);

    const board = fullBoard(RED);
    store.getState().loadCells(board);

    expect(store.getState().cells).toEqual(board);
    expect(selectCanUndo(store.getState())).toBe(false);
    expect(selectCanRedo(store.getState())).toBe(false);
  });

  it("copies the caller's array instead of aliasing it", () => {
    const store = createComposerStore();
    const board = fullBoard(RED);
    store.getState().loadCells(board);

    board[0] = "#00ff00";
    expect(at(store.getState().cells, 0, 0)).toBe(RED);
  });

  it("refuses a malformed grid rather than half-importing it", () => {
    const store = createComposerStore();
    expect(() => store.getState().loadCells([RED, null])).toThrow();
    expect(store.getState().cells).toEqual(createEmptyCells());
  });
});

describe("importing another icon's art", () => {
  /* The difference from `loadCells` is the whole point. Import replaced a file
     dialog with a one-click grid, so importing over work in progress became an
     easy accident — and a reset history is one that cannot give that work back.
     Import is a MUTATION of the drawing; a draft restore is a new document. */
  it("is ONE undo step, so the previous drawing comes back", () => {
    const store = createComposerStore();
    stroke(store, [toIndex(1, 1)]);
    const before = store.getState().cells;

    store.getState().importCells(fullBoard(RED));
    expect(store.getState().cells).toEqual(fullBoard(RED));
    expect(depth(store)).toBe(2);

    store.getState().undo();
    expect(store.getState().cells).toEqual(before);
  });

  it("can be redone after being undone", () => {
    const store = createComposerStore();
    const board = fullBoard(RED);
    store.getState().importCells(board);
    store.getState().undo();

    expect(selectCanRedo(store.getState())).toBe(true);
    store.getState().redo();
    expect(store.getState().cells).toEqual(board);
  });

  it("copies the caller's array instead of aliasing it", () => {
    const store = createComposerStore();
    const board = fullBoard(RED);
    store.getState().importCells(board);

    board[0] = "#00ff00";
    expect(at(store.getState().cells, 0, 0)).toBe(RED);
  });

  it("refuses a malformed grid rather than half-importing it", () => {
    const store = createComposerStore();
    expect(() => store.getState().importCells([RED, null])).toThrow();
    expect(store.getState().cells).toEqual(createEmptyCells());
  });
});

describe("metadata", () => {
  it("carries into the draft without touching the drawing or history", () => {
    const store = createComposerStore();
    store.getState().setName("arrow-right");
    store.getState().setCategory("arcade");
    store.getState().setTags(["arrow", "direction"]);

    const draft = toIconDraft(store.getState());
    expect(draft.name).toBe("arrow-right");
    expect(draft.category).toBe("arcade");
    expect(draft.tags).toEqual(["arrow", "direction"]);
    // Metadata is not a mutating action on the drawing (INTERACTION.md §2).
    expect(depth(store)).toBe(0);
  });
});

describe("store instances", () => {
  it("shares nothing between two stores", () => {
    const first = createComposerStore();
    const second = createComposerStore();

    stroke(first, [toIndex(4, 4)]);

    expect(at(second.getState().cells, 4, 4)).toBeNull();
    expect(depth(second)).toBe(0);
  });
});

describe("slide to clear on an empty board", () => {
  it("starts no wipe, and records nothing, when there is nothing to erase", () => {
    const store = createComposerStore();
    store.getState().beginWipe();
    expect(store.getState().wipe).toBeNull();
    store.getState().wipeTo(5);
    store.getState().endWipe();
    expect(depth(store)).toBe(0);
    // The HANDLE still has to move — that is the component's own state, not
    // the store's, precisely so a blank board does not look like a jammed
    // control.
  });
});
