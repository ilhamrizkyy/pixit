"use client";

import { rotationDegrees, type Orientation } from "@/engine/transform";

/**
 * Gallery-wide flip and rotate, applied to every icon at once.
 *
 * Notably absent: Stroke and Cap/Join. Both are stroke properties, and pixel
 * icons are filled rects with no strokes at all — there is nothing for them to
 * act on.
 */

type TransformControlsProps = {
  orientation: Orientation;
  onOrientation: (next: Orientation) => void;
};

export function TransformControls({
  orientation,
  onOrientation,
}: TransformControlsProps) {
  const degrees = rotationDegrees(orientation);

  return (
    <div className="mt-5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-caption text-text-muted">Transform</span>
        {degrees !== 0 && (
          <span className="font-data text-caption text-text-muted">
            {degrees}°
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        <ToolButton
          label="Flip horizontal"
          active={orientation.flipH}
          onClick={() =>
            onOrientation({ ...orientation, flipH: !orientation.flipH })
          }
        >
          <FlipHGlyph />
        </ToolButton>

        <ToolButton
          label="Flip vertical"
          active={orientation.flipV}
          onClick={() =>
            onOrientation({ ...orientation, flipV: !orientation.flipV })
          }
        >
          <FlipVGlyph />
        </ToolButton>

        <ToolButton
          label="Rotate 90° clockwise"
          active={degrees !== 0}
          onClick={() =>
            onOrientation({
              ...orientation,
              rotations: orientation.rotations + 1,
            })
          }
        >
          <RotateGlyph />
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex flex-1 items-center justify-center rounded-sm border py-2 transition-colors ${
        active
          ? "border-accent bg-accent-subtle text-accent-ink"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

/* Glyphs are inline so they carry currentColor and need no icon dependency. */

const SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function FlipHGlyph() {
  return (
    <svg {...SVG_PROPS}>
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="21"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
      <path d="M9 8 L5 12 L9 16" />
      <path d="M15 8 L19 12 L15 16" />
    </svg>
  );
}

function FlipVGlyph() {
  return (
    <svg {...SVG_PROPS}>
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
      <path d="M8 9 L12 5 L16 9" />
      <path d="M8 15 L12 19 L16 15" />
    </svg>
  );
}

function RotateGlyph() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3v4h-4" />
    </svg>
  );
}
