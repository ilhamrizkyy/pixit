"use client";

import { galleryColorFromInput } from "@/engine/color";
import {
  DEFAULT_ICON_SIZE,
  ICON_SIZES,
  PADDING_STEPS,
} from "@/engine/constants";
import { GRID_SIZE } from "@/engine/constants";
import { CELL_STYLES, DEFAULT_CELL_STYLE } from "@/engine/render";
import { IDENTITY_ORIENTATION } from "@/engine/transform";
import { CATEGORIES } from "@/engine/types";
import type { Category } from "@/engine/types";
import { TransformControls } from "./TransformControls";
import type { GallerySettings } from "./settings";

/**
 * The Display and Categories controls, shared by the desktop sidebar and the
 * mobile filter sheet.
 *
 * Deliberately stateless: it renders `settings` and reports every change up.
 * That is what lets the sheet hand it a DRAFT while the sidebar hands it the
 * live values — same controls, two commit models, one implementation.
 *
 * The color control is DISPLAY ONLY. One hex recolors every icon in the
 * gallery, the way Lucide's customizer works, and never touches stored icons.
 */

type GalleryControlsProps = {
  settings: GallerySettings;
  onChange: (next: GallerySettings) => void;
  /** Resolved color for the swatch — derived from whichever settings apply. */
  color: string;
  counts: Record<Category, number>;
  total: number;
  /**
   * Show the Display section's own Reset. The sheet hides it, since its footer
   * already offers a Reset covering everything — two resets in one panel is
   * one too many.
   */
  showSectionReset?: boolean;
};

const SIZE_MIN = ICON_SIZES[0];
const SIZE_MAX = ICON_SIZES[ICON_SIZES.length - 1];

