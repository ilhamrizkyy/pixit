/**
 * Published icons, read from Postgres (Supabase).
 *
 * NO SDK, ON PURPOSE. `@supabase/supabase-js` is a sizeable dependency whose
 * value is typed query building, realtime, storage and auth — and this app uses
 * none of those. It needs two HTTP calls against PostgREST: select the
 * published icons, and upsert one. `fetch` does that, runs natively on
 * Cloudflare Workers with nothing to polyfill, and keeps a lean repo lean.
 * Reach for the SDK if realtime or storage ever land.
 *
 * EVERY KEY HERE IS SERVER-ONLY. None is prefixed `NEXT_PUBLIC_`, so none is
 * inlined into the client bundle. The SECRET key bypasses RLS entirely and
 * must never reach a browser.
 *
 * Names follow the CURRENT dashboard, which issues `publishable` and `secret`
 * keys. Older projects call the same pair `anon` and `service_role`; both work
 * here, and `authHeaders` is what makes that true.
 *
 * Rows carry an ART MAP, the same shape the repo's registry is written in, so a
 * row maps to an `IconDef` through `cellsFromArt` — code that already exists and
 * is already tested. See supabase/schema.sql.
 */

import type { Category, IconDef } from "@/engine/types";
import { CATEGORIES } from "@/engine/types";
import { cellsFromArt, isKebabCase, type Palette } from "./authoring";

const TABLE = "icons";

export type IconRow = {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  art: string[];
  palette: Palette;
  author: string | null;
  status: string;
  created_at: string;
};

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((entry) => entry.id));

/**
 * One row to an `IconDef`, or `null` if the row is not one.
 *
 * RETURNS NULL RATHER THAN THROWING, which is the opposite of what the composer
 * does with an imported file — and deliberately so. An import is one drawing a
 * person just chose, so refusing it is a complete answer. This is the read path
 * behind the public gallery, where one hand-edited row throwing would blank the
 * homepage for everybody. A bad row is dropped and counted; the other 40 icons
 * still render.
 */
export function iconFromRow(row: IconRow): IconDef | null {
  if (!isKebabCase(row.id) || !isKebabCase(row.name)) return null;
  if (!CATEGORY_IDS.has(row.category)) return null;
  if (!Array.isArray(row.art)) return null;

  const tags = row.tags ?? [];
  if (!tags.every(isKebabCase)) return null;

  let cells;
  try {
    // Throws on a wrong row count, a short row, or a character with no palette
    // entry — the same validation the repo's icons pass at module load.
    cells = cellsFromArt(row.art, row.palette ?? {});
  } catch {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    tags,
    cells,
    author: row.author ?? "ilham",
    status: "published",
    createdAt: row.created_at,
  };
}

/** Rows to icons, dropping any that do not survive validation. */
export function iconsFromRows(rows: readonly IconRow[]): {
  icons: IconDef[];
  rejected: string[];
} {
  const icons: IconDef[] = [];
  const rejected: string[] = [];

  for (const row of rows) {
    const icon = iconFromRow(row);
    if (icon === null) rejected.push(String(row?.id ?? "<no id>"));
    else icons.push(icon);
  }

  return { icons, rejected };
}

type Credentials = { url: string; key: string };

/**
 * The headers a Supabase key travels in — and they differ by key ERA.
 *
 * Legacy `anon` / `service_role` keys are JWTs (they start `eyJ`), and the
 * long-standing pattern sends them as both `apikey` and `Authorization:
 * Bearer`. The current `sb_publishable_` / `sb_secret_` keys are NOT JWTs, and
 * Supabase documents that they may not be sent in `Authorization: Bearer` —
 * the `apikey` header alone is how they travel.
 *
 * Sending Bearer unconditionally is what would break a project created today,
 * and sending it never is what could fail to elevate an older service_role key.
 * So the era decides, and both work.
 */
export function authHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/**
 * Configuration, or `null` when Supabase is not set up.
 *
 * NULL IS A SUPPORTED STATE, not an error. The repo must clone, build, test and
 * deploy with no database at all — it is an MIT icon set, and a fork that
 * cannot run without someone else's Postgres is not open source. With no
 * credentials the gallery simply shows the icons in the repo.
 */
function credentials(key: string | undefined): Credentials | null {
  const url = process.env.SUPABASE_URL?.trim();
  const trimmed = key?.trim();
  if (!url || !trimmed) return null;
  return { url: url.replace(/\/+$/, ""), key: trimmed };
}

export function isRemoteConfigured(): boolean {
  return credentials(process.env.SUPABASE_PUBLISHABLE_KEY) !== null;
}

