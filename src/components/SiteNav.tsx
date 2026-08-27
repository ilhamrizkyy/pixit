"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Top nav (DESIGN.md §6): logo left, then Icons / Guide / Resources /
 * Contribute.
 *
 * Below `lg` the links collapse behind a hamburger. The theme toggle stays in
 * the bar rather than moving into the menu — it is small, and burying a
 * one-tap control behind two taps costs more than the space it saves.
 *
 * NOTE ON WHAT IS ABSENT. There is no "+ Create" entry and no Import control
 * here, and that is deliberate:
 *
 *   - Create is owner-only. The button arrives with the server-side auth gate
 *     in Phase 3, not before. Shipping a visible entry to a route that is not
 *     yet gated is exactly the failure CLAUDE.md rule 1 forbids.
 *   - Import is a composer action and belongs in the composer dock
 *     (BACKLOG.md B), not in the global nav where the prototype had it.
 */

const LINKS = [
  { href: "/", label: "Icons" },
  { href: "/guide", label: "Guide" },
  { href: "/resources", label: "Resources" },
  { href: "/contribute", label: "Contribute" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="border-b border-border">
      <div className="flex items-center justify-between gap-3 px-6 py-4 lg:px-7 lg:py-5">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="font-pixel text-body tracking-wider text-text no-underline"
        >
          Pix<span className="text-accent">le</span>
        </Link>

        <div className="flex items-center gap-3 lg:gap-5">
          <ul className="hidden list-none items-center gap-5 p-0 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`text-ui no-underline transition-colors hover:text-accent ${
                    isActive(link.href) ? "font-bold text-accent" : "text-text"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex size-10 items-center justify-center rounded-sm border border-border bg-surface text-text lg:hidden"
          >
            {menuOpen ? <CloseGlyph /> : <MenuGlyph />}
          </button>
        </div>
      </div>

      {/* Closing on click keeps the menu from lingering after navigation —
          the component stays mounted across route changes. */}
      {menuOpen && (
        <ul
          id="site-menu"
          className="list-none border-t border-border p-0 lg:hidden"
        >
          {LINKS.map((link) => (
            <li
              key={link.href}
              className="border-b border-border last:border-0"
            >
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block px-6 py-3.5 text-ui no-underline ${
                  isActive(link.href) ? "font-bold text-accent" : "text-text"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function MenuGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