export function GalleryControls({
  settings,
  onChange,
  color,
  counts,
  total,
  showSectionReset = true,
}: GalleryControlsProps) {
  const set = (patch: Partial<GallerySettings>) =>
    onChange({ ...settings, ...patch });

  const { colorText, size, padding, orientation, cellStyle, category } = settings;

  // Position of the fill along the track.
  const progress = ((size - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100;

  // What the field shows: the typed text, or the theme default when untouched.
  const fieldValue = (colorText ?? color).replace(/^#/, "");
  // Parse rather than compare strings — "#FF0000" is valid but not equal to
  // the normalized "#ff0000".
  const invalid =
    colorText !== null &&
    colorText.trim() !== "" &&
    galleryColorFromInput(colorText) === null;

  return (
    <>
      <section>
        <SectionHead title="Display">
          {showSectionReset && (
            <ResetButton
              onClick={() =>
                set({
                  colorText: null,
                  size: DEFAULT_ICON_SIZE,
                  padding: 0,
                  orientation: IDENTITY_ORIENTATION,
                  cellStyle: DEFAULT_CELL_STYLE,
                })
              }
            />
          )}
        </SectionHead>

        {/* ---- Color ------------------------------------------------------ */}
        <label
          htmlFor="icon-color"
          className="mb-2 block text-caption text-text-muted"
        >
          Color
        </label>

        <div
          className={`flex items-center gap-2 rounded-sm border bg-surface px-2 py-1.5 focus-within:border-accent ${
            invalid ? "border-danger" : "border-border"
          }`}
        >
          {/* The swatch is a native color input, so clicking it opens the OS
              picker while the text field stays the primary way in. */}
          <label
            className="size-5 shrink-0 cursor-pointer rounded-xs border border-border"
            style={{ backgroundColor: color }}
            title="Pick a color"
          >
            <input
              type="color"
              value={color}
              onChange={(event) => set({ colorText: event.target.value })}
              className="sr-only"
              aria-label="Pick a color"
            />
          </label>

          {/* The # and the digits form one string, so they sit flush with no
              gap between them — "#000000", not "# 000000". */}
          <div className="flex min-w-0 flex-1 items-center font-data text-ui text-text">
            <span aria-hidden="true">#</span>
            <input
              id="icon-color"
              type="text"
              inputMode="text"
              spellCheck={false}
              autoComplete="off"
              value={fieldValue}
              onChange={(event) => set({ colorText: event.target.value })}
              aria-invalid={invalid}
              className="w-full min-w-0 bg-transparent uppercase focus:outline-none"
            />
          </div>
          {colorText !== null && (
            <button
              type="button"
              onClick={() => set({ colorText: null })}
              aria-label="Reset to theme default"
              className="shrink-0 px-1 text-caption text-text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>

        {invalid && (
          <p className="mt-1.5 text-caption text-danger">
            Needs 3 or 6 hex digits.
          </p>
        )}

        {/* ---- Size ------------------------------------------------------- */}
        <div className="mt-6">
          <label
            htmlFor="icon-size"
            className="mb-1 block text-caption text-text-muted"
          >
            Size
          </label>

          {/* No value bubble: the tick labels below already show the current
              size, and the active one is highlighted. */}
          <div>
            <input
              id="icon-size"
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={8}
              value={size}
              onChange={(event) => set({ size: Number(event.target.value) })}
              className="pixl-range"
              style={{ "--fill": `${progress}%` } as React.CSSProperties}
            />

            <div className="mt-1 flex justify-between px-0.5">
              {ICON_SIZES.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => set({ size: step })}
                  className={`font-data text-caption transition-colors ${
                    size === step
                      ? "font-bold text-accent"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Padding ---------------------------------------------------- */}
        <div className="mt-5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-caption text-text-muted">Padding</span>
            {/* Reads out the resulting CANVAS, not the input number. "1" tells
                you nothing; "13×13" tells you the art keeps its size and the
                canvas grows around it. */}
            <span className="font-data text-caption text-text-muted">
              {GRID_SIZE + padding * 2}×{GRID_SIZE + padding * 2}
            </span>
          </div>
          <div className="flex gap-1.5">
            {PADDING_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => set({ padding: step })}
                aria-pressed={padding === step}
                className={`flex-1 rounded-sm border py-1.5 font-data text-caption transition-colors ${
                  padding === step
                    ? "border-accent bg-accent-subtle font-bold text-accent-ink"
                    : "border-border bg-surface text-text-muted hover:text-text"
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Cells ------------------------------------------------------ */}
        <div className="mt-5">
          <span className="mb-1 block text-caption text-text-muted">Cells</span>
          {/* Three treatments of ONE drawing, not three drawings: Gap and Dots
              inset a cell by the same amount and differ only in shape, so
              switching between them never looks like a change of zoom. */}
          <div className="flex gap-1.5">
            {CELL_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => set({ cellStyle: style })}
                aria-pressed={cellStyle === style}
                className={`flex-1 rounded-sm border py-1.5 font-data text-caption capitalize transition-colors ${
                  cellStyle === style
                    ? "border-accent bg-accent-subtle font-bold text-accent-ink"
                    : "border-border bg-surface text-text-muted hover:text-text"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Transform -------------------------------------------------- */}
        <TransformControls
          orientation={orientation}
          onOrientation={(next) => set({ orientation: next })}
        />
      </section>

      <section>
        <SectionHead title="Categories" />
        <ul className="flex list-none flex-col gap-0.5 p-0">
          <li>
            <CategoryButton
              label="All"
              count={total}
              active={category === "all"}
              onClick={() => set({ category: "all" })}
            />
          </li>
          {CATEGORIES.map((entry) => (
            <li key={entry.id}>
              <CategoryButton
                label={entry.label}
                count={counts[entry.id]}
                active={category === entry.id}
                onClick={() => set({ category: entry.id })}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function SectionHead({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      {/* Pixel face on the gallery's section eyebrows (DESIGN.md §4). NOT
          bolded: Press Start 2P ships a single weight, so `font-bold` would
          synthesise one and smear a face whose whole point is crisp edges.
          Tracking is modest for the same reason the wordmark's is — the face
          already carries a full-em advance, so `widest` reads as gappy. */}
      <h3 className="font-pixel text-caption tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-caption text-accent"
    >
      Reset
    </button>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-ui ${
        active
          ? "bg-accent-subtle font-bold text-accent-ink"
          : "text-text hover:bg-surface"
      }`}
    >
      <span>{label}</span>
      <span
        className={`font-data text-caption ${
          /* accent-INK, like its parent: this span sits on the same tint, and
             inheriting the rule only for the label while the count kept the
             base accent is exactly how one half of a control fails contrast
             while the other half passes. */
          active ? "text-accent-ink" : "text-text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
