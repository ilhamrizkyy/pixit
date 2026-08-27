"use client";

import { useEffect, useState } from "react";
import { CLOSE_MS } from "@/lib/useDismissible";

/**
 * Transient feedback (INTERACTION.md §7).
 *
 * TWO TONES, AND THEY DO NOT SHARE A CORNER.
 *
 * A confirmation is ambient: it reports something you already know you did, so
 * it sits at the bottom near the controls that caused it and leaves quickly,
 * announced politely rather than cutting a screen reader off mid-sentence.
 *
 * A refusal is not ambient. It means the thing you asked for did NOT happen, so
 * it takes the top of the screen — away from the dock it is about, which on a
 * phone is under your own thumb — stays roughly twice as long, and interrupts.
 *
 * The error tone is a TINTED PANEL, not a solid slab: a soft red ground with
 * the full-strength danger red as its border, and a darker red as its ink. A
 * saturated block of red is the shape of a system failure, and "name this
 * before saving" is not one — it is an ordinary thing to be told, and the tint
 * says so while the border keeps it unmistakably an error.
 *
 * All three come from tokens, so the pairing inverts with the theme rather than
 * turning into a glare on a dark ground: the surface goes to near-black red and
 * the ink lifts. Ink is a step darker than the border on purpose — the border
 * red alone sits at 4.0:1 on its own tint, which misses AA for body text.
 */

export type ToastTone = "info" | "error";

/** A refusal needs reading; a confirmation needs only noticing. */
const DURATION: Record<ToastTone, number> = { info: 2200, error: 4500 };

type ToastProps = {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, tone = "info", onDismiss, duration }: ToastProps) {
  const ms = duration ?? DURATION[tone];
  const [leaving, setLeaving] = useState(false);

  /* TWO TIMERS, because a toast that unmounts the instant its clock runs out
     has nothing left to animate on — it simply vanishes, which is the half of
     the motion that was missing. The first starts the exit; the second releases
     the element once the exit has played. Someone who asked for less motion is
     not made to wait for it. */
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const timer = setTimeout(onDismiss, ms);
      return () => clearTimeout(timer);
    }

    const start = setTimeout(() => setLeaving(true), ms);
    const end = setTimeout(onDismiss, ms + CLOSE_MS.modal);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [message, ms, onDismiss]);

  const error = tone === "error";

  return (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      /* Named, because `role="alert"` is not unique on the page: Next injects
         its own route announcer with the same role, so anything looking for
         "the toast" by role finds two and has to guess. */
      data-toast={tone}
      /* `w-max`, not shrink-to-fit. A fixed element at `left: 50%` has a
         containing block running from the middle of the screen to its right
         edge, so its available width is HALF the viewport — the centring
         translate moves it afterwards and cannot give the width back. A
         one-line message was wrapping to three inside a 188px box on a 375px
         phone. Intrinsic width ignores that containing block; max-width then
         clamps it to the real viewport. */
      className={`fixed left-1/2 z-60 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md px-5 py-3 text-ui shadow-[var(--shadow-overlay)] ${
        error
          ? "pixl-toast-top top-[calc(var(--nav-h)+1rem)] border border-danger bg-danger-surface text-danger-ink"
          : "pixl-toast bottom-[var(--toast-bottom,1.5rem)] bg-text text-bg"
      } ${leaving ? "is-leaving" : ""}`}
    >
      {message}
    </div>
  );
}
