import { Gallery } from "@/components/gallery/Gallery";
import { icons as seeded } from "@/registry";
import { mergeIcons } from "@/registry/merge";
import { fetchPublishedIcons } from "@/registry/remote";

/**
 * The public gallery. A server component, so the icons are in the HTML for
 * search engines and for the first paint.
 *
 * TWO SOURCES, AND THE REPO IS STILL ONE OF THEM. The seeds live in
 * `src/registry/icons.ts` and everything published since lives in Postgres.
 * Keeping the seeds in code is what keeps the MIT licence meaningful: someone
 * who clones Pixle gets a working icon set, not an empty shell that needs
 * somebody else's database to show anything. The registry also wins any id
 * collision, since it is the source of truth and an id is never recycled.
 *
 * `fetchPublishedIcons` never throws and returns `[]` when Supabase is absent,
 * unreachable, or paused — which on the free tier happens after a week of
 * inactivity. So the page degrades to the seeded set rather than to an error.
 */
export default async function IconsPage() {
  const published = await fetchPublishedIcons();
  return <Gallery icons={mergeIcons(seeded, published)} />;
}
