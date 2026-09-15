import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P, VT323 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
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

// The homepage hero's terminal type, for its one sentence and its links.
// NOT PRELOADED: every other route would pay for a face it never draws. The
// @font-face is global, and a browser only fetches a face when something on the
// page asks for it, so the homepage downloads it on first use. The boot does
// not show that sentence until three seconds in, which is ample.
const terminal = VT323({
  variable: "--font-terminal",
  subsets: ["latin"],
  weight: "400",
  preload: false,
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
        <SiteNav />
        {children}
        {/* EVERY PAGE, INCLUDING THE ONE WITH NO NAV BAR. It is the second
            place each destination is printed, and on `/` it is the only one
            below the fold — see SiteNav for why the bar is dropped there. */}
        <SiteFooter />
      </body>
    </html>
  );
}
