import type { Metadata } from "next";
import Link from "next/link";
import { GRID_SIZE } from "@/engine/constants";
import { REPO_URL } from "@/lib/site";
import { icons } from "@/registry";

export const metadata: Metadata = {
  title: "Contribute · Pixit",
  description:
    "How icons will be submitted and curated, and what Pixit takes today.",
};

/**
 * Contribute shell.
 *
 * IT DESCRIBES THE FUTURE FLOW AND OFFERS NO ROUTE INTO THE COMPOSER. The
 * composer is owner-only and this page is public, so there is no link, no
 * button and no hint of a path (CLAUDE.md rule 1). Public contribution is a
 * later phase; nothing here is wired.
 *
 * TWO KINDS OF CONTRIBUTION, AT DIFFERENT WEIGHTS. Drawing icons is what the
 * nav item means, so it is the page. Supporting the work is a note at the foot.
 * Two equal cards would say the two are the same size of thing, and they are
 * not: one is the reason this page exists and the other is a line of thanks.
 *
 * AND IT IS NOT A DEAD END. Both of those are parked, so the middle section is
 * the one that is true today: the repository already takes icon requests and
 * bug reports, with nothing left to build for it. A page whose only content is
 * "not yet" sends a willing person away with nothing to do.
 */

const STEPS = [
  `Draw it on the ${GRID_SIZE}x${GRID_SIZE} grid, in one color, inside the safe area.`,
  "Give it a kebab-case name, a category, and the tags you would search for.",
  "Send it. Every submission is reviewed before it joins the set, so the family stays coherent.",
  "It ships under MIT, like everything else here.",
];

export default function ContributePage() {
  return (
    <div className="max-w-2xl px-6 py-10 lg:px-8">
      <h1 className="mb-4 text-h2">Contribute</h1>
      <p className="prose-body mb-12 text-text-muted">
        Pixit is {icons.length} icons drawn and curated by hand. Contributed
        icons will be drawn here too, in the browser, rather than sent as a pull
        request. That is a later phase and it opens to invited contributors
        first, so nothing below is live yet. Here is what it will look like, and
        what the project takes in the meantime.
      </p>

      <section className="mb-12">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h3>Drawing an icon</h3>
          {/* accent-ink, not accent: the base accent on its own tint is 4.44:1,
              which misses AA by a hair. The darker step clears it at 6.5:1. */}
          <span className="rounded-full bg-accent-subtle px-3 py-1 text-caption text-accent-ink">
            Not open yet
          </span>
        </div>
        <p className="prose-body mb-6 text-text-muted">
          The rules an icon has to follow are already written, and they are the
          same ones every icon in the set was drawn to. If you want to know what
          contributing will ask of you, it is all in the{" "}
          <Link
            href="/guide"
            className="text-accent underline underline-offset-2"
          >
            Guide
          </Link>
          .
        </p>

        {/* A numbered list rather than four boxes. These are STEPS in an order,
            and an ordered list is the element that says so. */}
        <ol className="flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-px shrink-0 font-data text-caption text-text-muted tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="prose-body text-ui text-text-muted">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-12">
        <h3 className="mb-2">In the meantime</h3>
        <p className="prose-body mb-4 text-text-muted">
          Requests and corrections are useful now and cost you nothing to make.
          A missing icon you keep reaching for is the most valuable thing you
          can send, because the set grows by what people actually need.
        </p>
        <a
          href={`${REPO_URL}/issues`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border border-border bg-surface-2 px-4 py-3 no-underline transition-colors hover:border-accent"
        >
          <span className="text-ui text-text">Request an icon on GitHub</span>
          <p className="prose-body mt-1 text-caption text-text-muted">
            Open an issue with what you need and where you would use it.
            Problems with an existing icon go in the same place.
          </p>
        </a>
      </section>

      <footer className="border-t border-border pt-6">
        <h3 className="mb-2 text-ui">Supporting the work</h3>
        <p className="prose-body text-ui text-text-muted">
          Pixit is free and MIT licensed, and it stays that way. If it saves you
          an afternoon and you would rather say thanks with a coffee than a pull
          request, that will open alongside contribution.
        </p>
      </footer>
    </div>
  );
}
