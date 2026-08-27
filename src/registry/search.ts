/**
 * Matching icons against a typed query.
 *
 * Lives here rather than inside the gallery because the composer's import
 * picker searches the same set by the same rule, and a match rule that exists
 * in two copies is a match rule that will be changed in one of them.
 *
 * Plain substring matching over name and tags (INTERACTION.md §6). At this size
 * fuzzy search surfaces noise rather than help; Fuse.js is queued for when the
 * set actually grows (TECH-STACK.md).
 */

import type { IconDef } from "@/engine/types";

export function searchIcons(
  icons: readonly IconDef[],
  query: string,
): readonly IconDef[] {
  const needle = query.toLowerCase().trim();
  // Returns the SAME array when there is nothing to filter, so callers holding
  // it in a memo do not re-render on every keystroke that clears the field.
  if (needle === "") return icons;

  return icons.filter(
    (icon) =>
      icon.name.toLowerCase().includes(needle) ||
      icon.tags.some((tag) => tag.toLowerCase().includes(needle)),
  );
}