/**
 * Every published icon.
 *
 * NEVER THROWS. This runs while rendering the public gallery, so a database
 * that is unreachable, paused, or misconfigured has to degrade to "the icons in
 * the repo" rather than to an error page. Supabase's free tier pauses a project
 * after a week of inactivity, which makes this the expected path, not the
 * exotic one.
 */
export async function fetchPublishedIcons(): Promise<readonly IconDef[]> {
  const config = credentials(process.env.SUPABASE_PUBLISHABLE_KEY);
  if (config === null) return [];

  try {
    const response = await fetch(
      `${config.url}/rest/v1/${TABLE}?select=*&status=eq.published&order=created_at.asc`,
      {
        headers: authHeaders(config.key),
        /* BAKED AT BUILD TIME (2026-09-18). This read is what decides whether
           `/` is a static file or a Worker invocation, and it was `no-store` —
           so the home page, the one route almost all traffic lands on, was
           server-rendered on every request and reached across the network to
           Postgres before it could paint. Measured in the build's own route
           table: `ƒ /`, where every other public route was `○`.

           THE COMMENT IT REPLACED WAS RIGHT ABOUT A SITE THAT DOES NOT EXIST
           YET. It said the gallery must not serve a stale set after a publish,
           and there is no publish: RLS has no insert policy and the browser
           route is deliberately unbuilt (BACKLOG §H). The only way a row
           reaches this table is `npm run db:seed`, from the owner's own
           machine, which is the same machine a deploy comes from. So the set
           changes when the site is deployed, and baking it at build is not a
           staleness trade — it is the truth about how an icon actually ships
           today.

           WHAT MAKES THIS WRONG AGAIN, precisely, so it is re-decided rather
           than rediscovered: the day §H lands and a contributor can publish
           from the browser, this page has to update without a deploy. The
           answer then is `revalidatePath("/")` from the publish route, which
           needs an incremental cache configured in `open-next.config.ts` —
           see the note there, which is about exactly this. Changing this line
           back without that binding would only restore the per-request fetch.

           Next 16 does not cache `fetch` by default, so the opt-in is
           explicit (node_modules/next/dist/docs/01-app/02-guides/
           caching-without-cache-components.md). This project does not use
           Cache Components. */
        cache: "force-cache",
      },
    );

    if (!response.ok) {
      console.error(`Supabase read failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const { icons, rejected } = iconsFromRows((await response.json()) as IconRow[]);
    if (rejected.length > 0) {
      console.error(`Skipped ${rejected.length} malformed icon row(s): ${rejected.join(", ")}`);
    }
    /* THE BUILD SAYS WHAT IT BAKED. Now that this read decides the contents of a
       static page, a paused project is no longer a slow request that recovers on
       the next one — it is a deploy that ships without the published icons and
       stays that way until the next build. Supabase's free tier pauses after a
       week of inactivity, so that is the expected path rather than the exotic
       one, and the only thing standing between it and a silent wrong deploy is
       a line in the build log. A signal you have to remember to look for is not
       a signal, so success reports too: a missing line is as legible as an
       error. */
    console.log(`Pixit: baked ${icons.length} published icon(s) from Supabase.`);
    return icons;
  } catch (cause) {
    console.error("Supabase unreachable:", cause);
    return [];
  }
}

/**
 * Write one icon.
 *
 * SERVICE ROLE, so this bypasses RLS — there is no insert policy, by design.
 * It must only ever be called from a server context that has already
 * established the caller is the owner. The seed script qualifies because it
 * runs on the owner's own machine with the key in his own environment; a route
 * handler will qualify once the sign-in gate lands. An endpoint protected only
 * by `PIXLE_COMPOSER_ENABLED` would NOT qualify: that flag is per-deployment,
 * not per-person, so on a Worker with the composer switched on it would leave a
 * public write path.
 *
 * Insert, never upsert. An id is immutable once published and must never be
 * recycled, so a collision is an error to surface rather than an overwrite to
 * perform.
 */
export async function publishIcon(row: Omit<IconRow, "created_at"> & { created_at?: string }): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const config = credentials(process.env.SUPABASE_SECRET_KEY);
  if (config === null) return { ok: false, error: "Supabase is not configured." };

  try {
    const response = await fetch(`${config.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        ...authHeaders(config.key),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (response.status === 409) {
      return { ok: false, error: `"${row.id}" is already published.` };
    }
    if (!response.ok) {
      return { ok: false, error: `${response.status}: ${await response.text()}` };
    }
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "Unreachable." };
  }
}
