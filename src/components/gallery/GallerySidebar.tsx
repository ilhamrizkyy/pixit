"use client";

import { GalleryControls } from "./GalleryControls";
import type { GallerySettings } from "./settings";

/**
 * Gallery sidebar — the toy's BODY, and DESKTOP ONLY.
 *
 * It OPERATES THE SCREEN: colour and size, the two things that change how every
 * icon is drawn. What changes which icons are shown — search, category — is on
 * the screen itself, where you can see the result line up with the control.
 *
 * Below `lg` this does not render at all and the filter sheet carries the same
 * controls, so the icons are never pushed below a screenful of chrome.
 */

type GallerySidebarProps = {
  settings: GallerySettings;
  onSettings: (next: GallerySettings) => void;
  themeColor: string;
};

export function GallerySidebar({
  settings,
  onSettings,
  themeColor,
}: GallerySidebarProps) {
  return (
    /* No padding and no paint: the pad spans the full column, lining up with
       the mini screen above it, and the board under it is already the moulded
       plastic. `.pixl-body` used to repoint the toy's tokens here; that moved
       onto `.pixl-pad` so the filter sheet's copy of the same controls gets
       them too.

       NOTHING STRETCHES, and the SLACK FALLS AT THE BOTTOM (2026-08-30). Two
       separate decisions that keep getting confused for one:

       - Nothing grows. The pads held three controls once; with Size gone to the
         rail, stretching a panel around three keys just draws a slab of bare
         plastic with a control in its corner.
       - The slack goes UNDER the controls, not over them. It sat above for a
         day — `mt-auto`, pads at the foot of the column, screen at the head —
         on the argument that bare plastic at the bottom edge reads as an
         unfinished side. What it actually produced was a 152px hole between the
         screen and the first control at 900px and a 302px one at 1050px, which
         does not read as case: it reads as two groups that have come apart. The
         controls belong to the screen they operate, so they sit under it.

       `shrink-0` is the other half, and it did not change: on a short window
       the SCREEN is what gives height back, never the controls. */
    <aside className="relative z-10 hidden w-full shrink-0 flex-col gap-4 lg:flex">
      <GalleryControls
        settings={settings}
        onChange={onSettings}
        themeColor={themeColor}
      />
    </aside>
  );
}
