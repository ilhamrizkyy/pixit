"use client";

import { useRef, useState } from "react";
import { CELL_STYLES, type CellStyle } from "@/engine/render";
import { SHAPE_LABELS, type GallerySettings } from "./settings";

/**
 * SHAPE — A THUMBWHEEL WITH THE VALUES PRINTED ON IT (2026-08-30).
 *
 * ONE OBJECT, not two. It was a mode list beside a ribbed wheel for a pass, and
 * that is a control and a picture of a control sitting next to each other: the
 * wheel turned, the list did not, and nothing about the pair said they were the
 * same part. The names are ON the drum now, and rolling it scrolls them past a
 * window — a thumbwheel switch, which is what a three-position selector with
 * its values written on it has always been.
 *
 * THE PAPER IS SMOOTH, AND IT BELONGS TO THE WINDOW. Each face carried its own
 * shaded plastic for a pass, and three panels each running the same crown-to-
 * foot ramp is a bump at every join — a drum built out of visible facets. Real
 * paper on a real drum has no texture to see, so the ONLY thing that can tell
 * you it is moving is the printing on it. The window paints one smooth cylinder
 * and the faces carry nothing but their word.
 *
 * That also retired the blank filler faces: they existed to cover the barrel
 * where no value was printed, and the barrel is the window's own surface now.
 *
 * SO THE MARK STOPPED MOVING. On a list the accent dash travels to whichever
 * row is live; on a drum it cannot, because the live value is simply the one
 * the window is showing. That is the difference between reading a list and
 * reading a dial.
 *
 * AND THEN THE MARK CAME OFF ALTOGETHER (2026-08-30). It lay on the paper, then
 * moved out onto the case — under the same glass, in the same shadow and on the
 * same curve as the printing it indexes was the wrong place for it — and then
 * went, because it was never what carried the selection. WHAT IS LIVE IS WHAT
 * IS TURNED TO THE FRONT: square on, centred, in the lit middle of the window,
 * with its neighbours clipped and curving out of the opening either side. A
 * mark beside that is a second thing saying the first thing.
 *
 * It also takes the last accent off the body's controls, which tightens §7
 * rather than breaking it: the size rail's marker is the ONE accent on the
 * chassis, and a second orange two pads above it competed with what that mark
 * exists to mean.
 *
 * THE GESTURE IS THE DRUM'S, AND IT HAS TO BE CLAIMED. This is the only drag
 * surface on the board with a WORD under the pointer, and a press on text is a
 * text selection before it is anything else — after which the browser offers to
 * drag the selection, so the control appears to come away from the panel
 * instead of rolling. `touch-action` was here; `user-select` and the native
 * drag were not, and the composer's slide-to-clear groove has carried both
 * since it was built. The third guard is in this file: a `click` that arrives
 * at the end of a real drag is not a choice, so it is swallowed.
 *
 * IT IS CSS 3D, NOT R3F, AND THERE ARE TWO REASONS — the second one decisive.
 *
 * The first is the window: a mesh renders form and never state, and the DOM
 * keeps the text and the whole accessibility tree (TECH-STACK.md). A drum whose
 * surface IS its text would have to bake the radio group's own labels into a
 * texture. The GRIP has no such problem — it carries nothing — so that argument
 * alone would leave it open.
 *
 * The second closes it: THE GALLERY DELIBERATELY DOES NOT SHIP THREE.
 * DESIGN.md §6 measured it — `/` loads 539KB of JS and `/create` 1419KB, of
 * which 861KB is three — and that is exactly why the body's colour knobs are
 * the CSS build on this route. Adding ~600KB to the public page for a
 * thumbwheel's shading is the trade that note exists to refuse.
 *
 * And the CSS build is not an approximation here. The ribs are real panels on a
 * `rotateX` cylinder, so the foreshortening toward the ends of the opening is
 * true perspective rather than a gradient imitating one — which is the cue that
 * was missing when the grip was a repeating-linear-gradient, at any number of
 * stops.
 *
 * DRAG UP GOES FORWARD, which is the opposite of the list it replaced and the
 * only honest mapping now: the values are on the surface, so pushing the
 * surface up brings the one BELOW it into the window. A list moves its
 * selection; a drum moves its content. It shipped inverted for a pass — index
 * order ran up the drum, so the reel scrolled backwards under the finger.
 *
 * ITS FACES FOLLOW THE FINGER. The value steps in detents — three of them — but
 * the drum is turned to where the pointer is while you drag, with no clock in
 * between to be wrong about, and settles onto the detent when you let go. Same
 * rule, and the same measured reason, as the size rail's marker.
 *
 * THE DRAG DOES NOT WRAP; THE KEYBOARD DOES. A drum with three detents has two
 * ends and you can feel them. Arrow keys keep the APG's wrapping, because there
 * the affordance is a radio group.
 *
 * THE ROWS CARRY WORDS, which reverses the rule the transport keys were held
 * to. That rule — "a shape control whose values are shapes has no business
 * spelling them out" — was written about a KEY: a play button does not say
 * "play", and a cap has one glyph's worth of room to say anything at all. A
 * drum is a printed scale, and a scale names its values. The cost is real: the
 * 2x2 glyph patches were drawn by the engine's own `cellNode`, so they could
 * never go stale against a geometry change, and a word can. `SHAPE_HINTS` is
 * what carries the shape's behaviour now, in the tooltip.
 *
 * The ENGINE KEEPS ITS OWN WORDS. `cells`, `CellStyle` and "solid / gap / dots"
 * are the data; Shape and Square / Inset / Round are what a person reads. The
 * map below is the only place the two vocabularies meet.
 */

