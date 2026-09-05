"use client";

import { useRef, useState } from "react";
import { MAX_RENDERED_SIZE, SIZE_STOPS } from "@/engine/constants";

/**
 * THE SIZE SCALE — a Braun tuning scale, in two orientations.
 *
 * THREE PARTS ON THE RAIL, and only one of them is the control: a GROOVE cut
 * into the chassis, a SCALE printed on its floor — the numbers, with a
 * graduation between each pair — and the MAGNIFIER riding in the channel over
 * them. The first pass was a groove with a fill and the ticks underneath, which
 * is a slider wearing hardware rather than the hardware itself. The second
 * deleted the groove and lost the one part that says where the marker travels.
 *
 * THE SCALE MOVED INTO THE CHANNEL ON 2026-08-29, and the arm went with it.
 * The numbers were engraved on the panel OUTBOARD of a narrow groove, so the
 * marker had to be two mouldings — a blade to sit in the slot and a lens to sit
 * over the numbers, bridged across a gap. Widening the channel until the scale
 * fits inside it removes the gap, and with the gap the arm: the magnifier is
 * simply in the groove, on top of the thing it magnifies, which is what a
 * magnifier on a scale is.
 *
 * A GRADUATION FLANKS ITS NUMBER — an arm in from each wall of the channel,
 * with the number in the break between them: `—— 24 ——`. That is what a mark
 * and its label are on any printed scale, and it is what putting the scale in
 * the groove made possible; with the numbers outboard the marks had nothing to
 * flank. Stacking them above and below was tried first and read as rows rather
 * than as a scale: a rule lying between two numbers is a divider.
 *
 * MAJOR AND MINOR. Every stop keeps a major pair and its number; a shorter
 * minor pair sits at each halfway point. The minors are printed only — the
 * control steps in 8s and always will. That is what a graduated scale is: the
 * marks between the numbers tell you how far along you are, and the detents
 * decide where you land.
 *
 * VERTICAL IS THE REAL ONE. It stands on the board's right edge — the one side
 * of the chassis carrying nothing — and runs the screen's full height, which is
 * what buys a scale long enough for fourteen stops.
 *
 * THE BAR IS THE PHONE'S, AND IT KEEPS THE OLD BUILD. Not an oversight: the
 * magnifier needs its neighbours far enough apart to sit between them, and a
 * 390px sheet puts the printed stops ~40px apart against a lens that has to be
 * ~44px wide to frame a magnified "120". So the bar keeps its numbers under the
 * groove and a slim marker riding in it, and the sheet's own label carries the
 * exact value. The bar was already the divergent build for exactly this reason
 * — it prints every other number because fourteen collide on a phone.
 *
 * IT TRAVELS ON THE COMPOSITOR, NOT IN DETENTS. The value steps in 8s, so a
 * marker positioned straight from the value teleports the whole gap between two
 * stops — measured, 14 jumps of 55px with not one frame in between across a
 * 660ms drag, which is what "glitchy" was. The stepping is right and stays; what
 * was missing is that a real pointer TRAVELS to its next detent.
 *
 * So the position rides a `translate` on a wrapper the size of the lane, where
 * `--fill` is the value's fraction and `-100%` of the wrapper's own height is
 * exactly the lane's. That keeps it a transform — animatable off the main
 * thread — where `bottom: X%` would relayout the element on every frame.
 *
 * AND ITS CLOCK HAS TWO MODES, because this control has two jobs and one curve
 * cannot do both.
 *
 * A SINGLE MOVE — an arrow key, a click at the far end of the rail — wants to
 * land softly, so it takes `--ease-smooth-out` on a duration that follows the
 * distance (§5b): a detent ~112ms, a full sweep ~325ms. Measured against the
 * 55px detent, one fixed clock served neither end: at 260ms a fast drag trails
 * a whole detent behind the finger, at 90ms a long throw snaps instead of
 * travelling.
 *
 * A DRAG IS NOT A SEQUENCE OF MOVES AT ALL, and two passes were spent learning
 * it. Animating each detent with `--ease-smooth-out` stutters: that curve
 * covers ~80% of its distance in the first third, which is ideal once and a
 * burst-then-crawl when it restarts every 45ms — measured, velocity swinging
 * ±80% of its own mean with peaks 3x the average. Going LINEAR and matching the
 * duration to the pace of the incoming values fixed the spikes (0.80 to 0.36)
 * and left something worse behind: 15 frames of DEAD STOP inside one drag,
 * about one per detent, because a duration chosen from the previous gap is a
 * lagging guess at the next one, and every guess that comes in short is a
 * standstill under a finger that is still moving.
 *
 * SO THE MARKER FOLLOWS THE POINTER, and stops being animated at all while you
 * are dragging it. The value keeps stepping in 8s — the detents are the point —
 * but the pointer goes exactly where your finger is, at exactly your finger's
 * speed, with no clock in between to be wrong about. On release it settles into
 * the detent it landed nearest, which is the one move in the whole gesture that
 * IS a move, and gets the soft curve.
 *
 * That is also what the object does: a pointer on a detented scale sits under
 * your finger while you drag it and drops into the notch when you let go.
 *
 * THE MARKER IS A DOM ELEMENT, NOT THE NATIVE THUMB. A magnifier is a frame
 * with a hole in it, and a `::-webkit-slider-thumb` cannot be one. So the thumb
 * is kept — sized, transparent, and still the drag target — and this is drawn
 * over it. The two cannot drift: the marker sits in a lane inset by exactly
 * half a thumb, which is the same box the ruler and the numbers use, so all
 * three are positioned by the same arithmetic.
 */

