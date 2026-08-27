"use client";

import { useMemo, useState } from "react";
import { Toast } from "@/components/Toast";
import { recolorCells } from "@/engine/color";
import { searchIcons } from "@/registry/search";
import { applyOrientation } from "@/engine/transform";
import { CATEGORIES } from "@/engine/types";
import type { Category, IconDef } from "@/engine/types";
import { useLocalIcons } from "@/composer/useLocalIcons";
import { mergeIcons } from "@/registry/merge";
import { THEME_ICON_COLOR, useResolvedTheme } from "@/lib/theme";
import { EmptyState } from "./EmptyState";
import { FilterSheet } from "./FilterSheet";
import { GallerySidebar } from "./GallerySidebar";
import { IconCard } from "./IconCard";
import { IconDetail } from "./IconDetail";
import {
  DEFAULT_SETTINGS,
  resolveGalleryColor,
  type GallerySettings,
} from "./settings";

/**
 * The public gallery. Read-only by design — browse, search, filter, copy,
 * download. Nothing here mutates an icon.
 *
 * The registry is a static module, so there is no async load and therefore no
 * loading state: the icons are present in the first paint. An empty state
 * exists because a search can legitimately match nothing.
 */

type GalleryProps = { icons: readonly IconDef[] };

export function Gallery({ icons: registry }: GalleryProps) {
  // Icons the owner saved in the composer join the published set after mount.
  // They are browser-local until Phase 3 persists them for real.
  const local = useLocalIcons();
  const icons = useMemo(() => mergeIcons(registry, local), [registry, local]);
  // Only the local icons that actually SURVIVED the merge. Building this from
  // the raw local list would badge a published icon as local whenever an id
  // collided — the registry wins that collision, so it is a registry icon.
  const localIds = useMemo(() => {
    const published = new Set(registry.map((icon) => icon.id));
    return new Set(
      local.filter((icon) => !published.has(icon.id)).map((icon) => icon.id),
    );
  }, [registry, local]);

  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<GallerySettings>(DEFAULT_SETTINGS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<IconDef | null>(null);
  const [toast, setToast] = useState("");

  const theme = useResolvedTheme();
  const themeColor = THEME_ICON_COLOR[theme];
  const activeColor = resolveGalleryColor(settings.colorText, themeColor);

  /**
   * Search matches name + tags (INTERACTION.md §6). The rule itself lives in
   * `@/registry/search`, because the composer's import picker searches the same
   * set and two copies of one match rule is one copy that gets left behind.
   */
  const searched = useMemo(() => searchIcons(icons, search), [icons, search]);

  // Counts reflect the search, so they answer "what is left in each category".
  const counts = useMemo(() => {
    const tally = Object.fromEntries(
      CATEGORIES.map((entry) => [entry.id, 0]),
    ) as Record<Category, number>;
    for (const icon of searched) tally[icon.category] += 1;
    return tally;
  }, [searched]);

  const visible = useMemo(
    () =>
      settings.category === "all"
        ? searched
        : searched.filter((icon) => icon.category === settings.category),
    [searched, settings.category],
  );

  /**
   * Display cells, keyed by icon id. The registry records are never modified —
   * this is a parallel map consulted only when drawing. Both transforms return
   * the input array unchanged in their identity cases, so the default path
   * costs nothing.
   */
  const displayCells = useMemo(() => {
    const map = new Map<string, IconDef["cells"]>();
    for (const icon of icons) {
      // Orientation first, then color: both are per-cell-independent, but
      // fixing the order keeps the pipeline easy to reason about.
      const oriented = applyOrientation(icon.cells, settings.orientation);
      map.set(icon.id, recolorCells(oriented, activeColor));
    }
    return map;
  }, [icons, activeColor, settings.orientation]);

  return (
    <div className="flex flex-col items-start lg:flex-row">
      <GallerySidebar
        search={search}
        onSearch={setSearch}
        settings={settings}
        onSettings={setSettings}
        color={activeColor}
        onOpenFilters={() => setFiltersOpen(true)}
        filtersOpen={filtersOpen}
        counts={counts}
        total={searched.length}
      />

      <main
        className="w-full min-w-0 flex-1 px-6 pt-6 pb-10 lg:px-8"
        /* The detail panel is docked rather than overlaid, so the grid needs
           room to scroll clear of it — otherwise the last row is unreachable
           behind the panel. */
        style={selected ? { paddingBottom: "clamp(14rem, 40vh, 22rem)" } : undefined}
      >
        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <h1 className="text-h2">Icons</h1>
          <span className="font-data text-caption text-text-muted">
            {visible.length} icon{visible.length === 1 ? "" : "s"}
          </span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            query={search.trim() || undefined}
            // Clear whichever thing is actually hiding the icons: the search
            // if there is one, otherwise the category filter.
            onReset={
              search.trim()
                ? () => setSearch("")
                : settings.category !== "all"
                  ? () => setSettings({ ...settings, category: "all" })
                  : undefined
            }
            resetLabel={search.trim() ? "Clear search" : "Show all categories"}
          />
        ) : (
          // Denser on phones so the grid reads as a lattice rather than a short
          // list — 4 columns at 375px, matching the Lucide reference.
          <ul
            aria-label="Icons"
            className="grid list-none grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-[14px] p-1 lg:grid-cols-[repeat(auto-fill,minmax(92px,1fr))]"
          >
            {/* Each li IS the grid item. `display: contents` would be tidier
                CSS but has a history of dropping list semantics from the
                accessibility tree, so the card stretches to fill instead. */}
            {visible.map((icon) => (
              <li key={icon.id}>
                <IconCard
                  icon={icon}
                  cells={displayCells.get(icon.id) ?? icon.cells}
                  size={settings.size}
                  padding={settings.padding}
                  cellStyle={settings.cellStyle}
                  selected={selected?.id === icon.id}
                  local={localIds.has(icon.id)}
                  onSelect={setSelected}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {filtersOpen && (
        <FilterSheet
          settings={settings}
          onApply={setSettings}
          onClose={() => setFiltersOpen(false)}
          themeColor={themeColor}
          counts={counts}
          total={searched.length}
        />
      )}

      {selected && (
        <IconDetail
          icon={selected}
          displayCells={displayCells.get(selected.id) ?? selected.cells}
          padding={settings.padding}
          cellStyle={settings.cellStyle}
          onClose={() => setSelected(null)}
          onNotify={setToast}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
