/**
 * Composer editor state (INTERACTION.md §1–§5) — the layer between the engine
 * and the toy's UI.
 *
 * It owns what the owner is editing right now and delegates every change to an
 * engine op. There is deliberately NO grid maths in this file: an index
 * computed here instead of in `@/engine` is the first crack in the boundary
 * that lets the DOM/CSS-3D toy become the R3F toy later (TECH-STACK.md).
 *
 * TWO FIELDS FOR ONE DRAWING. `cells` is what the screen shows on the current
 * pointer frame; `history.present` is the last COMMITTED drawing. They hold the
 * same reference except while a gesture is in flight, and that is exactly what
 * makes "one mutating action = one undo step" (INTERACTION.md §2) fall out for
 * free: a drag paints into `cells` on every sample and only `endStroke`
 * commits. Because `history.present` is therefore always the pre-gesture
 * drawing, no gesture has to snapshot anything to be undoable.
 *
 * NOT A REACT MODULE, AND NOT A SINGLETON. This is vanilla zustand: the
 * presentation creates one store with `createComposerStore()` and reads it with
 * zustand's `useStore(store, selector)`. A module-level instance would be
 * shared by every server render and impossible to isolate between tests; a
 * factory is neither.
 */

import { createStore, type StoreApi } from "zustand/vanilla";
import {
  DEFAULT_COLOR,
  DEFAULT_HSL,
  hexToHsl,
  hslToHex,
  type Hsl,
  type Cells,
  type Category,
  type History,
  type IconDef,
  type StrokeMode,
  applyStroke,
  canRedo,
  canUndo,
  cellsInRect,
  commit as commitHistory,
  createEmptyCells,
  createHistory,
  flipHorizontal,
  flipVertical,
  inBounds,
  isEmpty,
  isValidCells,
  normalizeHex,
  redo as redoHistory,
  rotateClockwise,
  strokeModeForPress,
  toCoords,
  undo as undoHistory,
  wipeThroughColumn,
} from "@/engine";

/** An in-progress drag, from press to release. */
export type StrokeState = {
  /** Decided on press and fixed for the whole gesture. */
  mode: StrokeMode;
  /** The corner the drag started from. The rectangle spans origin -> pointer. */
  origin: number;
  /**
   * The drawing as it was before the gesture.
   *
   * The rectangle is recomputed against THIS on every pointer sample rather
   * than accumulated, which is the only way it can shrink when the pointer
   * comes back toward the origin. Accumulating would make a drag a one-way
   * ratchet that paints everything it ever touched.
   */
  before: Cells;
  /** Last sampled cell, so an unmoved pointer does no work. */
  lastIndex: number;
};

export type WipeState = {
  /**
   * The drawing as it was when the handle left rest. `wipeThroughColumn` is
   * idempotent against a fixed input, so every frame recomputes from this
   * rather than compounding onto the last frame's result.
   */
  before: Cells;
  /**
   * The furthest column the handle reached, not where it sits now. Dragging
   * back leftward must not un-erase — a real Etch A Sketch does not either.
   */
  furthestColumn: number;
};

/**
 * The handle's resting position. The engine treats any column below 0 as a
 * no-op wipe, which is what "at rest erases nothing" means numerically.
 */
const WIPE_AT_REST = -1;

export type ComposerData = {
  /** The live drawing, updated on every pointer sample. */
  cells: Cells;
  /** Committed drawings only — one entry per mutating action. */
  history: History<Cells>;
  /**
   * The paint color, as a baked hex. Changing it affects only the NEXT cells
   * drawn; nothing here ever recolors a cell already on the board
   * (CLAUDE.md rule 2).
   */
  currentColor: string;
  /**
   * The picker's own position, kept ALONGSIDE the hex rather than derived from
   * it. A grey has no hue to recover — hexToHsl("#111111") is hue 0 whatever
   * hue you dialled — so deriving would make the hue knob dead at saturation 0
   * and silently reset it every time lightness reached black or white.
   * `currentColor` stays the paint truth; this is where the knobs stand.
   */
  hsl: Hsl;
  /** Mirror drawing aid. Live assistance only — never stored on the icon. */
  mirror: boolean;
  gridGuide: boolean;
  /**
   * Show every control's name on the toy itself.
   *
   * A view preference like `gridGuide`, not editor state — `toIconDraft` takes
   * only name/category/tags/cells, so it can never reach a saved icon.
   */
  annotations: boolean;
  eyedropperArmed: boolean;
  stroke: StrokeState | null;
  wipe: WipeState | null;
  name: string;
  category: Category;
  tags: string[];
};

