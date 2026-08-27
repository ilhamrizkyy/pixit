#!/usr/bin/env node
/**
 * The Cloudflare build, with the owner gate forced shut and then VERIFIED shut.
 *
 * WHY THIS SCRIPT EXISTS. The OpenNext adapter reads `.env` files at build time
 * and bakes what it finds into `.open-next/cloudflare/next-env.mjs`, which the
 * worker loads into `process.env` at runtime. A developer machine has
 * `.env.local` with `PIXLE_COMPOSER_ENABLED=true` — that is the whole point of
 * that file — so a plain `opennextjs-cloudflare build` run here ships a bundle
 * carrying `true`.
 *
 * That is not the same risk Vercel has. On Vercel the build runs on their
 * machine from the git checkout, where `.env.local` does not exist, and an
 * unset variable means the gate is closed. On Cloudflare the documented
 * workflow is `wrangler deploy` FROM YOUR OWN MACHINE, and a Worker with no
 * variable set falls through to the baked value. Measured: with the flag absent
 * from the Worker, `/create` returned 200 and served the composer.
 *
 * A dashboard variable DOES win when it is present — `false` there closes the
 * gate over a baked `true`. So this is recoverable, not fatal. But CLAUDE.md
 * rule 1 says the composer must never be publicly reachable, and a rule that
 * depends on someone remembering to set a variable is not a rule, it is a
 * hope. So: force it closed in the build, then read the artifact back and
 * refuse to continue if it is not.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FLAG = "PIXLE_COMPOSER_ENABLED";
const SERVICE_KEY = "SUPABASE_SECRET_KEY";
const BAKED = ".open-next/cloudflare/next-env.mjs";

/** The gate's own rule, restated. Only an explicit `true` opens it. */
const opens = (value) => String(value ?? "").trim().toLowerCase() === "true";

/**
 * What must not survive into the bundle, and why.
 *
 * The composer flag would make /create public. The service-role key bypasses
 * RLS on every table — it is the one credential that can rewrite the icon set,
 * and it lives in `.env.local` because `npm run db:seed` needs it. Neither
 * belongs in a build artifact, and both get there by default.
 */
const FORBIDDEN = [
  {
    name: FLAG,
    bad: opens,
    why:
      "A Worker deployed from this bundle would serve /create to the public\n" +
      "  whenever the variable is not set on the Worker itself.\n" +
      "  CLAUDE.md rule 1: never ship a publicly reachable composer.",
  },
  {
    name: SERVICE_KEY,
    // ANY value is wrong here, not just a particular one.
    bad: (value) => String(value ?? "").trim() !== "",
    why:
      "That key bypasses row level security on every table. It belongs in\n" +
      "  .env.local for `npm run db:seed` and nowhere near a deployed bundle.\n" +
      "  Writes reach Postgres from your machine, never from the Worker.",
  },
];

/**
 * `--verify-only` checks an existing bundle without rebuilding it.
 *
 * There so the CHECK can be tested apart from the STRIPPING. Those are two
 * separate guarantees and a script that only ever runs them together will
 * happily report success from a bundle it just sanitised, which proves nothing
 * about whether it can spot a bad one.
 */
if (!process.argv.includes("--verify-only")) {
  // Explicit values in the environment outrank `.env.local`, which is what lets
  // this neutralise both without touching the developer's files.
  execFileSync("npx", ["opennextjs-cloudflare", "build"], {
    stdio: "inherit",
    env: { ...process.env, [FLAG]: "false", [SERVICE_KEY]: "" },
  });
}

const baked = readFileSync(BAKED, "utf8");
let failed = false;

for (const { name, bad, why } of FORBIDDEN) {
  const found = [...baked.matchAll(new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`, "g"))]
    .map((match) => match[1])
    .filter(bad);

  if (found.length > 0) {
    failed = true;
    console.error(`\n✘ ${name} is baked into ${BAKED}.\n  ${why}\n`);
  }
}

if (failed) process.exit(1);

console.log(
  `\n✔ ${FLAG} is not open and ${SERVICE_KEY} is not present — the bundle is safe to deploy.`,
);
