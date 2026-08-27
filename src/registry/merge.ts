/**
 * Combining icon sets that may overlap.
 *
 * Used three times over, which is why it is here and not inside any one of
 * them: the gallery merges the repo's registry with icons read from Postgres
 * (server side) and then with icons saved in this browser (client side), and
 * the composer's import picker merges the same way to build its grid.
 *
 * It lives in a plain module rather than in `useLocalIcons`, which carries
 * `"use client"` — a server component reaching into a client module for a pure
 * function is a boundary crossing with no reason to exist.
 *
 * THE BASE SET WINS A COLLISION. The repo's registry is the source of truth and
 * an id is never recycled (BACKLOG.md D), so a database or browser copy of an
 * id that is already published is the same icon, not a second one. Filtering
 * rather than concatenating is also what stops a collision from producing two
 * React children with the same key.
 */

import type { IconDef } from "@/engine/types";

export function mergeIcons(
  base: readonly IconDef[],
  extra: readonly IconDef[],
): readonly IconDef[] {
  if (extra.length === 0) return base;
  const taken = new Set(base.map((icon) => icon.id));
  const added = extra.filter((icon) => !taken.has(icon.id));
  // Identity back when nothing survives, so a caller holding this in a memo
  // does not re-render for a merge that changed nothing.
  return added.length === 0 ? base : [...base, ...added];
}
