import type { Metadata } from "next";
import Link from "next/link";
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
 * exist yet — a "Coming soon" with no href is honest; a link to an empty
 * GitHub repo is not.
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
    <div className="max-w-3xl px-6 py-10 lg:px-8">
      <h1 className="mb-2 text-h2">Resources</h1>
      <p className="prose-body mb-10 text-text-muted">
        Ways to get the set and work with it. {icons.length} icons today, all
        MIT licensed.
      </p>

      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-1">{section.title}</h3>
            {section.blurb && (
              <p className="prose-body mb-4 text-ui text-text-muted">
                {section.blurb}
              </p>
            )}

            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {section.items.map((item) => (
                <li key={item.label}>
                  <ResourceRow item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ResourceRow({ item }: { item: Resource }) {
  const body = (
    <>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-ui text-text">{item.label}</span>
        {item.status === "planned" && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-caption text-text-muted">
            planned
          </span>
        )}
      </div>
      <p className="prose-body mt-1 text-caption text-text-muted">
        {item.detail}
      </p>
    </>
  );

  // Planned items are not links. There is nowhere to send anyone yet.
  if (item.href === undefined) {
    return (
      <div className="rounded-md border border-border bg-surface-2 px-4 py-3">
        {body}
      </div>
    );
  }

  const className =
    "block rounded-md border border-border bg-surface-2 px-4 py-3 no-underline transition-colors hover:border-accent";

  // next/link is for in-app routes; an external URL needs a plain anchor, and
  // noreferrer so the destination cannot see where the click came from.
  if (item.href.startsWith("http")) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {body}
    </Link>
  );
}
