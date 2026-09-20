import type { Metadata } from "next";
import Link from "next/link";
import { GridDiagram } from "@/components/GridDiagram";
import { IconPreview } from "@/components/IconPreview";
import { PageMasthead } from "@/components/PageMasthead";
import { recolorCells } from "@/engine/color";
import { SHAPE_LABELS } from "@/components/gallery/settings";
import {
  CANVAS_UNITS,
  GRID_SIZE,
  ICON_SIZES,
  MAX_RENDERED_SIZE,
  SAFE_AREA_SIZE,
  SIZE_STOPS,
} from "@/engine/constants";
import { CELL_STYLES } from "@/engine/render";
import { getIcon, icons } from "@/registry";

export const metadata: Metadata = {
  title: "Guide · Pixit",
  description:
    "How Pixit icons are built, and the rules every one of them follows.",
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
    <>
      <PageMasthead
        title="Guide"
        route="/guide"
        line={`Every icon is the same shape underneath: ${GRID_SIZE} by ${GRID_SIZE} cells, one color, drawn to survive ${ICON_SIZES[0]}px.`}
      />

      <main className="pixl-article pixl-rules">
        <Rule
          title="The grid"
          body={
            <>
              An icon <em>is</em> its cells: {GRID_SIZE}×{GRID_SIZE} of them on
              a {CANVAS_UNITS}-unit viewBox, four units per cell. The grid is
              odd on purpose, so there is an exact center column and row to be
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
              centers on an odd grid, since a {SAFE_AREA_SIZE + 1}-wide area
              would leave a single cell of margin to split between two sides.
              The margin is a guide, not a fence: the composer will let you draw
              to the edge when a glyph needs it.
            </>
          }
          aside={
            <GridDiagram
              cells={DEMO.cells}
              caption={`${DEMO.name}, with one cell of margin on every side`}
            />
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
          title="Shape"
          body={
            <>
              Stored cells are always square. The gallery can draw them three
              ways, for the whole set at once: Fill uses each cell edge to
              edge, Inset leaves a gap so the grid shows between neighbors, and
              Round draws the same node as a circle. It is a display setting and
              never part of an icon, so the data stays square whatever you are
              looking at. What you see <em>is</em> what you copy: the color,
              the shape and the size on screen all travel with a copied or
              downloaded icon.
            </>
          }
          aside={
            <ul className="flex list-none flex-wrap items-end gap-6 p-0">
              {CELL_STYLES.map((style) => (
                <li key={style} className="flex flex-col items-center gap-2">
                  <span className="flex size-16 items-center justify-center rounded-md bg-surface">
                    <IconPreview
                      cells={DEMO.cells}
                      size={40}
                      cellStyle={style}
                      title={`${DEMO.name} drawn ${SHAPE_LABELS[style]}`}
                    />
                  </span>
                  <span className="font-data text-caption text-text-muted">
                    {SHAPE_LABELS[style]}
                  </span>
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
              Cells stay square and on-grid at every size, because the art is
              drawn from the grid rather than scaled to it, so edges never
              soften. The gallery&rsquo;s size scale runs from {SIZE_STOPS[0]}{" "}
              to {SIZE_STOPS[SIZE_STOPS.length - 1]}; the grid draws up to{" "}
              {MAX_RENDERED_SIZE}, and every stop above that sets the size of
              the file you export rather than the size of the tile you are
              looking at.
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
              loads, so a bad name fails the build rather than reaching the
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

      <footer className="pixl-article-note">
        <p className="prose-body text-ui text-text-muted">
          {icons.length} icons follow these rules today.{" "}
          <Link href="/" className="pixl-inline-link">
            Browse the set
          </Link>
          .
        </p>
      </footer>
      </main>
    </>
  );
}

/**
 * One rule: prose on the left, the thing itself on the right. The asymmetric
 * two-column layout is what keeps this from collapsing back into equal cards —
 * the demonstration carries as much weight as the sentence.
 *
 * THE TITLE IS AN `h2` (2026-09-18), which puts it in the pixel face. It was an
 * `h3` under a page `h1` — a skipped level, and the one register on the page
 * that said nothing about what product this is. §4 scopes Press Start 2P to the
 * wordmark, h1 and h2, and a rule's name is the largest thing in its section, so
 * it is exactly what that scope is for.
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
    <section className="pixl-rule">
      <div>
        <h2>{title}</h2>
        <p className="prose-body text-text-muted">{body}</p>
      </div>
      {aside && <div className="pixl-rule-aside">{aside}</div>}
    </section>
  );
}
