import Link from "next/link";
import type { ReactNode } from "react";
import { IconPreview } from "@/components/IconPreview";
import { getIcon } from "@/registry";

/**
 * ONE LINE OF A DIRECTORY — Resources' entries and Contribute's one live action
 * (2026-09-18).
 *
 * WHAT IT REPLACED, so it is not rebuilt: every item on both pages was a
 * bordered box with a tinted capsule in it, stacked down the left half of the
 * window. Fifteen identical boxes are the lazy container, and they were
 * measured — at 1440 the whole of Resources lived in 736px with 704px of white
 * beside it. A row is what a directory entry actually is, and rows can sit two
 * columns wide without pretending to be anything.
 *
 * THE MARK IS THE SET'S OWN ICON. A row that goes somewhere prints `arrow-right`
 * at its far end, or `external-link` when it leaves the site — remapped to
 * `currentColor`, the way the search field and the category chips already draw
 * theirs. An icon set that borrows somebody else's chevron for its own pages
 * has an argument to answer.
 */

/** The set's own glyph, inked from whatever it is sitting in. */
function Mark({ id }: { id: string }) {
  const icon = getIcon(id);
  if (icon === undefined) return null;
  return (
    <span className="pixl-row-mark">
      <IconPreview
        cells={icon.cells.map((cell) => (cell === null ? null : "currentColor"))}
        size={16}
      />
    </span>
  );
}

type RowProps = {
  label: string;
  detail: ReactNode;
  /** Absent means there is nowhere to send anyone: it renders as printing. */
  href?: string;
  /** A short printed fact about the row, such as "Planned". */
  flag?: string;
};

export function Row({ label, detail, href, flag }: RowProps) {
  const external = href !== undefined && href.startsWith("http");

  const body = (
    <>
      <span className="pixl-row-head">
        <span className="pixl-row-label">{label}</span>
        {flag !== undefined && <span className="pixl-row-flag">{flag}</span>}
        {href !== undefined && flag === undefined && (
          <Mark id={external ? "external-link" : "arrow-right"} />
        )}
      </span>
      <span className="pixl-row-detail">{detail}</span>
    </>
  );

  if (href === undefined) {
    return <div className="pixl-row">{body}</div>;
  }

  // next/link is for in-app routes; an external URL needs a plain anchor, and
  // noreferrer so the destination cannot see where the click came from.
  if (external) {
    return (
      <a className="pixl-row" href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return (
    <Link className="pixl-row" href={href}>
      {body}
    </Link>
  );
}