type SizeScaleProps = {
  size: number;
  onSize: (size: number) => void;
  orientation: "vertical" | "horizontal";
  /** Unique per mount: the board and the filter sheet both render one. */
  id: string;
};

/**
 * The marker's travel clock, in ms: its floor, and what a full sweep adds.
 *
 * Derived from measurement, not taste — see the note above. The floor is what a
 * single detent gets (~112ms once the distance is added), which keeps the mean
 * follow-lag on a fast drag near a third of a detent.
 */
const TRAVEL_FLOOR_MS = 95;
const TRAVEL_SPAN_MS = 230;

/** The drop into the detent when a drag ends. At most half a detent of travel. */
const SETTLE_MS = 160;

const MIN = SIZE_STOPS[0];
const MAX = SIZE_STOPS[SIZE_STOPS.length - 1];
const STEP = SIZE_STOPS[1] - SIZE_STOPS[0];

/** Where a stop sits along the travel, 0 at the scale's start. */
const fraction = (stop: number) => (stop - MIN) / (MAX - MIN);

/**
 * The halfway points between stops — one fewer than there are stops.
 *
 * The rail's whole ruler, and the bar's minors. Printed only: the control
 * cannot land here, and a ruler does not promise it can.
 */
const MIDPOINTS = SIZE_STOPS.slice(0, -1).map((stop) => stop + STEP / 2);

