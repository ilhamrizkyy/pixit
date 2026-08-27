/**
 * The owner gate in front of the composer.
 *
 * CLAUDE.md rule 1 is the project's first non-negotiable: the public browses
 * the gallery, only the owner reaches the composer. Phase 3 replaces this with
 * a real identity check (BACKLOG.md G); until then a server-only flag keeps the
 * rule true in every environment the app is deployed to — including preview
 * deployments, whose URLs are public.
 *
 * ON CLOUDFLARE THE FLAG CAN ARRIVE FROM THE BUNDLE, NOT ONLY THE ENVIRONMENT.
 * The OpenNext adapter bakes `.env` files in at build time, so an unset Worker
 * variable falls through to whatever the build machine had. That is handled at
 * BUILD time by scripts/build-cloudflare.mjs rather than here — this function
 * reads `process.env` and cannot tell where the value came from, which is
 * exactly why the guard has to sit where the bundle is produced.
 *
 * SERVER-ONLY, by convention. The npm `server-only` package makes a client
 * import fail at build time, but it is a dependency this slice does not need,
 * so the runtime assertion below is the honest substitute: importing this from
 * a "use client" file throws loudly instead of quietly answering `false` and
 * leaving someone to debug a composer that never opens.
 *
 * The variable name deliberately carries NO `NEXT_PUBLIC_` prefix. That prefix
 * is precisely what tells Next to inline a value into the client bundle, where
 * every visitor can read it. Adding one here would publish the gate's state.
 */

/**
 * The flag's name. Exported so the docs and tests name it once rather than
 * retyping a string that has to match.
 */
export const COMPOSER_ENV_VAR = "PIXLE_COMPOSER_ENABLED";

/**
 * The only value that opens the gate. Compared after trimming and lowercasing,
 * which forgives `TRUE` or a trailing space in a hand-edited `.env` without
 * widening what counts as consent: "", "false", "0" and every other value
 * still read as closed.
 */
const OPT_IN = "true";

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      `${COMPOSER_ENV_VAR} is server-only. Something imported @/lib/owner into a client component; the composer gate must be evaluated on the server.`,
    );
  }
}

/**
 * Whether the composer route may render at all. Closed unless the flag is an
 * explicit opt-in — an unset, empty, or misspelled variable must never be the
 * thing standing between the public and the composer.
 *
 * `process.env.PIXLE_COMPOSER_ENABLED` is read as a static property on purpose.
 * Next only guarantees substitution for statically written keys; a computed
 * `process.env[name]` can come back undefined outside the Node runtime, and a
 * gate that reads undefined in production would fail closed silently, which is
 * safe but impossible to diagnose.
 */
export function isComposerEnabled(): boolean {
  assertServer();
  return process.env.PIXLE_COMPOSER_ENABLED?.trim().toLowerCase() === OPT_IN;
}
