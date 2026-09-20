import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers build config for the OpenNext adapter.
 *
 * DELIBERATELY EMPTY. The examples in the adapter's docs reach for an R2
 * incremental cache, but that caches ISR output and Pixit has no ISR: five of
 * six routes prerender at build time and `/create` is `force-dynamic` because
 * the owner gate must be re-read per request (src/app/create/page.tsx). Adding
 * a cache binding here would provision an R2 bucket for a cache with nothing to
 * put in it.
 *
 * THAT CLAIM WAS FALSE FOR A WHILE, AND IT WAS FIXED RATHER THAN REWRITTEN
 * (2026-09-18). The gallery's Supabase read carried `cache: "no-store"`, which
 * made `/` dynamic — so it was four of six prerendering, and the home page ran
 * a Worker and a network round trip on every hit. The read is `force-cache`
 * now and the sentence above is true again; see src/registry/remote.ts for why
 * baking the published set at build is the honest description of how an icon
 * ships today.
 *
 * WHAT WOULD CHANGE THIS FILE: browser publishing (BACKLOG §H). A contributor
 * publishing has to update `/` without a deploy, which means
 * `revalidatePath("/")` from the publish route, which is ISR, which is what an
 * incremental cache binding is for. Add it then, with that feature, not before.
 *
 * There is no `images` binding for the same kind of reason — the icon set is
 * SVG generated from cell data, and the app imports `next/image` nowhere.
 */
export default defineCloudflareConfig();
