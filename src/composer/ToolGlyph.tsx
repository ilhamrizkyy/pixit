/**
 * Glyphs for the eight tool buttons.
 *
 * UI chrome, deliberately NOT drawn on the 11x11 icon grid: these are stroked
 * marks on a domed cap, and a pixel glyph at 18px on a curved surface reads as
 * a smudge. The icon set stays the set; the toy's controls are the toy's.
 */

export type ToolName =
  | "mirror" | "grid" | "eyedropper" | "undo"
  | "flip-h" | "flip-v" | "rotate" | "redo";

const PATHS: Record<ToolName, React.ReactNode> = {
  mirror: (
    <>
      <path d="M8 2v12" strokeDasharray="2 2" />
      <path d="M6 5 3 8l3 3zM10 5l3 3-3 3z" />
    </>
  ),
  grid: (
    <>
      <path d="M2 2h12v12H2z" />
      <path d="M6 2v12M10 2v12M2 6h12M2 10h12" />
    </>
  ),
  eyedropper: <path d="M8 2.5c2.5 3 3.8 5 3.8 6.5a3.8 3.8 0 1 1-7.6 0c0-1.5 1.3-3.5 3.8-6.5z" />,
  undo: (
    <>
      <path d="M3 7h7a3 3 0 0 1 0 6H6" />
      <path d="M5.5 4.5 3 7l2.5 2.5" />
    </>
  ),
  redo: (
    <>
      <path d="M13 7H6a3 3 0 0 0 0 6h4" />
      <path d="M10.5 4.5 13 7l-2.5 2.5" />
    </>
  ),
  "flip-h": (
    <>
      <path d="M8 2v12" strokeDasharray="2 2" />
      <path d="M6.5 4 2.5 8l4 4zM9.5 4l4 4-4 4z" />
    </>
  ),
  "flip-v": (
    <>
      <path d="M2 8h12" strokeDasharray="2 2" />
      <path d="M4 6.5 8 2.5l4 4zM4 9.5 8 13.5l4-4z" />
    </>
  ),
  rotate: (
    <>
      <path d="M13 8a5 5 0 1 1-1.8-3.8" />
      <path d="M13 3v3.2h-3.2" />
    </>
  ),
};

export function ToolGlyph({ name }: { name: ToolName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
