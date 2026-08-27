"use client";

import { useEffect } from "react";
import { useComposerStore } from "./ComposerProvider";
import { loadDraft, saveDraft } from "./storage";
import { toIconDraft } from "./store";

/** How long the drawing must sit still before it is written. */
const DEBOUNCE_MS = 600;

/**
 * Keeps the in-progress drawing across a refresh (PLAN.md Phase 2).
 *
 * Restores once on mount, then writes on a debounce. The debounce is the whole
 * point: a drag fires a store update per pointer sample, and writing to
 * IndexedDB on each one would put a database round trip inside the paint loop.
 *
 * A restore never overwrites work: if the store already holds a drawing by the
 * time the read resolves, the draft is stale and is dropped. Otherwise a slow
 * database could wipe the first strokes of a new icon.
 */
export function useDraft(): void {
  const store = useComposerStore();

  useEffect(() => {
    let cancelled = false;

    void loadDraft().then((draft) => {
      if (cancelled || draft === null) return;
      const state = store.getState();
      if (state.cells.some((cell) => cell !== null)) return;
      state.loadCells(draft.cells);
      state.setName(draft.name);
      state.setCategory(draft.category);
      state.setTags(draft.tags);
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => void saveDraft(toIconDraft(state)), DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [store]);
}
