"use client";

import { useEffect } from "react";
import { useComposerStore } from "./ComposerProvider";

/**
 * Undo/redo from the keyboard (INTERACTION.md §2).
 *
 * Bound on the document rather than on the board, because the shortcut has to
 * work while a tool button holds focus — otherwise undo stops working the
 * moment you press one.
 */
export function useComposerShortcuts(): void {
  const store = useComposerStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      // Never steal Cmd+Z from a text field: typing a name in the dock and
      // pressing undo must undo the TYPING, not wipe the drawing.
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        store.getState().undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        store.getState().redo();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store]);
}
