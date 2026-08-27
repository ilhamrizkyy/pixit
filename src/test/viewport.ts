/**
 * The viewport, as an explicit test fixture.
 *
 * jsdom ships no `matchMedia`, so every component that asks about the viewport
 * gets `false` and renders whatever layout that implies. That is harmless for a
 * suite which does not care, and a silent trap for one which does: with the
 * dock now wearing two shapes, a test about the desktop row would quietly
 * assert against the phone bar and fail for a reason that has nothing to do
 * with what it is checking.
 *
 * So width becomes something a test states rather than inherits. Only
 * `min-width` and `max-width` are answered — those are the queries the layouts
 * turn on. Anything else (`prefers-reduced-motion`, `prefers-color-scheme`)
 * reports `false`, which is what the absent `matchMedia` already produced.
 */

const MIN = /\(min-width:\s*(\d+)px\)/;
const MAX = /\(max-width:\s*(\d+)px\)/;

export function setViewportWidth(width: number): void {
  const matches = (query: string): boolean => {
    const min = MIN.exec(query);
    const max = MAX.exec(query);
    if (min === null && max === null) return false;
    if (min !== null && width < Number(min[1])) return false;
    if (max !== null && width > Number(max[1])) return false;
    return true;
  };

  window.matchMedia = ((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

export function clearViewport(): void {
  Reflect.deleteProperty(window, "matchMedia");
}
