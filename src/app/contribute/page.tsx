import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/PageMasthead";
import { Row } from "@/components/Row";
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
    <>
      <PageMasthead
        title="Contribute"
        route="/contribute"
        line="How icons get drawn, sent and reviewed, and what the project takes today."
      />

      {/* THE SAME TWO-COLUMN RULE THE GUIDE USES (2026-09-18): the argument on
          the left, the thing itself on the right. Contribute was one narrow
          column down the left half of the window, which is the layout the Guide
          had already replaced — two article pages, two languages. */}
      <main className="pixl-article pixl-rules">
        <p className="prose-body text-text-muted">
          Pixit is {icons.length} icons drawn and curated by hand. Contributed
          icons will be drawn here too, in the browser, rather than sent as a
          pull request. That is a later phase and it opens to invited
          contributors first, so nothing below is live yet. Here is what it will
          look like, and what the project takes in the meantime.
        </p>

        <section className="pixl-rule">
          <div>
            <div className="pixl-heading-row">
              <h2>Drawing an icon</h2>
              {/* PRINTED, NOT A PILL — the same treatment Resources' "Planned"
                  takes, for the same reason: a tinted capsule was the one
                  rounded object on a site whose every radius is a named zero. */}
              <span className="pixl-row-flag">Not open yet</span>
            </div>
            <p className="prose-body text-text-muted">
              The rules an icon has to follow are already written, and they are
              the same ones every icon in the set was drawn to. If you want to
              know what contributing will ask of you, it is all in the{" "}
              <Link href="/guide" className="pixl-inline-link">
                Guide
              </Link>
              .
            </p>
          </div>

          {/* A numbered list rather than four boxes. These are STEPS in an
              order, and an ordered list is the element that says so. */}
          <ol className="pixl-steps">
            {STEPS.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true" className="pixl-step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pixl-step-body">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pixl-rule">
          <div>
            <h2>In the meantime</h2>
            <p className="prose-body text-text-muted">
              Requests and corrections are useful now and cost you nothing to
              make. A missing icon you keep reaching for is the most valuable
              thing you can send, because the set grows by what people actually
              need.
            </p>
          </div>
          <ul className="pixl-rows">
            <li>
              <Row
                label="Request an icon on GitHub"
                detail="Open an issue with what you need and where you would use it. Problems with an existing icon go in the same place."
                href={`${REPO_URL}/issues`}
              />
            </li>
          </ul>
        </section>

        <footer className="pixl-article-note">
          <h2>Supporting the work</h2>
          <p className="prose-body text-text-muted">
            Pixit is free and MIT licensed, and it stays that way. If it saves
            you an afternoon and you would rather say thanks with a coffee than
            a pull request, that will open alongside contribution.
          </p>
        </footer>
      </main>
    </>
  );
}
