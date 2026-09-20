import Link from "next/link";
import type { ReactNode } from "react";

/**
 * THE MARQUEE OVER GUIDE, RESOURCES AND CONTRIBUTE (2026-09-18).
 *
 * It replaced the top nav bar, and the rule it replaced it with is simpler:
 * every page says its own name. The bar's version was "a page with a hero does
 * not need a bar", which was true of the home page and left the other three
 * carrying one — so a visitor crossed from a full-screen neon CRT to a white
 * document with a hairline bar, and the two read as different products.
 *
 * WHAT IT CARRIES is exactly what the bar did: the wordmark home, the four
 * destinations, and which one you are on. What it adds is the page's own name
 * at the size a page's name deserves, and one line saying what it is for. Both
 * were buried at the top of the article before, set at the same weight as the
 * sections under them.
 *
 * NO HAMBURGER, and that is a deletion rather than a port. The bar collapsed
 * four links behind a button below `lg` because they had to share one row with
 * a wordmark; the rail wraps instead, and four short words in the terminal face
 * fit on one line at 390px.
 *
 * IT IS A SERVER COMPONENT. `route` is passed in rather than read from
 * `usePathname`, because every page that mounts one already knows which page it
 * is, and a client boundary for that would be a hook to answer a constant.
 */

const LINKS = [
  { href: "/", label: "Icons" },
  { href: "/guide", label: "Guide" },
  { href: "/resources", label: "Resources" },
  { href: "/contribute", label: "Contribute" },
] as const;

type PageMastheadProps = {
  /** The page's name, printed in the pixel face. Uppercased by CSS. */
  title: string;
  /** One line under it: what this page is for. */
  line: ReactNode;
  /** This page's own href, so the rail can mark it. */
  route: (typeof LINKS)[number]["href"];
};

export function PageMasthead({ title, line, route }: PageMastheadProps) {
  return (
    <header className="pixl-masthead">
      <div className="pixl-masthead-rail">
        <Link href="/" className="pixl-masthead-mark">
          Pixit
        </Link>

        <nav aria-label="Pages">
          <ul className="pixl-masthead-links">
            {LINKS.map((link) => {
              const live = link.href === route;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={live ? "page" : undefined}
                    data-live={live ? "" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="pixl-masthead-say">
        {/* The cursor is the one thing on the marquee that moves, and it is what
            says the same machine drew this page and the home page. `aria-hidden`:
            it is punctuation for the eye, and the heading's accessible name must
            stay the page's name. */}
        <h1 className="pixl-masthead-title">
          <span className="pixl-masthead-title-text">{title}</span>
          <span aria-hidden="true" className="pixl-masthead-cursor" />
        </h1>
        <p className="pixl-masthead-line">{line}</p>
      </div>
    </header>
  );
}
