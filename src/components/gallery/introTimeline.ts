/**
 * THE BOOT SEQUENCE'S CLOCK (2026-09-15). Every entrance on the hero reads its
 * start time from here, so the order (cold open, the grid powering on, sprites
 * rastering in, the title card) lives in one table rather than in forty
 * `animation-delay` values scattered through the stylesheet.
 *
 * THE SKELETON BLOCKS ARE GONE (same day, by request): dithered rectangles that
 * filled in before each piece of content. Without them nothing waits on a fill,
 * so the whole boot fits in a little over two seconds.
 *
 * THE TIMES ARE WRITTEN INTO THE MARKUP as `--at` on each element, which is
 * what lets the sequence start on first paint rather than after hydration: the
 * server sends the delays, the stylesheet runs them, and React arrives later to
 * add only the parts CSS cannot do (skip, replay, the score counter).
 *
 * STEPPED, NOT SMOOTH. `FRAME` is one frame of a 12fps display, and every
 * duration below is a whole number of them, so nothing lands between frames.
 */

/** One frame at 12fps. The sequence is authored in these, not in easing. */
export const FRAME = 83;

export const INTRO = {
  /** Cold open: a dark screen and a blinking cursor, then the grid powers on. */
  boot: 320,
  /** The level's sprites raster in, one row of cells per frame. */
  sprites: 620,
  spriteStagger: 110,
  /** The title card: the name types out of the cursor. */
  title: 900,
  /** The rest of the hero settles around it once the name has landed. */
  settle: 1400,
  settleStagger: 120,
  /** The last frame. The controller hands the hero back to its resting state. */
  end: 2200,
} as const;

/** `--at` for an inline style. */
export function at(ms: number): React.CSSProperties {
  return { "--at": `${ms}ms` } as React.CSSProperties;
}

/**
 * DECIDES BEFORE FIRST PAINT WHETHER THE BOOT PLAYS, and says so with one
 * attribute on <html>. Everything the sequence hides is hidden only under
 * `html[data-intro="play"]`, so the DEFAULT is the finished hero: no script,
 * a failed script, a crawler, or a reduced-motion visitor all get the page.
 *
 * IT PLAYS ON EVERY LOAD OF `/` (2026-09-15, by request). It was once per tab
 * for a pass, remembered in sessionStorage, and a refresh showing the finished
 * hero read as the boot being broken. Any key or press still skips it.
 *
 * Never under reduced motion. An automated browser skips it too, unless the
 * address carries `?intro`: forty tests that measure the hero should not each
 * wait out four seconds of choreography first.
 */
export const INTRO_INIT_SCRIPT = `
try {
  if (
    location.pathname === "/" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    (!navigator.webdriver || new URLSearchParams(location.search).has("intro"))
  ) {
    document.documentElement.setAttribute("data-intro", "play");
  }
} catch (e) {}
`;
