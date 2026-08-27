"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Shared behavior for modal surfaces (the icon detail dialog, the filter
 * sheet): focus the panel on open, trap Tab inside it, close on Escape, lock
 * background scroll, and return focus to whatever opened it.
 *
 * Extracted rather than duplicated — a focus trap that exists in two copies is
 * a focus trap that will be fixed in one of them.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea",
  'input:not([type="hidden"])',
  "select",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type DialogOptions = {
  /**
   * Modal surfaces trap Tab and lock background scroll. A NON-modal surface —
   * one the visitor is meant to keep working around, like a docked detail
   * panel — must do neither: trapping focus in a panel the page still uses
   * would strand the keyboard, and locking scroll would freeze a grid that is
   * still meant to be browsed.
   */
  modal?: boolean;
};

export function useDialog<T extends HTMLElement>(
  onClose: () => void,
  { modal = true }: DialogOptions = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    if (!modal) {
      return () => opener?.focus?.();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      // Keyboard users land back where they came from, not at the page top.
      opener?.focus?.();
    };
  }, [modal]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      // Tab is only trapped on modal surfaces.
      if (!modal || event.key !== "Tab" || ref.current === null) return;

      const focusable = [
        ...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose, modal],
  );

  return { ref, onKeyDown };
}
