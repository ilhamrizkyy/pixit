import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cellsFromArt } from "./authoring";
import {
  authHeaders,
  iconFromRow,
  iconsFromRows,
  isRemoteConfigured,
  type IconRow,
} from "./remote";

/**
 * The read path behind the public gallery.
 *
 * Its governing rule is that ONE BAD ROW MUST NOT BLANK THE HOMEPAGE. The
 * composer refuses a malformed import outright, because an import is one
 * drawing a person just chose and refusing it is a complete answer. A row in a
 * shared database is not that: it can be hand-edited in a dashboard, or written
 * by an older build, and everyone else's icons still have to render.
 */

const ART = [
  "...........",
  "...........",
  "....###....",
  "...#...#...",
  "...#...#...",
  "...#####...",
  "...#...#...",
  "...#...#...",
  "...........",
  "...........",
  "...........",
];

function row(over: Partial<IconRow> = {}): IconRow {
  return {
    id: "letter-a",
    name: "letter-a",
    category: "interface",
    tags: ["letter"],
    art: ART,
    palette: { "#": "#111111" },
    author: "ilham",
    status: "published",
    created_at: "2026-08-21T09:00:00.000Z",
    ...over,
  };
}

describe("iconFromRow", () => {
  it("builds the same cells the repo's own loader would", () => {
    const icon = iconFromRow(row());
    expect(icon).not.toBeNull();
    expect(icon!.cells).toEqual(cellsFromArt(ART, { "#": "#111111" }));
    expect(icon!.id).toBe("letter-a");
    expect(icon!.category).toBe("interface");
    expect(icon!.createdAt).toBe("2026-08-21T09:00:00.000Z");
  });

  it.each([
    ["a non-kebab id", { id: "Letter A" }],
    ["a non-kebab name", { name: "Letter A" }],
    ["a category outside the closed union", { category: "weather" }],
    ["a non-kebab tag", { tags: ["Letter A"] }],
    ["too few art rows", { art: ART.slice(0, 5) }],
    ["a short art row", { art: [...ART.slice(0, 10), "..."] }],
    ["a character with no palette entry", { palette: { "@": "#111111" } }],
    ["a palette hex that is not a hex", { palette: { "#": "nope" } }],
    ["art that is not an array", { art: "..........." as unknown as string[] }],
  ] as [string, Partial<IconRow>][])("rejects %s", (_label, over) => {
    expect(iconFromRow(row(over))).toBeNull();
  });

  it("tolerates null tags and a null author", () => {
    const icon = iconFromRow(row({ tags: null, author: null }));
    expect(icon).not.toBeNull();
    expect(icon!.tags).toEqual([]);
    expect(icon!.author).toBe("ilham");
  });
});

describe("iconsFromRows", () => {
  it("keeps the good rows and names the ones it dropped", () => {
    const { icons, rejected } = iconsFromRows([
      row(),
      row({ id: "broken", name: "broken", art: [] }),
      row({ id: "letter-b", name: "letter-b" }),
    ]);

    // The failure this prevents: one hand-edited row taking the gallery down.
    expect(icons.map((icon) => icon.id)).toEqual(["letter-a", "letter-b"]);
    expect(rejected).toEqual(["broken"]);
  });

  it("returns nothing for no rows", () => {
    expect(iconsFromRows([])).toEqual({ icons: [], rejected: [] });
  });
});

describe("isRemoteConfigured", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is false with no credentials, because no database is a supported state", () => {
    // The repo is MIT and must clone, build and run with no Postgres at all.
    expect(isRemoteConfigured()).toBe(false);
  });

  it.each([
    ["only a url", { SUPABASE_URL: "https://x.supabase.co" }],
    ["only a key", { SUPABASE_PUBLISHABLE_KEY: "anon" }],
    ["an empty url", { SUPABASE_URL: "   ", SUPABASE_PUBLISHABLE_KEY: "anon" }],
    ["an empty key", { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: " " }],
  ])("is false with %s", (_label, env) => {
    Object.assign(process.env, env);
    expect(isRemoteConfigured()).toBe(false);
  });

  it("is true once both are set", () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "anon";
    expect(isRemoteConfigured()).toBe(true);
  });
});

describe("authHeaders", () => {
  /* The era of the key decides the headers, and getting it wrong is a silent
     401 rather than anything legible. Current projects issue non-JWT
     `sb_publishable_` / `sb_secret_` keys that Supabase documents as NOT
     sendable in `Authorization: Bearer`; older projects issue JWTs that are. */
  it.each(["sb_publishable_abc123", "sb_secret_abc123"])(
    "sends %s in apikey ALONE",
    (key) => {
      expect(authHeaders(key)).toEqual({ apikey: key });
      expect(authHeaders(key).Authorization).toBeUndefined();
    },
  );

  it("sends a legacy JWT as both apikey and Bearer", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.body.sig";
    expect(authHeaders(jwt)).toEqual({ apikey: jwt, Authorization: `Bearer ${jwt}` });
  });

  it("never omits apikey, whatever the key looks like", () => {
    for (const key of ["eyJx", "sb_secret_x", "anything-else"]) {
      expect(authHeaders(key).apikey).toBe(key);
    }
  });
});