export type ComposerActions = {
  /** Pointer down on a cell: picks the color if the eyedropper is armed, otherwise opens a stroke. */
  pressCell: (index: number) => void;
  /** Pointer moved to another cell while pressed. Ignored without a press — hover is not a drag. */
  dragToCell: (index: number) => void;
  /** Pointer up. The one place a stroke reaches history. */
  endStroke: () => void;

  setColor: (hex: string) => void;
  /** Move one or more picker channels. The paint colour follows. */
  setHsl: (next: Partial<Hsl>) => void;
  /** Eyedropper pick. Always disarms: one pick only (INTERACTION.md §1). */
  pickColorAt: (index: number) => void;
  armEyedropper: () => void;
  toggleMirror: () => void;
  toggleGridGuide: () => void;
  toggleAnnotations: () => void;

  flipH: () => void;
  flipV: () => void;
  /** 90° clockwise, one quarter turn per press. The only rotation the toy offers. */
  rotate: () => void;

  undo: () => void;
  redo: () => void;

  beginWipe: () => void;
  /** Move the handle. Only forward progress erases. */
  wipeTo: (column: number) => void;
  /** Release. The whole wipe lands as one undo step. */
  endWipe: () => void;

  clearAll: () => void;
  /** Replace the document — a draft restore. Resets history. */
  loadCells: (cells: Cells) => void;
  /** Bring another icon's art onto the board as ONE UNDOABLE step. */
  importCells: (cells: Cells) => void;

  setName: (name: string) => void;
  setCategory: (category: Category) => void;
  setTags: (tags: string[]) => void;
};

export type ComposerState = ComposerData & ComposerActions;

export type ComposerStore = StoreApi<ComposerState>;

/**
 * Whether a pointer sample names a real cell. The engine's stroke ops assume a
 * valid index — `cellsInRect` throws on a bad one — so a sample from a pointer
 * that slid off the board is filtered here, at the seam that owns input.
 */
function isCellIndex(index: number): boolean {
  if (!Number.isInteger(index)) return false;
  const { row, col } = toCoords(index);
  return inBounds(row, col);
}

function initialData(): ComposerData {
  const cells = createEmptyCells();
  return {
    cells,
    // Same reference in both fields: outside a gesture they never diverge.
    history: createHistory(cells),
    currentColor: DEFAULT_COLOR,
    // Taken straight from the source rather than round-tripped through the
    // hex, so the knobs open exactly where the constant says.
    hsl: DEFAULT_HSL,
    mirror: false,
    // On by default: the gridlines are how you count cells while drawing, and
    // a pixel editor that opens without them hides its own unit.
    gridGuide: true,
    // Off by default: the toy should be legible without a legend, and the
    // legend is there for the moment it is not.
    annotations: false,
    eyedropperArmed: false,
    stroke: null,
    wipe: null,
    name: "",
    // The category union is closed and has no "unset" member, so a new drawing
    // has to start somewhere. Save still requires a name, so this is a
    // default rather than a silent choice made on the owner's behalf.
    category: "interface",
    tags: [],
  };
}

