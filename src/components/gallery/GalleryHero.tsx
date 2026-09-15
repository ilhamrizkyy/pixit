"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { IconPreview } from "@/components/IconPreview";
import { getIcon } from "@/registry";
import { ICON_PANEL_ID } from "./GalleryToolbar";
import { HeroArt } from "./HeroArt";
import { IntroSlot } from "./IntroSlot";
import { FRAME, INTRO, at } from "./introTimeline";

/*
  DIRECTION CONTRACT (impeccable, 2026-09-15, second pass)
  THESIS: The homepage boots like an arcade cabinet: a cursor, the grid
  powering on, sprites rastering in, the name typing out. The resolved frame IS
  the hero.
  OWN-WORLD: Near-black CRT glass on an 11 by 11 cell grid, scanlines. Cyan is
  the system colour; the name is arcade yellow; orange and green are accents.
  No cyan-and-magenta split: that pairing read as a social app, not a cabinet.
  Press Start 2P for the name, VT323 for the sentence.
  STORY: A visitor watches the level load, reads PIXIT, hovers a sprite to see
  the 11 by 11 lattice it is drawn on, and scrolls down into the set.
  FIRST VIEWPORT: Left column: count tag, PIXIT at 96px with a block cursor,
  the sentence, two keys, two links. Right: two big icons bleeding off the
  screen and four small ones, each inspectable.
  FORM: brief-pinned (arcade intro spec, plus the owner's revisions).
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, DESIGN.md, and every shipping raster carrying its
  provenance.
*/

/* The destinations the nav bar used to carry. `/create` is deliberately absent
   and stays absent until contribution ships: CLAUDE.md rule 1 keeps the
   composer owner-only, and a visible entry to a route the public cannot reach
   is the exact failure that rule names. */
const LINKS = [
  { href: "/resources", label: "Resources" },
  { href: "/contribute", label: "Contribute" },
] as const;

const NAME = "Pixit";

const PLAY = getIcon("play")?.cells.map((cell) => (cell === null ? null : "currentColor"));

/**
 * The corner mark beside each utility link: down two cells, right two, and a
 * head built from stepped cells rather than a diagonal. `aria-hidden`: the link
 * beside it says where it goes.
 */
function Corner() {
  return (
    <svg
      aria-hidden="true"
      className="pixl-corner"
      viewBox="0 0 12 12"
      width="12"
      height="12"
    >
      <rect x="1" y="1" width="2" height="7" fill="currentColor" />
      <rect x="1" y="6" width="9" height="2" fill="currentColor" />
      <rect x="7" y="4" width="2" height="2" fill="currentColor" />
      <rect x="7" y="8" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

/** A target reticle at the screen's edge: a cross with its centre left out. */
function Reticle({ side }: { side: "l" | "r" }) {
  return (
    <svg
      aria-hidden="true"
      className="pixl-reticle"
      data-side={side}
      viewBox="0 0 14 14"
      width="14"
      height="14"
    >
      <rect x="6" y="0" width="2" height="4" fill="currentColor" />
      <rect x="6" y="10" width="2" height="4" fill="currentColor" />
      <rect x="0" y="6" width="4" height="2" fill="currentColor" />
      <rect x="10" y="6" width="4" height="2" fill="currentColor" />
    </svg>
  );
}

/**
 * EXPLORE SCROLLS; IT DOES NOT JUMP (2026-09-15). A bare `#icon-panel` link
 * teleports the page, which on a full-screen hero means one frame of neon and
 * the next of the gallery, with nothing to say the two are the same page.
 *
 * Eased by hand rather than with `behavior: "smooth"`, whose duration and curve
 * belong to the browser and differ between them. The time follows the distance
 * (§5b): about 700ms for one screen, capped so a tall window is not a wait. The
 * curve is ease-in-out, because this is travel between two places rather than a
 * surface arriving: it has to leave gently as well as land.
 *
 * Any wheel, touch or key during the flight hands the page straight back. A
 * scroll that fights the person scrolling is worse than the jump it replaced.
 */
function scrollToGallery(target: HTMLElement) {
  const from = window.scrollY;
  const to = target.getBoundingClientRect().top + from;
  const distance = to - from;
  const focus = () => {
    document.getElementById(ICON_PANEL_ID)?.focus({ preventScroll: true });
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, to);
    focus();
    return;
  }

  const duration = Math.min(1100, Math.max(520, Math.abs(distance) * 0.75));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const start = performance.now();
  let frame = 0;

  const cancel = () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + distance * ease(t));
    if (t < 1) {
      frame = window.requestAnimationFrame(step);
    } else {
      cancel();
      focus();
    }
  };
  frame = window.requestAnimationFrame(step);
}

type GalleryHeroProps = {
  /** How many icons the set actually holds, registry plus published rows. */
  count: number;
};

