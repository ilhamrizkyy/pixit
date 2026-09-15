import Link from "next/link";

/**
 * THE FOOTER (2026-09-13), and it arrived with the top nav's removal rather
 * than beside it.
 *
 * With no navigation bar, a page needs a second place that carries every
 * destination — otherwise `/guide` is a room with one door, reachable from the
 * home page and leading nowhere but back. The reference does exactly this: no
 * nav, the links printed in the hero, and the same links repeated at the foot
 * of every page, with the project's own story beside them.
 *
 * IT SAYS WHO MADE IT AND UNDER WHAT LICENCE, which is the half a link row
 * cannot carry. An MIT icon set's licence is not fine print; it is the reason
 * somebody can use the thing.
 *
 * IT IS A SERVER COMPONENT. It reads no state and marks no active route: a
 * footer is a directory rather than a position indicator, and marking "you are
 * here" twice on one page is what the wordmark's accent was taken off for
 * (DESIGN.md §6).
 *
 * It does NOT invert with the icon colour, for the reason the hero does not —
 * the adaptive ground is scoped to the gallery region.
 */

const LINKS = [
  { href: "/", label: "Icons" },
  { href: "/guide", label: "Guide" },
  { href: "/resources", label: "Resources" },
  { href: "/contribute", label: "Contribute" },
] as const;

export function SiteFooter() {
  return (
    <footer className="pixl-footer">
      <div className="pixl-footer-body">
        <div className="pixl-footer-say">
          <p className="pixl-footer-mark">Pixit</p>
          <p className="pixl-footer-line">
            A pixel icon set drawn by <b>lovvfat</b>, with an in-browser
            composer that draws every icon on the same 11 by 11 grid.
          </p>
          <p className="pixl-footer-line">
            Free and open source under the <b>MIT licence</b>. Use it in
            anything, commercial work included, with no attribution required.
          </p>
        </div>

        <nav aria-label="Site" className="pixl-footer-nav">
          <ul className="pixl-footer-links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
          {/* No year. A copyright line that has to be edited every January is a
              line that will be wrong every January. */}
          <p className="pixl-footer-note">Made with square pixels.</p>
        </nav>
      </div>
    </footer>
  );
}
