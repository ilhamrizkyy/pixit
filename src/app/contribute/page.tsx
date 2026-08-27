import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute — Pixle",
  description: "Public contribution is planned for a future phase of Pixle.",
};

/**
 * Contribute shell. Describes the future flow WITHOUT offering any route into
 * the composer — the composer is owner-only, and this page is public. No link,
 * no button, no hint of a path.
 */
export default function ContributePage() {
  return (
    <div className="max-w-2xl px-8 py-10">
      <h1 className="mb-2 text-h2">Contribute</h1>
      <p className="prose-body mb-6 text-text-muted">
        Anyone will be able to compose an icon and submit it here, reviewed
        through curation before it joins the set. That flow is deferred to a
        later phase — for now the set is drawn and curated by hand.
      </p>
      {/* accent-hover, not accent: the base accent on its own tint is 4.44:1,
          which misses AA by a hair. The darker step clears it at 6.5:1. */}
      <p className="inline-block rounded-full bg-accent-subtle px-3.5 py-1.5 text-caption text-accent-ink">
        Coming soon
      </p>
    </div>
  );
}
