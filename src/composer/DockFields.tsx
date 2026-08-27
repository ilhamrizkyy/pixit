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
