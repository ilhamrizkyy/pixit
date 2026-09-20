"use client";

import type { ReactNode } from "react";
import { CATEGORIES, type Category } from "@/engine/types";
import { useComposer, useComposerStore } from "./ComposerProvider";
import { parseTags } from "./storage";

/**
 * The metadata fields, written once and worn two ways.
 *
 * WIDE ROW: the label is visually hidden and the placeholder carries it. Three
 * fields on one line already read as a single form, and stacking a label over
 * each would double the bar's height to restate what the line says.
 *
 * SHEET: the label is VISIBLE. A column of placeholder-only fields is exactly
 * where that trick stops working — there is no line to read them against, and a
 * placeholder disappears the moment you type into it, so the sheet would lose
 * its own labels as it was filled in.
 *
 * `tall` is separate from `stacked` because they answer different questions.
 * Stacked is about reading; tall is about thumbs — the phone bar needs a 44px
 * target whether or not its labels are showing.
 */

const FIELD =
  "w-full rounded-sm border border-border bg-surface px-2 text-caption text-text focus:border-accent focus:outline-none";

type FieldProps = {
  /** Visible label above the control, rather than a hidden one. */
  stacked?: boolean;
  /** 44px control, for touch. */
  tall?: boolean;
  /** Sizing for the wrapper, which is the caller's business, not the field's. */
  className?: string;
};

function control({ tall }: FieldProps) {
  return `${FIELD} ${tall ? "h-11" : "py-1.5"}`;
}

function Shell({
  id,
  label,
  hint,
  stacked,
  className,
  children,
}: FieldProps & {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${stacked ? "flex flex-col gap-1.5" : ""} ${className ?? ""}`}>
      <label htmlFor={id} className={stacked ? "text-caption text-text-muted" : "sr-only"}>
        {label}
      </label>
      {children}
      {stacked && hint && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

export function NameField(props: FieldProps) {
  const store = useComposerStore();
  const name = useComposer((s) => s.name);

  return (
    <Shell {...props} id="pixl-name" label="Name" hint="Saved kebab-cased, and it must be unique.">
      <input
        id="pixl-name"
        value={name}
        placeholder={props.stacked ? "arrow-right" : "Name"}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => store.getState().setName(event.target.value)}
        className={`${control(props)} font-data`}
      />
    </Shell>
  );
}

/**
 * CATEGORY, IN THE DOCK WITH THE REST OF THE METADATA.
 *
 * IT LEFT FOR A DAY AND CAME BACK (2026-09-18 to 2026-09-19). The argument for
 * moving it was that category is a closed six-member union, which is what a
 * detented control is for, so it became a thumbwheel mounted through the
 * board's case — under the line "the dock holds what you TYPE, the board holds
 * what you TURN".
 *
 * THAT LINE WAS TIDY AND IT WAS THE WRONG CUT. What actually belongs on the
 * board is what you reach for WHILE DRAWING: the colour, because it changes
 * between one stroke and the next. Category is set once, when you are naming
 * the thing you have finished — which is the dock's whole job, and is why name
 * and tags live there. Splitting metadata across two surfaces on the strength
 * of a control's shape cost a board row and a 482px barrel printing one word,
 * and bought nothing you could do faster.
 *
 * So the shape follows the grouping rather than the grouping following the
 * shape. A `<select>` next to two text fields is three ways of saying "this is
 * what the icon is called and what it is", read top to bottom in one place.
 */
export function CategoryField(props: FieldProps) {
  const store = useComposerStore();
  const category = useComposer((s) => s.category);

  return (
    <Shell {...props} id="pixl-category" label="Category">
      <select
        id="pixl-category"
        value={category}
        onChange={(event) => store.getState().setCategory(event.target.value as Category)}
        className={control(props)}
      >
        {CATEGORIES.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function TagsField({
  text,
  onText,
  ...props
}: FieldProps & { text: string; onText: (next: string) => void }) {
  const store = useComposerStore();

  return (
    <Shell {...props} id="pixl-tags" label="Tags" hint="Separate them with commas.">
      <input
        id="pixl-tags"
        value={text}
        placeholder={props.stacked ? "arrow, direction" : "Tags"}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          onText(event.target.value);
          // Stored kebab-cased, shown as typed: forcing the field itself would
          // fight anyone typing a multi-word tag.
          store.getState().setTags(parseTags(event.target.value));
        }}
        className={`${control(props)} font-data`}
      />
    </Shell>
  );
}
