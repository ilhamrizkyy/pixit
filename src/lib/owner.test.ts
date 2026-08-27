import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COMPOSER_ENV_VAR, isComposerEnabled } from "./owner";

/**
 * The gate is CLAUDE.md rule 1, and the only failure that matters is failing
 * OPEN. So the closed cases are enumerated rather than sampled: a typo, a
 * half-configured environment, and a flag someone turned off all have to land
 * on the same answer as no flag at all.
 *
 * Setting the variable through COMPOSER_ENV_VAR rather than a literal also
 * pins the exported name to the key the module actually reads — the module
 * reads it statically, so a rename that missed the constant would show up here
 * as every open case going closed.
 */

let original: string | undefined;

beforeEach(() => {
  original = process.env[COMPOSER_ENV_VAR];
});

afterEach(() => {
  setFlag(original);
});

function setFlag(value: string | undefined): void {
  if (value === undefined) delete process.env[COMPOSER_ENV_VAR];
  else process.env[COMPOSER_ENV_VAR] = value;
}

describe("isComposerEnabled", () => {
  it("is closed when the variable is unset", () => {
    setFlag(undefined);
    expect(isComposerEnabled()).toBe(false);
  });

  it.each([
    "",
    "   ",
    "false",
    "FALSE",
    "0",
    "no",
    "off",
    "null",
    "undefined",
    "1",
    "yes",
    "enabled",
    "truthy",
    "true-ish",
  ])("is closed for %j", (value) => {
    setFlag(value);
    expect(isComposerEnabled()).toBe(false);
  });

  it.each(["true", "TRUE", " True "])("opens for %j", (value) => {
    setFlag(value);
    expect(isComposerEnabled()).toBe(true);
  });

  it("re-reads the environment on every call", () => {
    // A value cached at module load would survive the flag being revoked, so
    // turning the composer off would need a redeploy to take effect.
    setFlag("true");
    expect(isComposerEnabled()).toBe(true);
    setFlag("false");
    expect(isComposerEnabled()).toBe(false);
  });

  it("names a variable that Next will not inline into the client bundle", () => {
    expect(COMPOSER_ENV_VAR.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  it("throws rather than answering when evaluated in a browser", () => {
    // Server-only is enforced by convention, so the assertion is what turns an
    // accidental client import into a visible error instead of a silent false.
    setFlag("true");
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    try {
      expect(() => isComposerEnabled()).toThrow(/server-only/);
    } finally {
      Reflect.deleteProperty(globalThis, "window");
    }
  });
});
