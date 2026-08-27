"use client";

import { useCallback, useState } from "react";
import { Toast, type ToastTone } from "@/components/Toast";
import { Screen } from "./Screen";
import { ColorPanel } from "./ColorPanel";
import { HueKnob, LightnessKnob } from "./ColorKnobs";
import { ComposerProvider } from "./ComposerProvider";
import { Dock } from "./Dock";
import { SlideToClear } from "./SlideToClear";
import { ToolColumn } from "./ToolRail";
import { ToolStrip } from "./ToolStrip";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useComposerShortcuts } from "./useComposerShortcuts";
import { useDraft } from "./useDraft";

/**
 * The composer, as the blue Etch A Sketch (DESIGN.md §6).
 *
 * THE PAGE DOES NOT SCROLL. The toy is an object you hold, and an object that
 * runs off the bottom of the screen stops reading as one. Everything is sized
 * against the viewport: the frame takes the height that is left after the nav,
 * and the board takes its size from that height rather than from the width, so
 * a short window shrinks the board instead of growing the page.
 *
 * `composer-scope` is what makes the toy tokens resolve, and it is the ONLY
 * place they may (DESIGN.md §7). The dock below stays on the shell tokens: it
 * is a form about the drawing, not part of the object.
 */

export function Composer() {
  return (
    <ComposerProvider>
      <ComposerBody />
    </ComposerProvider>
  );
}

type Notice = { text: string; tone: ToastTone; nonce: number };

function ComposerBody() {
  const [notice, setNotice] = useState<Notice | null>(null);
  /* The nonce is what makes a REPEATED message behave like a new one. Saving
     twice without fixing the name produces the identical string, and without a
     changing key the toast neither restarts its clock nor re-announces itself —
     so the second refusal would look like the first one that never left. */
  const notify = useCallback((text: string, tone: ToastTone = "info") => {
    setNotice((previous) => ({ text, tone, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);
  /* Rendered, not just hidden: two copies of eight buttons would mean two
     controls answering to "Undo" in the accessibility tree. */
  const compact = useMediaQuery("(max-width: 639px)");
  useComposerShortcuts();
  useDraft();

  return (
    <div className="composer-scope flex h-[calc(100dvh-var(--nav-h))] flex-col items-center justify-center overflow-hidden px-3 pt-3 pb-20 sm:px-6">
      {/* NOT flex-1. Letting the frame grow to fill the viewport is what left
          the toy stretched with dead air in it — an object has its own size and
          sits centred in the space, it does not inflate to fill the room. */}
      <div /* pb far larger than pt: the knobs are the last thing in the frame, and
             with only a few pixels under them they read as falling off its
             edge rather than mounted on its face. */
          className="toy-frame flex w-fit max-w-full flex-col gap-3 px-3 pt-3 pb-6 sm:gap-4 sm:px-5 sm:pt-3 sm:pb-8">
        {/* Screen, flanked by the two groups of four. */}
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          {!compact && <ToolColumn side="left" />}

          <div className="toy-stack min-w-0 self-center">
            <div className="toy-bezel w-full">
              {/* Moulded into the brow, the way the toy this is modelled on
                  carries its own name. Decorative: the page's real wordmark is
                  in the nav, and a screen reader meeting "Pixle" twice on one
                  page learns nothing the second time. */}
              <span className="toy-legend" aria-hidden="true">
                Pixle
              </span>
              {/* The SCREEN is the square, not the bezel — so the bezel can
                  carry a deeper brow without the board going oblong. */}
              <Screen />
            </div>
            <SlideToClear />
          </div>

          {!compact && <ToolColumn side="right" />}
        </div>

        {compact && <ToolStrip />}

        {/* The colour controls span exactly the drawing area, so the toy reads
            as one column rather than three things of three widths. The knobs
            sit at the lane's ends, in the frame, not hung off its corners. */}
        <div className="toy-lane flex items-center gap-3">
          <HueKnob />
          <div className="min-w-0 flex-1">
            <ColorPanel />
          </div>
          <LightnessKnob />
        </div>
      </div>

      <Dock onNotify={notify} />
      {notice && (
        <Toast
          key={notice.nonce}
          message={notice.text}
          tone={notice.tone}
          onDismiss={() => setNotice(null)}
        />
      )}
    </div>
  );
}
