"use client";

import { useComposer, useComposerStore } from "./ComposerProvider";
import { ToolGlyph, type ToolName } from "./ToolGlyph";
import { Callout } from "./Callout";
import { PillButton, ScopeButton, SubPanel } from "./ScopeControls";
import { selectCanRedo, selectCanUndo } from "./store";

/**
 * THE TOOLS, LAID OUT LIKE A HANDHELD (2026-09-19, by request).
 *
 * It was two routed columns of four identical wells flanking the CRT, which is
 * a RACK — the shape a rack of equals takes, and these are not equals. A GBA or
 * a PSP sorts the same number of controls by what they are FOR and gives each
 * group its own shape and its own place on the case:
 *
 *   THE BOTTOM ROW, two pills      Undo and Redo, flanking the clear slider.
 *                                  The only symmetric, opposite pair on the
 *                                  board, and the only one about the session
 *                                  rather than the drawing.
 *   THE RIGHT RAIL, four keys      Mirror, Flip H, Flip V and Rotate — every
 *                                  control that acts on the drawing, in one
 *                                  group, facing the colour rail across the
 *                                  screen.
 *
 * SYMMETRY IS THE RULE THIS LAYOUT IS BUILT ON (2026-09-19, by request), and it
 * is why the count is four. It was briefly Mirror alone on the left against a
 * triangle of three on the right — the asymmetry a handheld genuinely has,
 * where one large object faces several small ones — and on a square screen with
 * two equal rails it simply read as lopsided. Four keys one side, four fittings
 * the other, both rails the same width.
 *
 * THE WIDE MIRROR CAP WENT WITH IT. Its shape was the argument — a long cap
 * lying on the axis it mirrors about — and one cap of a different size in a
 * column of four is the thing that makes a column look wrong.
 *
 * There is no heading on either rail. DRAW and EDIT were naming two columns
 * that split one job in half; one group of four tools needs no word.
 *
 * GRID IS DELETED, not moved. A toggle that hides the mesh is a control for
 * making an 11x11 editor harder to use; see `Board.tsx`.
 *
 * THE EYEDROPPER LEFT THE CASE for the colour deck. It is the only tool here
 * that produces a COLOUR rather than acting on the drawing, and it belongs
 * beside the instrument that sets one — see `ColorReadout.tsx`.
 */

type Side = "left" | "right";

export type Tool = {
  name: ToolName;
  label: string;
  /** Terse form for the on-toy legend; the full label stays the a11y name. */
  caption: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/**
 * Every tool on the case, in reading order.
 *
 * Defined ONCE — the desktop picks its groups out by name and the compact strip
 * takes the lot, so neither can drift from the other. The eyedropper is NOT
 * here: it lives in the colour deck on every breakpoint, so listing it would
 * put a second control answering to "Pick color" in the strip.
 */
export function useTools(): Tool[] {
  const store = useComposerStore();
  const mirror = useComposer((s) => s.mirror);
  const canUndo = useComposer(selectCanUndo);
  const canRedo = useComposer(selectCanRedo);
  const act = store.getState();

  return [
    { name: "mirror", label: "Mirror", caption: "Mirror", title: "Mirror painting across the vertical center", pressed: mirror, onClick: () => act.toggleMirror() },
    { name: "flip-h", label: "Flip horizontally", caption: "Flip H", onClick: () => act.flipH() },
    { name: "flip-v", label: "Flip vertically", caption: "Flip V", onClick: () => act.flipV() },
    { name: "rotate", label: "Rotate 90° clockwise", caption: "Rotate", onClick: () => act.rotate() },
    { name: "undo", label: "Undo", caption: "Undo", disabled: !canUndo, onClick: () => act.undo() },
    { name: "redo", label: "Redo", caption: "Redo", disabled: !canRedo, onClick: () => act.redo() },
  ];
}

const byName = (tools: Tool[], name: ToolName): Tool => {
  const tool = tools.find((t) => t.name === name);
  if (tool === undefined) throw new Error(`no tool ${name}`);
  return tool;
};

/**
 * One history pill, for the bottom row.
 *
 * Rendered by `Composer` rather than here, because they flank the slider rather
 * than standing in either rail. Taken one at a time so the DOM order is the
 * visual order — Undo, slider, Redo — with no `order` reshuffling between what
 * the eye sees and what the keyboard walks.
 */
export function ToolPill({ side }: { side: Side }) {
  const tool = byName(useTools(), side === "left" ? "undo" : "redo");
  return (
    <PillButton
      label={tool.label}
      legend={tool.caption}
      disabled={tool.disabled}
      onClick={tool.onClick}
    />
  );
}

/**
 * The tool rail: four keys in a column, facing the colour rail.
 */
export function ToolColumn() {
  const all = useTools();

  return (
    <SubPanel className="scope-rail">
      {(["mirror", "flip-h", "flip-v", "rotate"] as const).map((name) => (
        <ToolControl key={name} tool={byName(all, name)} side="right" />
      ))}
    </SubPanel>
  );
}

/**
 * One tool, as whichever part of the control library fits it.
 *
 * Defined ONCE and used by both the case and the compact strip, so a tool
 * cannot be one kind of part on a desktop and another on a phone — which would
 * be two different claims about what it is.
 */
export function ToolControl({ tool, side }: { tool: Tool; side?: Side }) {
  const annotations = useComposer((s) => s.annotations);

  /* HELP MODE CARRIES THE FULL NAME, and that is the job it inherited from the
     reskin. Every control is silkscreened permanently now, so "show the names"
     is no longer something to switch on — what the panel cannot print is the
     WHOLE label, because `FLIP HORIZONTALLY` does not fit under a 36px well
     and `PICK` is not `Pick color (eyedropper)`. The callout gives the long
     form; the case keeps the short one.

     Only in the columns: the compact strip has no room either side, and its
     legends are already under every cap. */
  const annotation =
    annotations && side !== undefined ? <Callout side={side}>{tool.label}</Callout> : null;

  return (
    <ScopeButton
      label={tool.label}
      legend={tool.caption}
      title={tool.title}
      pressed={tool.pressed}
      disabled={tool.disabled}
      onClick={tool.onClick}
      annotation={annotation}
    >
      <ToolGlyph name={tool.name} />
    </ScopeButton>
  );
}
