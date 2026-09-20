"use client";

import type { ReactNode } from "react";

/**
 * THE INSTRUMENT'S CONTROL LIBRARY (2026-09-19).
 *
 * Four parts: a panel region, a recessed pushbutton, a pill, and a printed
 * scale ring. The knobs are in `ScopeKnob.tsx`,
 * because they wrap a gesture and these do not.
 *
 * EVERY ONE OF THEM HAS A CONSUMER, and that is a rule rather than a
 * coincidence: DESIGN.md §2 records this project deleting tokens kept for
 * readers that did not exist, and a component library is the same defect at a
 * larger size.
 *
 * THE PADDLE SWITCH IS GONE (2026-09-19), and it is worth recording why rather
 * than only that. It existed for Mirror and Grid, the board's two latching
 * modes, on the argument that a mode wants a control whose POSITION reports it
 * because §5c's 1px sink is easy to miss. The argument was sound and the part
 * was not: at 28px the lever read as a blank white rectangle with no glyph on
 * it, so the two controls whose state you most needed to see were the two that
 * showed nothing. Grid was then deleted outright and Mirror became a wide cap,
 * which left the paddle with no consumer at all. What actually fixed the
 * state-legibility problem was making the latched cap read — it drops several
 * steps of value and loses its lit crown, and the press now lands on the first
 * frame instead of easing toward itself.
 *
 * WHAT MAKES THESE READ AS HARDWARE is §5c's three moves, applied on a dark
 * case rather than a light one: a raised face catches light along its top edge
 * and turns away at its foot; a recess is dark under its top lip and shows a
 * lit wall at the bottom; a press sinks about 1px and no further. The sides of
 * every recess are uneven, because the key is up and to the LEFT everywhere on
 * this object.
 */

/**
 * A region routed into the case.
 *
 * This is the instrument's grouping device and it replaces `.pixl-pad`'s job on
 * this route: the panel says THESE BELONG TOGETHER.
 *
 * IT NO LONGER PRINTS A HEADING (2026-09-19), and the prop is deleted rather
 * than left optional. Its own doc called a header non-optional, on the argument
 * that an unlabelled sub-panel is just a darker rectangle — which was true of
 * four unrelated controls in a column and is not true of any panel still on
 * this board. There are three: Mirror alone, the transform cluster, and the
 * colour deck. A group of one has nothing to head, three transforms read as a
 * set by sitting in a cluster, and the deck was already skipping its heading
 * because HUE / SAT / LUM and a window printed COLOR say it four times over.
 * DRAW and EDIT were naming COLUMNS, and there are no columns.
 */
export function SubPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`scope-panel ${className}`}>{children}</section>;
}

/**
 * A square pushbutton seated in a well, with its legend printed below it.
 *
 * THE WELL IS A SEPARATE ELEMENT FROM THE CAP, so the cap can sink on press
 * without the hole moving with it — the same construction the round tool
 * buttons used, which is the half of them worth keeping.
 *
 * THE LEGEND IS PRINTED ON THE PANEL, NOT ON THE CAP. A cap is 44px and the
 * pixel face has very wide advance widths, so "ROTATE" on the cap is either
 * illegible or forces the cap wider than the grid of wells allows. On the panel
 * it is silkscreen, which is what an instrument actually does.
 */
export function ScopeButton({
  label,
  legend,
  children,
  pressed,
  disabled,
  onClick,
  title,
  annotation,
}: {
  label: string;
  legend: string;
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  /** Help mode's callout, carrying the FULL name the silkscreen abbreviates. */
  annotation?: ReactNode;
}) {
  return (
    <span className="scope-switch scope-switch--anchored">
      <span className="scope-switch-well">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
          title={title ?? label}
          className="scope-switch-cap"
        >
          {children}
        </button>
      </span>
      <span aria-hidden="true" className="scope-legend">
        {legend}
      </span>
      {annotation}
    </span>
  );
}

/**
 * A START/SELECT PILL, on the bottom row beside the clear slider.
 *
 * Two consumers, Undo and Redo, and they are the reason the part exists: they
 * are the only pair on this board that is symmetric, opposite and about the
 * SESSION rather than the drawing.
 *
 * THEY WERE SHOULDERS FOR A DAY AND THE SHOULDERS ARE DELETED. L and R sit on
 * a handheld's top EDGE, which a front elevation can only show by cropping a
 * part behind the shell's corner sweep — four builds of that and it never
 * stopped looking like a mistake, because the thing being drawn is genuinely
 * not visible from the front. Start and Select are on the face, they are the
 * console's own long horizontal pills, and they sit exactly where these two
 * belong: on the bottom row, flanking the slider, away from the controls you
 * use while your eyes are on the screen.
 *
 * ITS LEGEND IS ON THE FACE, which is the one place on this instrument that
 * happens. §6's rule is that a cap cannot hold a word in the pixel face —
 * true of a round key and not of a pill four times as wide as it is tall.
 */
export function PillButton({
  label,
  legend,
  disabled,
  onClick,
}: {
  label: string;
  legend: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="scope-pill"
    >
      <span aria-hidden="true">{legend}</span>
    </button>
  );
}

/* THE INDICATOR LAMP IS DELETED (2026-09-19). It existed for the eyedropper,
   which was armed until used — a state no cap position could report. The
   eyedropper moved to the colour rail and reports `aria-pressed` on its own
   key, so the lamp lost its only consumer, and this file's own rule is that
   every part here has one. */

/**
 * The printed scale a knob turns against.
 *
 * TICKS ARE DRAWN, NOT TYPED. They are `<span>`s rotated about the knob's
 * centre rather than glyphs in a string, so the count and the sweep are numbers
 * this file owns and the ring stays crisp at any size — a dashed border or a
 * conic-gradient "ruler" antialiases every tick into a smear at the diagonals,
 * which is the one thing a printed scale must not do.
 *
 * IT SITS OUTSIDE THE KNOB, on the panel, which is what makes it a SCALE rather
 * than decoration on the part: the knob turns and the printing does not. That
 * is the same rule the old colour rings followed, and the reason they stood off
 * the dial rather than ringing it.
 */
export function ScaleRing({
  ticks = 11,
  sweep = 270,
  labels,
}: {
  ticks?: number;
  /** Degrees the printed arc covers, centred on twelve o'clock. */
  sweep?: number;
  /** Printed at the two ends of the arc. Omitted on the trim knobs. */
  labels?: [string, string];
}) {
  const start = -sweep / 2;
  const step = ticks > 1 ? sweep / (ticks - 1) : 0;

  return (
    <span aria-hidden="true" className="scope-scale">
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className="scope-scale-tick"
          /* Majors at both ends and the middle, minors between: a scale whose
             every mark is the same weight reads as a texture rather than as
             something you can take a reading off. */
          data-major={i === 0 || i === ticks - 1 || i === (ticks - 1) / 2}
          style={{ transform: `rotate(${start + i * step}deg)` }}
        />
      ))}
      {labels && (
        <>
          <span className="scope-scale-label" data-end="min">
            {labels[0]}
          </span>
          <span className="scope-scale-label" data-end="max">
            {labels[1]}
          </span>
        </>
      )}
    </span>
  );
}
