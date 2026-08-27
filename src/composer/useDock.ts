"use client";

import { useCallback, useState } from "react";
import type { ToastTone } from "@/components/Toast";
import { cellsToSvg } from "@/engine/svg";
import type { IconDef } from "@/engine/types";
import { copyText, downloadSvg } from "@/lib/download";
import { icons as registryIcons } from "@/registry";
import { toRegistryEntry } from "@/registry/authoring";
import { useComposerStore } from "./ComposerProvider";
import { clearDraft, isIdTaken, listSavedIcons, saveIcon, toIconId } from "./storage";
import { toIconDraft } from "./store";

/**
 * Everything the dock DOES, lifted out of how it looks.
 *
 * The dock wears two shapes — a single wide row on a desktop, a phone bar plus
 * a sheet below `lg` — and the save rules, the id checks and the import guard
 * must be identical in both. Holding them here is what makes that true by
 * construction rather than by remembering to edit twice.
 *
 * Import takes an icon that is ALREADY IN THE SET rather than a file off disk,
 * so the surface that chooses it is a picker the dock opens, not a hidden file
 * input the dock has to own a ref to.
 *
 * REFUSALS LEAVE THROUGH THE SAME CHANNEL AS CONFIRMATIONS. They used to be a
 * line of state rendered inside the bar, which meant the bar changed height the
 * moment something went wrong — a floating toolbar growing upward into the toy
 * at exactly the moment you are trying to read it. As an error-toned toast the
 * message lands at the top of the screen, well clear of the dock it is about,
 * and the bar's geometry never moves.
 *
 * The tag DRAFT lives here for a related reason: below `lg` the tags field is
 * inside a sheet that unmounts on close, and state owned by the sheet would be
 * re-seeded from the kebab-cased store on every reopen — so "Arrow Right" would
 * come back as "arrow-right" under the cursor.
 */
export function useDock(onNotify: (message: string, tone?: ToastTone) => void) {
  const store = useComposerStore();
  const [saving, setSaving] = useState(false);
  const [tagText, setTagText] = useState(() => store.getState().tags.join(", "));

  /**
   * Bring an icon's art onto the board.
   *
   * NOT wrapped in a try/catch, unlike the file import this replaced. That one
   * parsed arbitrary bytes a person had chosen from their disk, so refusing
   * gracefully was the whole job. This one is handed an `IconDef` that has
   * already been validated — the registry at module load, a saved icon on read
   * — so a throw here would mean the set itself is corrupt, and swallowing that
   * into a toast would hide it.
   *
   * `importCells`, not `loadCells`: import COMMITS to history, so Ctrl+Z gives
   * back whatever was on the board before.
   */
  const importIcon = useCallback(
    (icon: IconDef) => {
      store.getState().importCells(icon.cells);
      onNotify(`Imported ${icon.name}`);
    },
    [store, onNotify],
  );

  /**
   * The icon as the source you paste into the registry.
   *
   * This is what closes the loop. Save writes to the browser, so an icon drawn
   * here has existed only in one machine's IndexedDB and never reached the
   * published set — which is the set this whole tool exists to grow.
   *
   * A STRING on the clipboard rather than a commit, deliberately. The registry
   * is reviewed in a diff, an id is immutable once published, and the owner
   * runs his own git — so the last step before an icon becomes permanent is a
   * person looking at it.
   */
  const copyRegistryEntry = useCallback(async () => {
    const draft = toIconDraft(store.getState());
    const fail = (message: string) => onNotify(message, "error");

    if (draft.name.trim() === "") {
      fail("Give the icon a name before copying its entry.");
      return;
    }
    if (draft.cells.every((cell) => cell === null)) {
      fail("Draw something before copying its entry.");
      return;
    }

    const id = toIconId(draft.name);
    if (id === "") {
      fail("That name has no letters or digits to build an id from.");
      return;
    }
    // Only the PUBLISHED set is checked. Colliding with a locally saved icon is
    // expected — this is very often the entry for the icon you just saved.
    if (registryIcons.some((icon) => icon.id === id)) {
      fail(`"${id}" is already in the registry.`);
      return;
    }

    const entry = toRegistryEntry({
      id,
      name: id,
      category: draft.category,
      tags: draft.tags,
      cells: draft.cells,
      createdAt: new Date().toISOString(),
    });

    // ONE clipboard write, read once. Calling copyText twice — as the first
    // draft of this did, to pick the message and then the tone — writes twice
    // and lets the two halves of the same toast disagree.
    if (await copyText(entry)) {
      onNotify("Entry copied — paste it into src/registry/icons.ts");
    } else {
      fail("Could not reach the clipboard.");
    }
  }, [store, onNotify]);

  const exportSvg = useCallback(() => {
    const draft = toIconDraft(store.getState());
    const file = `${draft.name.trim() === "" ? "untitled" : draft.name}.svg`;
    downloadSvg(file, cellsToSvg(draft.cells, { title: draft.name || undefined }));
    onNotify(`Exported ${file}`);
  }, [store, onNotify]);

  const save = useCallback(async () => {
    // Two clicks would both read the taken-id list BEFORE either wrote, so both
    // would find the name free and the second would overwrite the first. The
    // guard is the fix; disabling the button is only the visible half of it.
    if (saving) return;
    setSaving(true);
    const draft = toIconDraft(store.getState());

    const fail = (message: string) => {
      onNotify(message, "error");
      setSaving(false);
    };

    if (draft.name.trim() === "") {
      fail("Give the icon a name before saving.");
      return;
    }
    if (draft.cells.every((cell) => cell === null)) {
      fail("Draw something before saving.");
      return;
    }

    // An id is immutable once published and must never be recycled, so it is
    // checked against BOTH the published registry and what is already saved
    // locally (BACKLOG.md §D).
    const taken = [
      ...registryIcons.map((icon) => icon.id),
      ...(await listSavedIcons()).map((icon) => icon.id),
    ];
    const id = toIconId(draft.name);
    if (id === "") {
      fail("That name has no letters or digits to build an id from.");
      return;
    }
    if (isIdTaken(id, taken)) {
      fail(`"${id}" already exists. Names must be unique — pick another.`);
      return;
    }

    const icon: IconDef = {
      ...draft,
      id,
      name: id,
      author: "ilham",
      status: "published",
      createdAt: new Date().toISOString(),
    };

    if (!(await saveIcon(icon))) {
      fail("This browser would not store the icon. Export the SVG instead.");
      return;
    }
    await clearDraft();
    setSaving(false);
    onNotify(`Saved ${id}`);
  }, [saving, store, onNotify]);

  return {
    saving,
    copyRegistryEntry,
    tagText,
    setTagText,
    importIcon,
    exportSvg,
    save,
  };
}

export type Dock = ReturnType<typeof useDock>;
