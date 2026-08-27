"use client";

import { createStore, del, get, set } from "idb-keyval";
import { isValidCells } from "@/engine/grid";
import { CATEGORIES, type Category, type IconDef } from "@/engine/types";
import { isKebabCase, toKebabCase } from "@/registry/authoring";
import type { IconDraft } from "./store";

/**
 * Local persistence for the composer. BROWSER-ONLY — IndexedDB does not exist
 * on the server, so nothing here may be called during render or from a server
 * component.
 *
 * Two separate concerns, deliberately not conflated:
 *
 *  - THE DRAFT is the one in-progress drawing, so a refresh does not lose work.
 *  - SAVED ICONS are finished IconDefs. Phase 3 moves these to Supabase; until
 *    then they are owner-local, live on one browser, and are NOT published.
 *
 * Every read VALIDATES. A draft written by an older build, or hand-edited in
 * devtools, must not become corrupt editor state — it is discarded instead.
 * And every write is wrapped: storage can fail for reasons that have nothing to
 * do with us (private mode, quota, a blocked upgrade), and losing a draft is
 * never worth taking the composer down with an unhandled rejection.
 */

const DB = "pixle";
const DRAFT_KEY = "composer-draft";
const SAVED_KEY = "saved-icons";

/** Created lazily: touching IndexedDB at module scope would run on import. */
let store: ReturnType<typeof createStore> | null = null;
function db() {
  if (typeof indexedDB === "undefined") return null;
  store ??= createStore(DB, "keyval");
  return store;
}

async function read<T>(key: string): Promise<T | null> {
  const handle = db();
  if (handle === null) return null;
  try {
    return (await get<T>(key, handle)) ?? null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<boolean> {
  const handle = db();
  if (handle === null) return false;
  try {
    await set(key, value, handle);
    return true;
  } catch {
    return false;
  }
}

/* ---- Draft ------------------------------------------------------------- */

export async function saveDraft(draft: IconDraft): Promise<boolean> {
  return write(DRAFT_KEY, draft);
}

export async function loadDraft(): Promise<IconDraft | null> {
  const value = await read<unknown>(DRAFT_KEY);
  return isDraft(value) ? value : null;
}

export async function clearDraft(): Promise<void> {
  const handle = db();
  if (handle === null) return;
  try {
    await del(DRAFT_KEY, handle);
  } catch {
    /* A draft that outlives its save is a cosmetic problem, not a failure. */
  }
}

/* ---- Saved icons ------------------------------------------------------- */

export async function listSavedIcons(): Promise<IconDef[]> {
  const value = await read<unknown>(SAVED_KEY);
  return Array.isArray(value) ? value.filter(isIconDef) : [];
}

/**
 * Append an icon. `id` is immutable once published and is never recycled
 * (BACKLOG.md §D), so saving over an existing local id REPLACES that icon
 * rather than creating a second record wearing the same name.
 */
export async function saveIcon(icon: IconDef): Promise<boolean> {
  const existing = await listSavedIcons();
  const next = [...existing.filter((entry) => entry.id !== icon.id), icon];
  return write(SAVED_KEY, next);
}

/* ---- Pure helpers, testable without a database ------------------------- */

/**
 * The id a display name would claim. Empty when the name has nothing to build
 * one from.
 */
export function toIconId(name: string): string {
  return toKebabCase(name);
}

/**
 * Whether a name is already spoken for.
 *
 * A collision is REFUSED, not auto-suffixed. Quietly turning a second
 * "arrow-right" into "arrow-right-2" would hand the owner an icon under a name
 * they did not choose, and an id is immutable once published (BACKLOG.md §D) —
 * so the wrong name is permanent. Better to say so and let them pick.
 */
export function isIdTaken(id: string, taken: Iterable<string>): boolean {
  return new Set(taken).has(id);
}

/**
 * Tags as the registry requires them: kebab-case, de-duplicated, and with the
 * empties a trailing comma leaves behind dropped.
 */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const tag = toKebabCase(raw);
    if (tag !== "") seen.add(tag);
  }
  return [...seen];
}

function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((entry) => entry.id === value);
}

function isDraft(value: unknown): value is IconDraft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.name === "string" &&
    isCategory(draft.category) &&
    Array.isArray(draft.tags) &&
    draft.tags.every((tag) => typeof tag === "string") &&
    isValidCells(draft.cells)
  );
}

export function isIconDef(value: unknown): value is IconDef {
  if (!isDraft(value)) return false;
  const icon = value as unknown as Record<string, unknown>;
  return (
    typeof icon.id === "string" &&
    isKebabCase(icon.id) &&
    typeof icon.author === "string" &&
    (icon.status === "published" ||
      icon.status === "pending" ||
      icon.status === "rejected") &&
    typeof icon.createdAt === "string"
  );
}
