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
 * There is no `images` binding for the same kind of reason — the icon set is
 * SVG generated from cell data, and the app imports `next/image` nowhere.
 */
export default defineCloudflareConfig();
