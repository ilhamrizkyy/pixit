import type { Metadata } from "next";
import Link from "next/link";
import { GridDiagram } from "@/components/GridDiagram";
import { IconPreview } from "@/components/IconPreview";
import { recolorCells } from "@/engine/color";
import {
  CANVAS_UNITS,
  GRID_SIZE,
  ICON_SIZES,
  SAFE_AREA_SIZE,
} from "@/engine/constants";
import { getIcon, icons } from "@/registry";

export const metadata: Metadata = {
  title: "Guide — Pixle",
  description: "How Pixle icons are built, and the rules every one of them follows.",
};

/**
 * The Guide.
 *
 * Structured as reading, not as a grid of equal cards — four same-size boxes
 * of heading-plus-text flatten every rule to the same weight and explain
 * nothing that the words alone would not.
 *
 * Instead each rule is SHOWN with the product's own material: a real grid
 * diagram, real icons at every size, real recoloring. Every number is read
 * from engine constants, so the page cannot drift from the geometry it
 * documents.
 */

const DEMO = getIcon("floppy-disk") ?? icons[0];
const SWATCHES = ["#111111", "#2b5bff", "#dc2626", "#16a34a"];

export default function GuidePage() {
  return (
    <div className="px-6 py-10 lg:px-8">
      <header className="mb-14 max-w-2xl">
        <h1 className="mb-4 text-h2">Guide</h1>
        <p className="prose-body text-text-muted">
          Every Pixle icon is the same shape underneath: {GRID_SIZE}×{GRID_SIZE}{" "}
          cells, one color, drawn to survive being shrunk to {ICON_SIZES[0]}px.
          This is what that means in practice — and it doubles as the style
          guide once contribution opens.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        <Rule
          title="The grid"
          body={
            <>
              An icon <em>is</em> its cells — {GRID_SIZE}×{GRID_SIZE} of them on
              a {CANVAS_UNITS}-unit viewBox, four units per cell. The grid is
              odd on purpose, so there is an exact centre column and row to be
              symmetrical about. SVG and PNG are generated from the cells; the
              cells are never generated from the SVG.
            </>
          }
          aside={<GridDiagram />}
        />

        <Rule
          title="The safe area"
          body={
            <>
              Art stays inside a {SAFE_AREA_SIZE}×{SAFE_AREA_SIZE} region, one
              cell in from every edge. {SAFE_AREA_SIZE} is the only inset that
              centres on an odd grid — a {SAFE_AREA_SIZE + 1}-wide area would
              leave a single cell of margin to split between two sides. The
              margin is a guide, not a fence: the composer will let you draw to
              the edge when a glyph needs it.
            </>
          }
        />

        <Rule
          title="One color"
          body={
            <>
              The gallery renders every icon in a single color you choose, so
              icons are drawn as <strong>outlines</strong> rather than filled
              masses. An envelope whose flap only exists as a lighter interior
              becomes a rectangle the moment one color is applied; an outlined
              one survives.
            </>
          }
          aside={
            <ul className="flex list-none flex-wrap items-center gap-3 p-0">
              {SWATCHES.map((color) => (
                <li
                  key={color}
                  className="flex size-16 items-center justify-center rounded-md bg-surface"
                >
                  <IconPreview
                    cells={recolorCells(DEMO.cells, color)}
                    size={32}
                    title={`${DEMO.name} in ${color}`}
                  />
                </li>
              ))}
            </ul>
          }
        />

        <Rule
          title="Sizing"
          body={
            <>
              Built for the 8-point scale, with {ICON_SIZES[0]}px as the floor.
              Cells stay square and on-grid at every size — padding grows the
              viewBox rather than scaling the art, so edges never soften.
            </>
          }
          aside={
            <ul className="flex list-none flex-wrap items-end gap-6 p-0">
              {ICON_SIZES.map((size) => (
                <li key={size} className="flex flex-col items-center gap-2">
                  <span className="flex h-12 items-end">
                    <IconPreview cells={DEMO.cells} size={size} />
                  </span>
                  <span className="font-data text-caption text-text-muted">
                    {size}
                  </span>
                </li>
              ))}
            </ul>
          }
        />

        <Rule
          title="Names"
          body={
            <>
              Ids, names, and tags are kebab-case, validated when the registry
              loads — a bad name fails the build rather than reaching the
              gallery. The name you read is the string you would paste into
              code.
            </>
          }
          aside={
            <ul className="flex list-none flex-col gap-1.5 p-0 font-data text-ui">
              {icons.slice(0, 4).map((icon) => (
                <li key={icon.id} className="flex items-center gap-3">
                  <IconPreview cells={icon.cells} size={16} />
                  <span className="text-text-muted">{icon.name}</span>
                </li>
              ))}
            </ul>
          }
        />
      </div>

      <footer className="mt-16 border-t border-border pt-6">
        <p className="prose-body text-ui text-text-muted">
          {icons.length} icons follow these rules today.{" "}
          <Link href="/" className="text-accent underline underline-offset-2">
            Browse the set
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

/**
 * One rule: prose on the left, the thing itself on the right. The asymmetric
 * two-column layout is what keeps this from collapsing back into equal cards —
 * the demonstration carries as much weight as the sentence.
 */
function Rule({
  title,
  body,
  aside,
}: {
  title: string;
  body: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,32rem)_1fr] lg:items-start lg:gap-12">
      <div>
        <h3 className="mb-2">{title}</h3>
        <p className="prose-body text-text-muted">{body}</p>
      </div>
      {aside && <div className="lg:pt-1">{aside}</div>}
    </section>
  );
}
