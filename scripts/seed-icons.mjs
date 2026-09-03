#!/usr/bin/env node
/**
 * Push the repo's seed icons into Postgres.
 *
 * Run once, after creating the table (supabase/schema.sql):
 *
 *     npm run db:seed
 *
 * WHY THE SEEDS GO IN AT ALL, when the gallery already reads them from the
 * repo: so the database holds the whole published set, not just the part added
 * after it existed. Anything reading Postgres alone — a future package build, a
 * sprite sheet, an API — then sees a complete set. The gallery still merges the
 * repo's copy first, so seeding is additive and re-running it changes nothing.
 *
 * It reads the registry by BUNDLING it with esbuild rather than parsing the
 * file. `icons.ts` is TypeScript with a path alias and its own load-time
 * validation, and the point of seeding from it is to get exactly what the app
 * gets — a regex over the source would be a second, weaker loader.
 */

import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_ = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY?.trim();

if (!URL_ || !KEY) {
  console.error(
    "\n✘ SUPABASE_URL and SUPABASE_SECRET_KEY must both be set.\n" +
      "  Put them in .env.local — `npm run db:seed` reads it.\n",
  );
  process.exit(1);
}

const dir = await mkdtemp(join(tmpdir(), "pixit-seed-"));
const entry = join(dir, "entry.ts");
const bundle = join(dir, "registry.mjs");

try {
  await writeFile(
    entry,
    `export { icons } from "@/registry/icons";\nexport { cellsToArt } from "@/registry/authoring";\n`,
  );
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    // The same alias tsconfig gives the app, so the bundle is the app's registry
    // and not a lookalike.
    alias: { "@": new URL("../src", import.meta.url).pathname },
    logLevel: "silent",
  });

  const { icons, cellsToArt } = await import(bundle);
  console.log(`Read ${icons.length} icons from the registry.`);

  const rows = icons.map((icon) => {
    const { art, palette } = cellsToArt(icon.cells);
    return {
      id: icon.id,
      name: icon.name,
      category: icon.category,
      tags: icon.tags,
      art,
      palette,
      author: icon.author,
      status: icon.status,
      created_at: icon.createdAt,
    };
  });

  // `resolution=ignore-duplicates` makes this idempotent: an id already in the
  // table is left exactly as it is. An id is immutable once published, so the
  // one thing a re-run must never do is overwrite a drawing.
  let response;
  try {
    response = await fetch(`${URL_}/rest/v1/icons?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    });
  } catch (cause) {
    // A wrong URL, a paused project, or no network. Worth a readable line
    // rather than an undici stack trace about the host.
    console.error(`\n✘ Could not reach ${URL_}\n  ${cause?.cause?.message ?? cause?.message}\n`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`\n✘ Seed failed: ${response.status}\n${await response.text()}\n`);
    process.exit(1);
  }

  const inserted = await response.json();
  console.log(
    `\n✔ ${inserted.length} inserted, ${rows.length - inserted.length} already there.\n`,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