export function SizeScale({ size, onSize, orientation, id }: SizeScaleProps) {
  const vertical = orientation === "vertical";

  /* Set HERE rather than derived during render, so the new clock and the new
     position land in one commit — React batches the two updates, and a duration
     applied a render late would animate the move that already happened. */
  const [travelMs, setTravelMs] = useState(TRAVEL_FLOOR_MS);
  const change = (next: number) => {
    const distance = Math.min(1, Math.abs(fraction(next) - fraction(size)));
    setTravelMs(Math.round(TRAVEL_FLOOR_MS + distance * TRAVEL_SPAN_MS));
    onSize(next);
  };

  /**
   * Where the POINTER is, while one is down and has moved. Null the rest of the
   * time, when the marker simply sits on its value.
   */
  const [pointerFill, setPointerFill] = useState<number | null>(null);
  const lane = useRef<HTMLSpanElement>(null);

  /*
   * THE PRESS ALONE DOES NOT START A FOLLOW — the first MOVE does. A click on
   * the rail is a press and a release with nothing in between, and the value it
   * sets should travel there on the soft curve like any other single move. Were
   * the follow to start on the press, a click would snap the marker across the
   * rail with no motion at all: the exact defect this whole thing is fixing,
   * reintroduced by the fix.
   */
  const beginFollow = () => {
    let followed = false;
    const track = (event: PointerEvent) => {
      const box = lane.current?.getBoundingClientRect();
      if (box === undefined) return;
      followed = true;
      const along = vertical
        ? (box.bottom - event.clientY) / box.height
        : (event.clientX - box.left) / box.width;
      setPointerFill(Math.min(1, Math.max(0, along)));
    };
    const end = () => {
      setPointerFill(null);
      /* ONLY IF A DRAG ACTUALLY HAPPENED. A click is a press and a release, and
         the press already started a long glide toward wherever it landed —
         stamping the settle clock on the release would rewrite that transition
         mid-flight and cut the travel short. There is nothing to settle from
         when nothing was followed. */
      if (followed) setTravelMs(SETTLE_MS);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    /* ON THE WINDOW, not the input. A range does not take implicit pointer
       capture, so a drag that wanders off the rail — which every drag does at
       the ends — would otherwise stop being heard halfway through. */
    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  // The travel runs UP on the rail and RIGHT in the sheet, so a stop is
  // anchored from opposite edges. Two properties rather than one and a sign
  // flip, because a percentage from the wrong edge looks right at 50%.
  const at = (value: number) =>
    vertical
      ? { bottom: `${fraction(value) * 100}%` }
      : { left: `${fraction(value) * 100}%` };

  /* The two halves of a graduation. Real elements rather than one rule with a
     transparent middle, so each arm has a box that can be measured — which is
     how the major and the minor are told apart. */
  const arms = vertical ? (
    <>
      <i className="pixl-groove-arm" />
      <i className="pixl-groove-arm" />
    </>
  ) : null;

  return (
    <div className={vertical ? "pixl-rail" : "pixl-bar"}>
      {/* THE GROOVE COMES FIRST, and the scale is printed on its floor. The
          numbers used to lead because they were the label for the channel
          beside them; they are inside it now, so they follow the surface they
          are printed on and paint over it without needing a stacking order. */}
      <span className="pixl-groove">
        <span aria-hidden="true" className="pixl-groove-ruler">
          {/* A GRADUATION FLANKS ITS NUMBER on the rail — one arm in from each
              wall of the channel, with the number in the break between them.
              The bar's numbers are outboard, so there is nothing in its groove
              to flank and its mark stays a single stroke across it. */}
          {SIZE_STOPS.map((stop) => (
            <span key={stop} className="pixl-groove-tick" style={at(stop)}>
              {arms}
            </span>
          ))}
          {MIDPOINTS.map((point) => (
            <span
              key={point}
              className="pixl-groove-tick is-minor"
              style={at(point)}
            >
              {arms}
            </span>
          ))}
        </span>
      </span>

      {/* THE RAIL PRINTS EVERY STOP; THE BAR PRINTS EVERY OTHER. Fourteen
          numbers fit comfortably up 600px of rail and collide on 300px of
          phone, where `104112120` ran together as one word — so the bar thins
          them and its section label carries the exact value instead. */}
      <span aria-hidden="true" className="pixl-scale-marks">
        {SIZE_STOPS.filter((_, index) => vertical || index % 2 === 0).map(
          (stop) => (
            <span
              key={stop}
              /* UNDER THE GLASS. The lens does not print a number of its own —
                 it enlarges the one already printed on the floor, which is what
                 a magnifier does and the only honest way to get the effect: the
                 thing being magnified has to be the thing that is there. */
              className={`pixl-scale-mark${vertical && stop === size ? " is-under" : ""}`}
              style={at(stop)}
            >
              {stop}
            </span>
          ),
        )}
      </span>

      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={size}
        onChange={(event) => change(Number(event.target.value))}
        onPointerDown={beginFollow}
        className="pixl-range"
        aria-label="Size"
        /* THE BREAK IS ANNOUNCED, NOT DRAWN. The grid's seat is a fixed 64px,
           so 48 is the largest art it can draw and every stop above it sets the
           exported FILE's size instead. DESIGN.md §6 and INTERACTION.md §6 both
           say the region "is still announced (`aria-valuetext`); it is not
           drawn" — and it was not announced either, so a screen-reader user
           dragging from 48 to 120 heard fourteen size changes and never learned
           the picture had stopped changing at the fifth. */
        aria-valuetext={
          size > MAX_RENDERED_SIZE
            ? `${size} pixels, export size only`
            : `${size} pixels`
        }
      />

      {/* THE MARKER, over the input and deaf to the pointer — the input under
          it is the drag target, and a marker that swallowed the press would
          leave the control ungrabbable at exactly the place you reach for. */}
      <span aria-hidden="true" className="pixl-marker-lane" ref={lane}>
        <span
          className="pixl-marker-slide"
          data-following={pointerFill !== null}
          style={
            {
              "--fill": pointerFill ?? fraction(size),
              "--duration-marker": `${travelMs}ms`,
            } as React.CSSProperties
          }
        >
          {/* ON THE RAIL THIS IS THE MAGNIFIER — a frame riding IN the channel,
              directly over the scale printed on its floor. It was a blade in a
              narrow slot bridged to a lens over an outboard number column; the
              channel is wide enough to hold the scale now, so the bridge, and
              the two-part moulding it forced, are gone.

              THE LENS IS EMPTY, AND HAS TO BE. It framed a copy of the value on
              a lit white plate for a pass, and a magnifier that prints its own
              number is not a magnifier — it is a badge. A real one shows what is
              UNDER it, so this one is a hole: the groove floor and the number
              printed on it show through, and mid-travel between two stops the
              window shows the bare floor that is actually there.

              The bar's marker is the slim lozenge — see the note at the top. */}
          <span className="pixl-marker">
            {vertical && <span className="pixl-marker-lens" />}
          </span>
        </span>
      </span>
    </div>
  );
}