export function GalleryHero({ count }: GalleryHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  /* Everything a running boot has to tear down: its timer and listeners. */
  const stopRef = useRef<(() => void) | null>(null);

  /**
   * RUNS WHAT CSS CANNOT: the hand-back to the resting hero, and skipping.
   * `startedAt` is on the document timeline, the clock the CSS animations run
   * on, so a boot that began on first paint and was hydrated half a second
   * later still ends in step with it.
   */
  const drive = useCallback((startedAt: number) => {
    const root = document.documentElement;
    const now = () => Number(document.timeline?.currentTime ?? 0) - startedAt;

    const finish = () => {
      stopRef.current?.();
      stopRef.current = null;
      root.removeAttribute("data-intro");
    };

    if (now() >= INTRO.end) {
      finish();
      return;
    }

    const done = window.setTimeout(finish, INTRO.end - now());

    /* ANY key or press skips to the finished hero. It plays on every load now,
       so somebody who already knows what Pixit is must never wait for it,
       including a keyboard user whose first Tab lands on a key that has not
       wiped in yet. */
    const skip = (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        ["Shift", "Control", "Alt", "Meta"].includes(event.key)
      ) {
        return;
      }
      finish();
    };
    window.addEventListener("keydown", skip, true);
    window.addEventListener("pointerdown", skip, true);

    stopRef.current = () => {
      window.clearTimeout(done);
      window.removeEventListener("keydown", skip, true);
      window.removeEventListener("pointerdown", skip, true);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const hero = heroRef.current;
    if (hero === null) return;

    if (root.getAttribute("data-intro") === "play") {
      /* The boot's CSS animations started on first paint, so their start time
         is when the sequence began. Hydration comes later and must not reset
         it. */
      const running = hero.getAnimations({ subtree: true });
      drive(
        running.length > 0
          ? Number(running[0].startTime ?? 0)
          : Number(document.timeline?.currentTime ?? 0),
      );
    }

    /* THE LOOPS PAUSE OFF-SCREEN. The cursor, the sprites' idle and the CRT
       flicker are ambient, and ambient motion nobody can see is only battery. */
    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            hero.toggleAttribute("data-offscreen", !entry.isIntersecting);
          });
    watch?.observe(hero);

    return () => {
      watch?.disconnect();
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [drive]);

  const explore = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const gallery = document.querySelector<HTMLElement>(".pixl-gallery");
    // A modified click keeps the browser's own meaning (a new tab, say).
    if (
      gallery === null ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    scrollToGallery(gallery);
  };

  const settle = (step: number) => INTRO.settle + step * INTRO.settleStagger;

  return (
    <header
      ref={heroRef}
      className="pixl-hero"
      style={
        {
          "--f": `${FRAME}ms`,
          "--boot": `${INTRO.boot}ms`,
        } as React.CSSProperties
      }
    >
      <span aria-hidden="true" className="pixl-crt-roll" />
      <Reticle side="l" />
      <Reticle side="r" />
      <HeroArt />

      <div className="pixl-hero-body">
        <IntroSlot
          resolve={settle(0)}
          className="pixl-hero-tag"
        >
          <p>{count} icons / MIT licensed</p>
        </IntroSlot>

        {/* THE TITLE CARD. The cursor is on screen from the very first frame,
            blinking where the name will start, and the name types out of it.
            It is the one element present for the whole boot, which is what
            makes this read as one sequence rather than as a loader followed by
            a page. */}
        <IntroSlot
          resolve={INTRO.title}
          className="pixl-hero-title"
        >
          <h1 className="pixl-hero-mark" style={at(INTRO.title)}>
            <span className="pixl-hero-mark-text">{NAME}</span>
            <span
              aria-hidden="true"
              className="pixl-hero-cursor"
              style={{ "--chars": NAME.length } as React.CSSProperties}
            />
          </h1>
        </IntroSlot>

        <IntroSlot
          resolve={settle(1)}
          className="pixl-hero-line"
        >
          <p>
            An open-source pixel icon set, drawn cell by cell on an 11 by 11
            grid. Free to use anywhere, in any project, forever.
          </p>
        </IntroSlot>

        <IntroSlot
          resolve={settle(2)}
          className="pixl-hero-keys"
        >
          <div className="pixl-hero-keyrow">
            <a
              className="pixl-hero-key is-primary"
              href={`#${ICON_PANEL_ID}`}
              onClick={explore}
            >
              <span className="pixl-hero-key-face">
                {PLAY && <IconPreview cells={PLAY} size={16} />}
                Explore icons
              </span>
            </a>
            <Link className="pixl-hero-key" href="/guide">
              <span className="pixl-hero-key-face">Read the guide</span>
            </Link>
          </div>
        </IntroSlot>

        <IntroSlot
          resolve={settle(3)}
          className="pixl-hero-linkslot"
        >
          <ul className="pixl-hero-links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Corner />
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </IntroSlot>
      </div>
    </header>
  );
}
