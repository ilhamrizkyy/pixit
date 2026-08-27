/**
 * Undo/redo (INTERACTION.md §2). Pure and generic over the state it holds, so
 * it can be unit-tested without a grid and without a store.
 *
 * One mutating action = one entry. A drag stroke and a slide-erase are each a
 * single entry, not one per cell — so callers commit on gesture END, not on
 * every intermediate frame.
 */

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

/** Cap on retained states. Grids are 121-element arrays; this is cheap. */
export const HISTORY_LIMIT = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/**
 * Record a new state as one undo step. Clears the redo stack, which is the
 * conventional behavior: branching after an undo discards the abandoned
 * branch.
 */
export function commit<T>(history: History<T>, next: T): History<T> {
  if (Object.is(next, history.present)) return history;
  const past = [...history.past, history.present];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past,
    present: next,
    future: [],
  };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
