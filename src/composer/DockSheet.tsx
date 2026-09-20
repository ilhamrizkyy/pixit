"use client";

import { useDialog } from "@/lib/useDialog";
import { CLOSE_MS, useDismissible } from "@/lib/useDismissible";
import { useComposer, useComposerStore } from "./ComposerProvider";
import { CategoryField, TagsField } from "./DockFields";
import type { Dock } from "./useDock";

/**
 * Everything the phone bar could not keep, in the house's own mobile surface
 * (DESIGN.md §6: below `lg` the controls that do not fit move into a bottom
 * sheet opened from a button beside the one that stays).
 *
 * NO DRAFT, unlike the gallery's filter sheet. That sheet defers because it
 * covers the grid it is changing, so you could not see what you were doing;
 * these fields change metadata, which is not on screen either way. An Apply
 * button here would be ceremony around a text field.
 *
 * NOTHING IS DUPLICATED FROM THE BAR. The bar keeps Name and Save, the sheet
 * keeps the rest, and the split is exact — two controls answering to the same
 * label in one accessibility tree is the failure mode of a mobile surface that
 * mirrors its desktop one.
 */
export function DockSheet({
  dock,
  onImport,
  onClose,
}: {
  dock: Dock;
  onImport: () => void;
  onClose: () => void;
}) {
  const store = useComposerStore();
  const annotations = useComposer((s) => s.annotations);
  const { closing, requestClose } = useDismissible(onClose, CLOSE_MS.sheet);
  const { ref, onKeyDown } = useDialog<HTMLDivElement>(requestClose);

  return (
    <div
      className={`pixl-sheet-backdrop fixed inset-0 z-50 flex items-end bg-text/45 ${
        closing ? "is-closing" : ""
      }`}
      onClick={requestClose}
    >
      <div
        ref={ref}
        id="pixl-dock-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pixl-dock-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className={`pixl-sheet relative flex max-h-[85vh] w-full flex-col rounded-t-lg bg-bg shadow-[var(--shadow-overlay)] outline-none ${
          closing ? "is-closing" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          {/* "Details", not "Icon details": the heading runs in the pixel face,
              whose advance widths are wide enough that twelve characters end a
              pixel from the close button at 320px. Seven is also exactly the
              gallery sheet's "Filters", so the two read as siblings. The button
              that opens this still says "Icon details" — it needs the noun,
              standing in a bar full of other controls; the heading does not,
              standing alone. */}
          <h2 id="pixl-dock-sheet-title" className="text-h3">
            Details
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-sm text-body text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <CategoryField stacked tall />
          <TagsField stacked tall text={dock.tagText} onText={dock.setTagText} />

          {/* A view toggle, not an action — so it does NOT close the sheet. Its
              own pressed state is the feedback; dismissing a sheet out from
              under a switch someone might flip twice would be the surprise. */}
          <button
            type="button"
            onClick={() => store.getState().toggleAnnotations()}
            aria-pressed={annotations}
            className="flex h-11 items-center justify-between rounded-sm border border-border bg-surface px-3 text-caption text-text aria-pressed:border-accent aria-pressed:bg-accent-subtle aria-pressed:text-accent-ink"
          >
            Show control names on the toy
            <span aria-hidden="true" className="font-data">
              {annotations ? "On" : "Off"}
            </span>
          </button>
        </div>

        {/* Below the scroll area, so the actions stay reachable
            however long the controls above get. Both close: each one ends in a
            toast, and a toast behind the backdrop is a confirmation nobody
            sees. */}
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
          {/* The publish step, given the full width, the first line AND the
              accent: Save keeps the icon in this browser, and this is the only
              thing that gets it into the set everyone else sees. */}
          <button
            type="button"
            onClick={() => {
              void dock.copyRegistryEntry();
              requestClose();
            }}
            title="Copy this icon's registry entry, to paste into src/registry/icons.ts and commit"
            className="w-full rounded-sm bg-accent px-3 py-2.5 text-ui text-bg transition-colors hover:bg-accent-hover"
          >
            Publish icon
          </button>
          <div className="flex gap-3">
            {/* Closes as it opens the picker — see Dock.tsx. Import is no
                longer a file dialog that could be cancelled, so there is no
                "only once something was really chosen" case to wait for. */}
            <button type="button" onClick={onImport} className={SHEET_ACTION}>
              Import icon
            </button>
            <button
              type="button"
              onClick={() => {
                dock.exportSvg();
                requestClose();
              }}
              className={SHEET_ACTION}
            >
              Export SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SHEET_ACTION =
  "flex-1 rounded-sm border border-border bg-surface px-4 py-3 text-ui text-text";