const SHAPE_HINTS: Record<CellStyle, string> = {
  solid: "Cells fill edge to edge",
  gap: "Cells inset, so the grid shows between them",
  dots: "Cells inset and drawn as circles",
};

/**
 * The drum's geometry, shared with the stylesheet by name.
 *
 * `STEP_DEG` is the angle between two faces and `DRAG_PX` is how far you drag
 * to cross one. They are separate numbers because one is on the drum and the
 * other is on your finger — the CSS derives the cylinder's radius from the step
 * and the face height, so the two builds cannot disagree about the shape.
 */
const STEP_DEG = 30;
const DRAG_PX = 26;

/**
 * How far the pointer has to travel before the gesture counts as a turn.
 *
 * Below it a press-and-release is a CLICK on the face under the pointer, which
 * is how the window's live value is chosen with a mouse. Above it the trailing
 * `click` is swallowed: a drag that happens to end over a face did not choose
 * that face, and letting the click through would hand the drum's own result
 * back to whatever the finger was resting on.
 */
const DRAG_SLOP_PX = 3;

/**
 * The grip's ribs: one full turn of them, so it never runs out.
 *
 * 30 at 12 degrees is exactly 360, which is what lets the barrel spin as far as
 * anything asks without a seam coming round. They are `aria-hidden` and inert —
 * the grip is the part you take hold of, and the window beside it is what says
 * what you have got.
 */
const RIBS = Array.from({ length: 30 }, (_, i) => i);

/**
 * The order the values are PRINTED around the barrel, top to bottom.
 *
 * NOT the engine's order, and deliberately: `CELL_STYLES` is solid / gap / dots
 * because that is the data, and this is where a value SITS ON A DRUM. Square is
 * the default, so it is printed in the MIDDLE — a three-position wheel resting
 * at one end can only be turned one way, and the value you start on is the one
 * with nothing above it. In the middle both neighbours are half in the window
 * at rest, which is also what tells you there is more surface to turn to.
 *
 * The keyboard follows this rather than the engine, because ArrowDown has to
 * reach the value printed BELOW the live one — an arrow that skips past what
 * you can see is a group whose reading order and moving order disagree.
 */
