"use client";

import { useComposer, useComposerStore } from "./ComposerProvider";
import { ToolGlyph, type ToolName } from "./ToolGlyph";
import { ToyButton } from "./ToyButton";
import { selectCanRedo, selectCanUndo } from "./store";

/**
 * The eight tools, in the two columns that flank the screen (DESIGN.md §6).
 * Left is the drawing aids plus Undo; right is the transforms plus Redo.
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
 * All eight, in order: the drawing aids and Undo, then the transforms and Redo.
 * Defined ONCE — the desktop columns take a half each and the compact strip
 * takes the lot, so neither can drift from the other.
 */
export function useTools(): Tool[] {
  const store = useComposerStore();
  const mirror = useComposer((s) => s.mirror);
  const gridGuide = useComposer((s) => s.gridGuide);
  const armed = useComposer((s) => s.eyedropperArmed);
  const canUndo = useComposer(selectCanUndo);
  const canRedo = useComposer(selectCanRedo);
  const act = store.getState();

  return [
    { name: "mirror", label: "Mirror", caption: "Mirror", title: "Mirror painting across the vertical centre", pressed: mirror, onClick: () => act.toggleMirror() },
    { name: "grid", label: "Grid guide", caption: "Grid", pressed: gridGuide, onClick: () => act.toggleGridGuide() },
    { name: "eyedropper", label: "Eyedropper", caption: "Pick", title: "Then tap a filled cell to take its colour", pressed: armed, onClick: () => act.armEyedropper() },
    { name: "undo", label: "Undo", caption: "Undo", disabled: !canUndo, onClick: () => act.undo() },
    { name: "flip-h", label: "Flip horizontally", caption: "Flip H", onClick: () => act.flipH() },
    { name: "flip-v", label: "Flip vertically", caption: "Flip V", onClick: () => act.flipV() },
    { name: "rotate", label: "Rotate 90° clockwise", caption: "Rotate", onClick: () => act.rotate() },
    { name: "redo", label: "Redo", caption: "Redo", disabled: !canRedo, onClick: () => act.redo() },
  ];
}

export function ToolColumn({ side }: { side: Side }) {
  const annotations = useComposer((s) => s.annotations);
  const all = useTools();
  const tools = side === "left" ? all.slice(0, 4) : all.slice(4);

  return (
    <div className="toy-rail flex shrink-0 flex-col justify-center gap-6">
      {tools.map((tool) => (
        <ToyButton
          key={tool.name}
          label={tool.label}
          title={tool.title}
          pressed={tool.pressed}
          disabled={tool.disabled}
          onClick={tool.onClick}
          caption={annotations ? tool.caption : undefined}
          calloutSide={side}
        >
          <ToolGlyph name={tool.name} />
        </ToyButton>
      ))}
    </div>
  );
}