export function createComposerStore(): ComposerStore {
  return createStore<ComposerState>()((set, get) => {
    /**
     * Every drawing mutation ends here: swap the live cells and record ONE
     * history entry. `commit` ignores a value identical by reference to the
     * present, and the guards at each call site make sure an action that could
     * not have changed anything never gets this far — between them, no gesture
     * costs the owner an undo press it did not earn.
     */
    const commitDrawing = (next: Cells): void => {
      set({ cells: next, history: commitHistory(get().history, next) });
    };

    /** Shared by flip/rotate: one press, one entry, nothing to do on a blank board. */
    const applyTransform = (op: (cells: Cells) => Cells): void => {
      const { cells } = get();
      if (isEmpty(cells)) return;
      commitDrawing(op(cells));
    };

    /** Undo and redo differ only in which engine op they run. */
    const travel = (op: (history: History<Cells>) => History<Cells>): void => {
      const { history } = get();
      const next = op(history);
      if (next === history) return;
      // Abandon any gesture in flight: its lastIndex and `before` snapshot
      // describe a drawing that is no longer on the board.
      set({ history: next, cells: next.present, stroke: null, wipe: null });
    };

    return {
      ...initialData(),

      pressCell: (index) => {
        const state = get();
        if (state.wipe !== null) return;
        if (!isCellIndex(index)) return;

        // Armed, a tap samples instead of drawing — so it opens no stroke and
        // reaches no history.
        if (state.eyedropperArmed) {
          state.pickColorAt(index);
          return;
        }

        const mode = strokeModeForPress(state.cells, index);
        set({
          cells: applyStroke(state.cells, [index], {
            mode,
            color: state.currentColor,
            mirror: state.mirror,
          }),
          stroke: { mode, origin: index, before: state.cells, lastIndex: index },
        });
      },

      dragToCell: (index) => {
        const { stroke, currentColor, mirror } = get();
        if (stroke === null) return;
        if (!isCellIndex(index)) return;
        if (index === stroke.lastIndex) return;

        set({
          // Against `before`, not the live cells: the rectangle must be able to
          // SHRINK as the pointer comes back, and painting onto the running
          // result would leave everything the drag ever covered behind.
          cells: applyStroke(stroke.before, cellsInRect(stroke.origin, index), {
            mode: stroke.mode,
            color: currentColor,
            mirror,
          }),
          stroke: { ...stroke, lastIndex: index },
        });
      },

      endStroke: () => {
        const { stroke, cells } = get();
        if (stroke === null) return;
        set({ stroke: null, history: commitHistory(get().history, cells) });
      },

      setColor: (hex) => {
        // A half-typed hex field must not change the paint color, so anything
        // unparseable leaves the current color standing (INTERACTION.md §4).
        const normalized = normalizeHex(hex);
        if (normalized === null) return;
        // A typed hex is authoritative: the knobs snap to it (INTERACTION.md §4).
        set({ currentColor: normalized, hsl: hexToHsl(normalized) });
      },

      setHsl: (next) => {
        const hsl = { ...get().hsl, ...next };
        set({ hsl, currentColor: hslToHex(hsl) });
      },

      pickColorAt: (index) => {
        if (!isCellIndex(index)) return;
        const { cells } = get();
        const picked = cells[index];
        // Sampling an empty cell yields no color, but it still spends the pick:
        // the alternative is a droplet the owner cannot put down, since arming
        // is the only control the toy has.
        set({
          eyedropperArmed: false,
          ...(picked === null ? {} : { currentColor: picked, hsl: hexToHsl(picked) }),
        });
      },

      armEyedropper: () => set({ eyedropperArmed: true }),
      toggleMirror: () => set({ mirror: !get().mirror }),
      toggleGridGuide: () => set({ gridGuide: !get().gridGuide }),
      toggleAnnotations: () => set({ annotations: !get().annotations }),

      flipH: () => applyTransform(flipHorizontal),
      flipV: () => applyTransform(flipVertical),
      rotate: () => applyTransform(rotateClockwise),

      undo: () => travel(undoHistory),
      redo: () => travel(redoHistory),

      beginWipe: () => {
        const { cells, stroke } = get();
        if (stroke !== null) return;
        // Nothing to erase, so the gesture never starts and cannot leave an
        // undo step that restores an identically blank board.
        if (isEmpty(cells)) return;
        set({ wipe: { before: cells, furthestColumn: WIPE_AT_REST } });
      },

      wipeTo: (column) => {
        const { wipe } = get();
        if (wipe === null) return;
        if (column <= wipe.furthestColumn) return;
        set({
          cells: wipeThroughColumn(wipe.before, column),
          wipe: { before: wipe.before, furthestColumn: column },
        });
      },

      endWipe: () => {
        const { wipe, cells } = get();
        if (wipe === null) return;
        // The handle snaps back to rest but the wipe stays wiped, as one entry.
        set({ wipe: null, history: commitHistory(get().history, cells) });
      },

      clearAll: () => {
        if (isEmpty(get().cells)) return;
        commitDrawing(createEmptyCells());
      },

      /**
       * Import is a MUTATION of the drawing you already have, not the opening
       * of a new document — which is why it commits to history where
       * `loadCells` resets it.
       *
       * The distinction became load-bearing when import stopped being a file
       * picker. Choosing an icon from a grid is one click, so importing over
       * work in progress is an easy thing to do by accident, and a reset
       * history means Undo cannot give that work back. As a committed step,
       * Ctrl+Z returns the board to exactly what it was.
       */
      importCells: (cells) => {
        if (!isValidCells(cells)) {
          throw new Error("importCells: not a valid 11x11 grid");
        }
        commitDrawing(cells.slice());
      },

      loadCells: (cells) => {
        // Fail loudly rather than half-import: a malformed grid that reaches
        // state corrupts every later export (svg.ts makes the same choice).
        if (!isValidCells(cells)) {
          throw new Error("loadCells: not a valid 11x11 grid");
        }
        // Copy, so the caller's array cannot mutate state behind our back.
        const loaded = cells.slice();
        set({
          cells: loaded,
          // A loaded document is a new document — there is no earlier state of
          // it to undo back into.
          history: createHistory(loaded),
          stroke: null,
          wipe: null,
        });
      },

      setName: (name) => set({ name }),
      setCategory: (category) => set({ category }),
      setTags: (tags) => set({ tags: [...tags] }),
    };
  });
}

/**
 * The parts of the editor that become an icon. Typed as a slice of `IconDef`,
 * so the drawing aids have nowhere to land: mirror and the grid guide are
 * absent here by construction, not by remembering to omit them.
 *
 * `id`, `author`, `status`, and `createdAt` are the save path's to assign.
 */
export type IconDraft = Pick<IconDef, "name" | "category" | "tags" | "cells">;

export function toIconDraft(state: ComposerData): IconDraft {
  return {
    name: state.name,
    category: state.category,
    tags: state.tags,
    cells: state.cells,
  };
}

/** Undo/Redo are disabled when their stacks are empty (INTERACTION.md §7). */
export function selectCanUndo(state: ComposerData): boolean {
  return canUndo(state.history);
}

export function selectCanRedo(state: ComposerData): boolean {
  return canRedo(state.history);
}