const WHEEL: CellStyle[] = ["gap", "solid", "dots"];

/* CHECKED AT MODULE LOAD, the way the registry checks its names. This list is
   a REORDERING of the engine's, and the failure it guards against is silent:
   add a fourth cell style and the wheel would simply never print it, with every
   test that walks the wheel still passing on the three it knows about. */
if (
  WHEEL.length !== CELL_STYLES.length ||
  CELL_STYLES.some((style) => !WHEEL.includes(style))
) {
  throw new Error(
    `ShapeWheel: the drum prints ${WHEEL.join("/")} but the engine has ${CELL_STYLES.join("/")}`,
  );
}

type ShapeWheelProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
};

export function ShapeWheel({ settings, onSettings }: ShapeWheelProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  /** Whether the gesture that just ended actually turned the drum. */
  const dragged = useRef(false);
  const active = Math.max(
    WHEEL.findIndex((style) => style === settings.cellStyle),
    0,
  );

  /** The drum's live offset from its detent, in degrees, during a drag. */
  const [turned, setTurned] = useState<number | null>(null);

  const apply = (index: number) =>
    onSettings({ ...settings, cellStyle: WHEEL[index] });

  function select(index: number) {
    const next = (index + WHEEL.length) % WHEEL.length;
    apply(next);
    refs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight")
      select(active + 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      select(active - 1);
    else if (event.key === "Home") select(0);
    else if (event.key === "End") select(WHEEL.length - 1);
    else return;

    event.preventDefault();
  }

  /**
   * Turn the drum with the pointer, stepping the value at each detent.
   *
   * The angle written to `--turn` is `-active * STEP + turned`, and `turned` is
   * solved so the ABSOLUTE angle stays `-started * STEP + (travelled / DRAG) *
   * STEP` however many detents have gone by. Without that the drum jumps a
   * whole face at the moment the value changes, which is the thing following
   * the finger exists to prevent.
   *
   * DOWN GOES BACK. The values are printed on the surface, so pulling the
   * surface down brings what was above it into the window.
   */
  function onDrumDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const startY = event.clientY;
    const started = active;
    const last = WHEEL.length - 1;
    let landed = active;
    dragged.current = false;

    /* CAPTURE IS AN OPTIMISATION, NOT THE MECHANISM. The listeners are on the
       window, so the drag already survives the pointer leaving the housing;
       capture is what keeps the events retargeted here — which is also what
       sends the trailing `click` to the housing rather than to whichever face
       the finger came to rest on.
       
       It is attempted rather than assumed. `setPointerCapture` throws on an
       inactive pointer id and does not exist at all in jsdom, and it used to run
       BEFORE the listeners were attached — so a throw took the whole gesture
       with it and the drum simply would not turn. */
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Nothing to do: the window listeners below are the drag.
    }

    const move = (moved: PointerEvent) => {
      const travelled = moved.clientY - startY;
      if (Math.abs(travelled) > DRAG_SLOP_PX) dragged.current = true;
      const next = Math.min(
        last,
        Math.max(0, started - Math.round(travelled / DRAG_PX)),
      );
      if (next !== landed) {
        landed = next;
        apply(next);
      }
      // Never more than one face past either end: a drum you can keep turning
      // after it has stopped moving the value has come off its shaft.
      const floor = (started - last) * DRAG_PX - DRAG_PX;
      const ceiling = started * DRAG_PX + DRAG_PX;
      const held = Math.min(ceiling, Math.max(floor, travelled));
      setTurned((started - next) * STEP_DEG - (held / DRAG_PX) * STEP_DEG);
    };
    const end = () => {
      setTurned(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  return (
    /* NO LABEL, NO WRAPPER AND NO PAD (2026-08-30). The drum has its three
       values printed on it, so "Shape" above it was a caption for something
       already saying its own name — the same argument that took the "Colour"
       heading off the readout with H / S / L legended under its knobs. The
       accessible name is on the group, where a name belongs. The wrapper went
       with the label, since it existed to stack the two, and the pad went with
       the wrapper: a pad says "these belong together" (§5c), and one control
       has nothing to be grouped with. It stands on the case at the column's
       full width instead, which is where a switch on a device is mounted.

       THREE THINGS ACROSS THE PANEL, and they are three different KINDS of
       thing. The INDEX is printed on the case. The WINDOW is a cut through it,
       showing what is printed on the drum. The GRIP is a second cut, holding
       the knurled end of the same barrel — which is why the two openings share
       `--turn` rather than being a control and a picture of a control side by
       side. */
    <div
      className="pixl-thumb"
      data-turning={turned !== null}
      onPointerDown={onDrumDown}
      // Safari will still offer to drag an element out of the page even with
      // nothing selected under the pointer. This is the last of the three
      // guards; the other two are `user-select` and `touch-action` in the
      // stylesheet.
      onDragStart={(event) => event.preventDefault()}
    >
      {/* THE WINDOW — the cut through the panel — and the PAPER lying a
            wall's width below it. Two elements because a recess is read from
            the material AROUND the opening: a shadow painted onto the drum
            darkens the drum, which is how the mini screen was got wrong twice
            before it grew a real ring of chassis. */}
      <div className="pixl-thumb-window">
        <div className="pixl-thumb-paper">
          <div
            role="radiogroup"
            aria-label="Shape"
            onKeyDown={onKeyDown}
            className="pixl-drum-reel"
            data-turning={turned !== null}
            style={
              {
                "--turn": `${active * STEP_DEG + (turned ?? 0)}deg`,
              } as React.CSSProperties
            }
          >
            {WHEEL.map((style, index) => {
              const checked = index === active;
              return (
                <button
                  key={style}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  title={`${SHAPE_LABELS[style]}: ${SHAPE_HINTS[style]}`}
                  // Roving tabindex: the group is one Tab stop, arrows do the rest.
                  tabIndex={checked ? 0 : -1}
                  // A click that arrives at the end of a real drag is not a
                  // choice — the drum has already landed on its own detent.
                  onClick={() => {
                    if (!dragged.current) select(index);
                  }}
                  className="pixl-drum-face"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  {/* WRITTEN IN SENTENCE CASE AND PRINTED IN CAPITALS. The
                    uppercase is `text-transform`, so the accessible name stays
                    "Square" rather than "SQUARE" — a screen reader spelling out
                    a legend's styling is not what the legend says. There is no
                    `aria-label`: the face's own text is its name. */}
                  {SHAPE_LABELS[style]}
                </button>
              );
            })}
          </div>

          {/* THE GLASS COVER, and the drum's own curvature under it — painted
                last so both fall ACROSS the printing rather than under it. The
                specular band has a hard edge on purpose: a soft wash is a wash,
                and a boundary is the only thing that says there is a sheet of
                glass over the opening. */}
          <span aria-hidden="true" className="pixl-drum-glass" />
        </div>
      </div>

      {/* THE GRIP — the knurled end of the same barrel, turning on the same
            angle. Its ribs are REAL PANELS on a `rotateX` cylinder rather than
            a repeating gradient, which is the whole of why it reads as round:
            perspective foreshortens them toward the top and bottom of the
            opening on its own, and a gradient cannot do that at any number of
            stops. */}
      <span aria-hidden="true" className="pixl-thumb-grip">
        <span className="pixl-thumb-slot">
          <span
            className="pixl-thumb-barrel"
            data-turning={turned !== null}
            style={
              {
                "--turn": `${active * STEP_DEG + (turned ?? 0)}deg`,
              } as React.CSSProperties
            }
          >
            {RIBS.map((index) => (
              <span
                key={index}
                className="pixl-thumb-rib"
                style={{ "--i": index } as React.CSSProperties}
              />
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}
