import type { Metadata } from "next";
import { PageMasthead } from "@/components/PageMasthead";
import { Row } from "@/components/Row";
import { SIZE_STOPS } from "@/engine/constants";
import { LICENSE_URL, REPO_URL } from "@/lib/site";
import { icons } from "@/registry";

export const metadata: Metadata = {
  title: "Resources · Pixit",
  description: "Ways to get the Pixit icon set and work with it.",
};

/**
 * Resources, modelled on how Lucide and Phosphor organise theirs: get the
 * icons, packages, design tools, learn, license.
 *
 * Status is stated on every row. Nothing here links to something that does not
 * exist yet — a "Planned" with no href is honest; a link to an empty GitHub
 * repo is not.
 *
 * TWO COLUMNS ON A WIDE WINDOW (2026-09-18). It was one column of bordered
 * boxes in the left half of the page, and the sections are short enough that
 * the whole directory fits in one screen when it is allowed to use the width.
 * The columns are `columns`, not a grid: the sections are a list of unequal
 * lengths and CSS columns balance them without anyone choosing which goes
 * where, which is what a grid would have hard-coded.
 */

type Resource = {
  label: string;
  detail: string;
  href?: string;
  status: "available" | "planned";
};

const SECTIONS: { title: string; blurb: string; items: Resource[] }[] = [
  {
    title: "Get the icons",
    blurb: "Every icon is downloadable individually today.",
    items: [
      {
        label: "Copy SVG",
        // "Select", not "open": nothing on the board opens. The icon loads into
        // the mini screen and the detail bar appears along the bottom of the
        // screen it is on.
        detail:
          "Select any icon and copy its markup. Colors are baked in, and the color, shape and size you are looking at travel with it.",
        href: "/",
        status: "available",
      },
      {
        label: "Download SVG or PNG",
        detail: `Transparent background, at any size on the ${SIZE_STOPS[0]} to ${SIZE_STOPS[SIZE_STOPS.length - 1]}px scale. The PNG snaps its cell edges to whole pixels, so nothing softens.`,
        href: "/",
        status: "available",
      },
      {
        label: "Full set archive",
        detail: "One download for every icon, SVG and PNG.",
        status: "planned",
      },
    ],
  },
  {
    title: "Packages",
    blurb:
      "Pixit is a static set for now. Packaging follows once the set is bigger.",
    items: [
      {
        label: "npm package",
        detail: "Tree-shakeable React components generated from the registry.",
        status: "planned",
      },
      {
        label: "Icon font",
        detail: "A web font build for projects that would rather not ship SVG.",
        status: "planned",
      },
      {
        label: "Sprite sheet",
        detail: "A single SVG sprite for referencing icons by id.",
        status: "planned",
      },
    ],
  },
  {
    title: "Design tools",
    blurb: "",
    items: [
      {
        label: "Figma library",
        detail: "The full set as a published Figma library.",
        status: "planned",
      },
    ],
  },
  {
    title: "Learn",
    blurb: "",
    items: [
      {
        label: "Guide",
        detail:
          "The grid, the safe area, one color, shape, sizing, and the rules every icon follows.",
        href: "/guide",
        status: "available",
      },
      {
        label: "Contribute",
        detail:
          "How icons will be submitted and curated, and what the repository takes today.",
        href: "/contribute",
        status: "available",
      },
    ],
  },
  {
    title: "License",
    blurb: "",
    items: [
      {
        label: "MIT",
        detail:
          "Free for personal and commercial use, with the copyright notice kept in the license file.",
        href: LICENSE_URL,
        status: "available",
      },
      {
        label: "Source on GitHub",
        detail: "The registry, the engine, and the specs the set is built to.",
        href: REPO_URL,
        status: "available",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageMasthead
        title="Resources"
        route="/resources"
        line={`Ways to get the set and work with it. ${icons.length} icons today, all MIT licensed.`}
      />

      <main className="pixl-article">
        <div className="pixl-columns">
          {SECTIONS.map((section) => (
            <section key={section.title} className="pixl-column-item">
              <h2>{section.title}</h2>
              {section.blurb && (
                <p className="pixl-article-blurb">{section.blurb}</p>
              )}

              <ul className="pixl-rows">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Row
                      label={item.label}
                      detail={item.detail}
                      href={item.href}
                      flag={item.status === "planned" ? "Planned" : undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
