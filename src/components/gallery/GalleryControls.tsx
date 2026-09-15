"use client";

import { ColorInstrument } from "./ColorInstrument";
import { SizeMeter } from "./SizeMeter";
import { ShapeDropdown } from "./ShapeDropdown";
import type { GallerySettings } from "./settings";

/**
 * The display controls IN A COLUMN — colour, size and shape, for the mobile
 * filter sheet.
 *
 * IT IS THE SHEET'S LAYOUT ONLY, as of 2026-09-13. It served the desktop
 * sidebar and the sheet from one file while both were columns; the sidebar is
 * gone and the desktop build is `DisplayBar`, a row in the gallery's sticky
 * toolbar. Two layouts, one set of controls, and only one of them is ever
 * mounted — which is what keeps the two surfaces from becoming two answers to
 * the same question.
 *
 * THE SHEET STAYS A COLUMN, and that is not laziness about the new shape. A
 * sheet is a tall narrow surface with room to spare, so the colour field can
 * stand at full size inline — no popover, no second layer to dismiss, and one
 * fewer thing between a thumb and the value. The toolbar has 64px of height and
 * cannot.
 *
 * Deliberately stateless: it renders `settings` and reports every change up.
 * That is what lets the sheet hand it a DRAFT while the toolbar hands the same
 * controls the live values.
 */

type GalleryControlsProps = {
  settings: GallerySettings;
  onChange: (next: GallerySettings) => void;
  /**
   * The theme's own icon colour. Passed in rather than read here so the sheet
   * resolves its DRAFT's colour, not the live one: the swatch has to show what
   * Apply would do, not what is on screen.
   */
  themeColor: string;
  /** Disambiguates input ids when both surfaces exist in one test render. */
  idPrefix?: string;
};

export function GalleryControls({
  settings,
  onChange,
  themeColor,
  idPrefix = "sheet",
}: GalleryControlsProps) {
  return (
    <>
      {/* THE EYEBROWS ARE WHAT SEPARATES THE SECTIONS. They were dropped on
          2026-08-29 when this was a pad on a moulded body and every control was
          legended on the plastic — a label over that is a caption for something
          already saying its own name. Nothing is legended on anything now. */}
      <section className="pixl-pad pixl-section">
        <p className="pixl-eyebrow">COLOR</p>
        <ColorInstrument
          settings={settings}
          onChange={onChange}
          themeColor={themeColor}
          idPrefix={idPrefix}
        />
      </section>

      {/* THE VALUE IS PRINTED BY THE EYEBROW. The meter shows the RUN and the
          eyebrow shows the number, which is what lets the blocks carry no
          labels at all — the rail this replaced had to print seven of fourteen
          numbers and collided them on a phone. */}
      <section className="pixl-pad pixl-section">
        <p className="pixl-eyebrow">
          <label htmlFor={`${idPrefix}-size`}>SIZE</label>
          <b>{settings.size}</b>
        </p>
        <SizeMeter
          size={settings.size}
          onSize={(next) => onChange({ ...settings, size: next })}
          id={`${idPrefix}-size`}
        />
      </section>

      {/* THE SAME DROPDOWN THE BAR USES (2026-09-13). The sheet ran the caret
          stepper while the bar ran the dropdown for about an hour, which is two
          controls for one setting on two surfaces that are never mounted
          together — exactly the split this file's own header says it exists to
          prevent. The eyebrow stays here and not in the bar: a sheet is a list
          of sections and needs them named, where a toolbar's controls sit side
          by side and say what they are by being what they are. */}
      <section className="pixl-pad pixl-section">
        <p className="pixl-eyebrow">SHAPE</p>
        <ShapeDropdown settings={settings} onSettings={onChange} />
      </section>
    </>
  );
}
