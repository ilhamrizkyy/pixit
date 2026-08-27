/**
 * Pixle icon engine — the public surface.
 *
 * THE ARCHITECTURAL RULE (TECH-STACK.md): nothing in this directory may import
 * React, next/*, the DOM, Canvas, or WebGL. The engine is plain TypeScript and
 * fully unit-testable on its own. Presentation reads engine state and forwards
 * input into it.
 *
 * That boundary is what lets the composer ship as DOM/CSS-3D now and become a
 * React Three Fiber toy later as a presentation swap, not a rewrite.
 */

export * from "./constants";
export * from "./types";
export * from "./grid";
export * from "./transform";
export * from "./history";
export * from "./draw";
export * from "./color";
export * from "./svg";
