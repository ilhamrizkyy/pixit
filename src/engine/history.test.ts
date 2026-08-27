import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
} from "./history";

describe("createHistory", () => {
  it("starts with nothing to undo or redo", () => {
    const history = createHistory("a");
    expect(history.present).toBe("a");
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe("commit", () => {
  it("moves the present into the past", () => {
    const history = commit(createHistory("a"), "b");
    expect(history.present).toBe("b");
    expect(history.past).toEqual(["a"]);
    expect(canUndo(history)).toBe(true);
  });

  it("ignores a commit of the identical value", () => {
    const history = createHistory("a");
    // Guards against a no-op gesture inserting an undo step that does nothing.
    expect(commit(history, "a")).toBe(history);
  });

  it("discards the redo stack — branching abandons the other branch", () => {
    let history = commit(createHistory("a"), "b");
    history = undo(history);
    expect(canRedo(history)).toBe(true);
    history = commit(history, "c");
    expect(canRedo(history)).toBe(false);
    expect(history.present).toBe("c");
  });

  it("caps retained states at HISTORY_LIMIT", () => {
    let history = createHistory(0);
    for (let step = 1; step <= HISTORY_LIMIT + 25; step++) {
      history = commit(history, step);
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    // The oldest states fall off the front, not the back.
    expect(history.past[history.past.length - 1]).toBe(HISTORY_LIMIT + 24);
  });
});

describe("undo and redo", () => {
  it("steps backwards and forwards through the same states", () => {
    let history = commit(commit(createHistory("a"), "b"), "c");

    history = undo(history);
    expect(history.present).toBe("b");
    history = undo(history);
    expect(history.present).toBe("a");
    expect(canUndo(history)).toBe(false);

    history = redo(history);
    expect(history.present).toBe("b");
    history = redo(history);
    expect(history.present).toBe("c");
    expect(canRedo(history)).toBe(false);
  });

  it("no-ops at either end rather than throwing", () => {
    const fresh = createHistory("a");
    expect(undo(fresh)).toBe(fresh);
    expect(redo(fresh)).toBe(fresh);
  });
});
