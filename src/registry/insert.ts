/**
 * Inserting a drawn icon into the registry SOURCE TEXT.
 *
 * The published set is a typed module in the repo (CLAUDE.md), so publishing an
 * icon means editing `src/registry/icons.ts`. This module does that edit as a
 * pure string transform: text in, text out, no filesystem and no network. That
 * is what lets the same function serve the composer's Copy-entry action, the
 * GitHub publish flow, and a test — and it is the only piece of publishing that
 * can be verified without a token.
 *
 * IT INSERTS INTO THE RIGHT CATEGORY SECTION, not at the end of the array. The
 * file is organised under six `/* ---- category ---- *\/` headers and reviewed
 * as a diff; appending every new icon to the bottom would sort the set by
 * date-drawn, which is the one order nobody browses by. Placing the entry in
 * its section also keeps the diff to a single contiguous hunk.
 */

import { toRegistryEntry } from "./authoring";
import type { Cells, Category } from "@/engine/types";

export type RegistryDraft = {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  cells: Cells;
  /** ISO date. Supplied by the caller so the transform stays deterministic. */
  createdAt: string;
};

/**
 * The header that opens a category's run of icons. Matched rather than
 * constructed so the exact number of dashes — which is cosmetic alignment —
 * never has to agree between this file and the registry.
 */
function headerPattern(category: string): RegExp {
  return new RegExp(String.raw`^ {2}/\* -+ ${category} -+ \*/$`, "m");
}

/** The line that closes the `icons` array. */
const ARRAY_CLOSE = /^\];$/m;

/**
 * Insert `icon` into `source` and return the new file text.
 *
 * Throws rather than returning a partial result. Every failure here means the
 * registry is not shaped the way this function assumes, and writing a guess
 * into the file the whole gallery reads from is worse than refusing.
 */
export function insertIconEntry(source: string, icon: RegistryDraft): string {
  // An id is immutable once published (BACKLOG.md D), so a collision must never
  // reach the file. Checked against the source text rather than the imported
  // registry because the text is what is about to be committed — a stale import
  // would pass while the file already held the id.
  if (source.includes(`id: ${JSON.stringify(icon.id)}`)) {
    throw new Error(`"${icon.id}" is already in the registry`);
  }

  const header = headerPattern(icon.category).exec(source);
  if (header === null) {
    throw new Error(`No "${icon.category}" section in the registry`);
  }

  const sectionStart = header.index + header[0].length;

  // The section runs to the next header or to the end of the array, whichever
  // comes first. Searching the REMAINDER and offsetting keeps both matches
  // anchored after this header, so the last section terminates on `];`.
  const rest = source.slice(sectionStart);
  const nextHeader = /^ {2}\/\* -+ [a-z-]+ -+ \*\/$/m.exec(rest);
  const close = ARRAY_CLOSE.exec(rest);
  if (close === null) {
    throw new Error("No closing `];` after the icons array");
  }
  const sectionEnd =
    sectionStart +
    (nextHeader === null ? close.index : Math.min(nextHeader.index, close.index));

  const section = source.slice(sectionStart, sectionEnd);
  // Split the section into its entries and the whitespace that trails them, so
  // the entry lands after the last `}),` while the section's own spacing —
  // a blank line before the next header, none before `];` — is handed back
  // unchanged. Rebuilding that spacing from a rule is how a writer produces a
  // diff with an unrelated blank-line change in it.
  const body = section.replace(/\s*$/, "");
  const trailing = section.slice(body.length);
  const entry = toRegistryEntry(icon).replace(/\s*$/, "");

  const joined = body === "" ? `\n${entry}` : `${body}\n\n${entry}`;
  return source.slice(0, sectionStart) + joined + trailing + source.slice(sectionEnd);
}
