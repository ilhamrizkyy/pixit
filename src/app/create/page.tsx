import { notFound } from "next/navigation";
import { Composer } from "@/composer/Composer";
import { isComposerEnabled } from "@/lib/owner";

/**
 * The composer route — and the gate in front of it.
 *
 * THE CHECK LIVES HERE, IN THE SERVER COMPONENT, AND MUST STAY HERE. Moving it
 * into `middleware.ts` "so the page stays clean" would weaken it: Next.js
 * middleware has a documented bypass class (CVE-2025-29927 — a crafted
 * `x-middleware-subrequest` header skips the middleware chain outright), so
 * middleware is defence in depth at best and never the gate itself. A check in
 * the route runs for every request that reaches the route, however it arrived.
 *
 * Closed answers 404, not 403. A 403 confirms there is something here worth
 * being forbidden from; CLAUDE.md rule 1 asks that the composer not be
 * reachable, and not advertising it is the cheap half of that.
 *
 * No `metadata` export for the same reason — a title is a description of a
 * route the public must not know about, and no crawler will ever reach a page
 * that 404s for it.
 */

/**
 * The flag is read per request. Without this Next would prerender /create at
 * build time and freeze the build-time answer into a static page, so a build
 * made with the flag on would keep serving the composer long after the flag
 * came off.
 */
export const dynamic = "force-dynamic";

export default function CreatePage() {
  if (!isComposerEnabled()) notFound();

  return <Composer />;
}
