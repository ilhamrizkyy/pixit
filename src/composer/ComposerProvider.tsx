"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createComposerStore, type ComposerState, type ComposerStore } from "./store";

/**
 * Makes one composer store available to the toy's parts.
 *
 * The store is created PER MOUNT rather than as a module singleton. A module
 * singleton would survive navigation, so leaving /create and coming back would
 * hand you the previous drawing plus its undo stack — and on the server it
 * would be shared between every request, which is a cross-user data leak in a
 * route that is owner-only precisely because its contents are not public.
 *
 * The engine boundary still holds: this file knows about React, the store
 * knows about neither React nor the DOM, and the engine knows about nothing.
 */

const ComposerContext = createContext<ComposerStore | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  // A LAZY INITIALISER, not a bare call: `createComposerStore()` written
  // inline would build a fresh store on every render and throw away the
  // drawing. useState rather than a ref because the value is read during
  // render, which is exactly what refs are not for.
  const [store] = useState(createComposerStore);

  return (
    <ComposerContext.Provider value={store}>
      {children}
    </ComposerContext.Provider>
  );
}

/** The raw store, for reading state outside render (event handlers, effects). */
export function useComposerStore(): ComposerStore {
  const store = useContext(ComposerContext);
  if (store === null) {
    throw new Error("useComposerStore must be used inside <ComposerProvider>");
  }
  return store;
}

/**
 * Subscribe to a slice of composer state.
 *
 * ALWAYS select the narrowest thing you need. The board re-renders 121 cells,
 * so a component that selects the whole state re-renders on every pointer
 * sample of every drag.
 */
export function useComposer<T>(selector: (state: ComposerState) => T): T {
  return useStore(useComposerStore(), selector);
}
