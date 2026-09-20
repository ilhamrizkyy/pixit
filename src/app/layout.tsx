import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P, VT323 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { INTRO_INIT_SCRIPT } from "@/components/gallery/introTimeline";
import "./globals.css";

// UI / display face. Locked to JetBrains Mono — see DESIGN.md §4.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Long-form prose in Guide / Resources.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Wordmark + h1/h2 only. Single weight; that is all it has.
const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
});

// The machine's own type: the hero's sentence and links, and every masthead's
// rail and strapline.
//
// PRELOADED AS OF 2026-09-18, and the reason it was not is what changed. It was
// the home page's face alone, so preloading it charged four other routes for
// something they never drew. The masthead put it on Guide, Resources and
// Contribute, where it is in the RAIL — the first thing at the top of the page,
// not a sentence three seconds into a boot — so a late-discovered face is a
// visible swap in the navigation on every load. Four of five routes draw it
// now; the fifth is the owner-only composer.
const terminal = VT323({
  variable: "--font-terminal",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Pixit: pixel icons and composer",
  description:
    "An open-source pixel, 32-bit, and arcade icon set with an in-browser composer. MIT licensed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* The font variables MUST sit on <html>, not <body>. Tailwind's @theme
       declares --font-display/-pixel/-body on :root, and a custom property's
       var() lookups resolve on the element that declares them — so a font var
       living one level down on <body> is invisible there, which invalidates
       the whole declaration and silently drops every face to the browser
       default. */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${inter.variable} ${pressStart2P.variable} ${terminal.variable}`}
    >
      <body>
        {/* NO PRE-PAINT THEME SCRIPT (2026-09-13). There was one, and it
            existed to read a stored preference back before first paint —
            without it the page rendered light and snapped to dark, which is
            worse than no dark mode at all. Nothing is stored any more: the
            theme is `prefers-color-scheme` alone, which the stylesheet applies
            at parse time, so there is no frame in which the wrong theme is
            painted and no script needed to prevent one. See lib/theme.ts. */}
        {/* THE BOOT DECIDES BEFORE FIRST PAINT (2026-09-15), which is why a
            pre-paint script is back after the theme one left. The homepage's
            arcade intro hides the hero's pieces only while <html> carries
            `data-intro="play"`, and that attribute has to be there before the
            first frame or the finished hero flashes and then vanishes to be
            typed back in. See introTimeline.ts for when it plays.

            FIRST CHILD OF <body>, for the reason the theme script was: React
            re-creates <head> children rather than hydrating them, and a script
            there is swapped for a <div> on the client. Here the server HTML
            and the React tree agree. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_INIT_SCRIPT }} />
        {/* NO NAV BAR, ON ANY ROUTE (2026-09-18). The home page dropped it on
            2026-09-13 under the rule "a page with a hero does not need a bar",
            which left Guide, Resources and Contribute carrying one — so a
            visitor crossed from a full-screen CRT to a white document with a
            hairline bar over it. Each of those three now opens on its own
            masthead, which prints every destination in the same place the
            hero's links sit, so there is nothing left for a bar to carry.
            See PageMasthead.tsx. */}
        {children}
        {/* EVERY PAGE. It is the second place each destination is printed, and
            below the fold it is the only one. */}
        <SiteFooter />
      </body>
    </html>
  );
}
