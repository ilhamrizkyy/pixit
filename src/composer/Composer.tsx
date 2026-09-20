"use client";

import { useCallback, useState } from "react";
import { Toast, type ToastTone } from "@/components/Toast";
import { Screen } from "./Screen";
import { ColorColumn } from "./ColorColumn";
import { ComposerProvider } from "./ComposerProvider";
import { Dock } from "./Dock";
import { SlideToClear } from "./SlideToClear";
import { ToolColumn, ToolPill } from "./ToolRail";
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
    /* THE CASE DOES NOT SCROLL — ABOVE `sm` (2026-09-20). An object that runs
       off the bottom of the window stops reading as one, which is why
       `--board-size` gives height back instead of letting the page grow, and
       that rule is intact on every screen the composer is actually authored on.

       BELOW `sm` IT SCROLLS, because down there the rule was costing something
       worse than a tall page. The colour rail lies down as a ROW under the
       screen at phone widths, so the chrome's height depends on how that row
       wraps — which means no single `--toy-chrome` fits 320 through 430:
       measured, the value that brings 412x839 inside the window leaves an 18px
       board at 320x568. With `overflow: hidden` the excess was not a smaller
       board, it was a CLIPPED one, and what it clipped was the bottom of the
       case: the clear slider, unreachable. A scrollbar on a phone is a worse
       object and a working tool; the other way round is neither. */
    <div className="composer-scope flex h-[calc(100dvh-var(--nav-h))] flex-col items-center justify-start overflow-y-auto px-3 pt-3 pb-20 sm:justify-center sm:overflow-hidden sm:px-6">
      {/* NOT flex-1. Letting the frame grow to fill the viewport is what left
          the toy stretched with dead air in it — an object has its own size and
          sits centred in the space, it does not inflate to fill the room. */}
      <div className="toy-frame scope-frame">
        {/* THE NAMEPLATE, CENTRED ON THE CASE (2026-09-19, by request), which
            is what a handheld does — a benchtop instrument badges its top-left
            corner, and this stopped being one.

            THERE IS NO WAY BACK TO THE GALLERY ON THIS CASE, and that is
            parked rather than missed: a `/` link sat in this corner for one
            pass and came off by request while its place is decided. The site
            footer is also suppressed on this route (see `globals.css`), so
            `/create` currently has no in-page exit at all. Worth knowing
            before this ships. */}
        <div className="scope-head">
          <span aria-hidden="true" className="scope-plate-name">
            Pixit
          </span>
        </div>

        {/* THE BAY: the screen with a rail either side — the colour instrument
            on the left, the four tool keys on the right. Two rails of four, the
            same width and the same construction, because the layout this
            replaced was lopsided by design and read as a mistake.

            The colour rail is rendered at EVERY width and restacks to a row
            under the screen on a phone; the tool rail has a scrolling strip as
            its compact form, so it is swapped rather than restacked. */}
        <div className="scope-bay">
          <ColorColumn />

          <div className="toy-stack min-w-0 self-center">
            <div className="toy-bezel w-full">
              <Screen />
            </div>
          </div>

          {!compact && <ToolColumn />}
        </div>

        {compact && <ToolStrip />}

        {/* THE BOTTOM ROW: Undo, the clear slider, Redo — the console's own
            Start/Select pills either side of a long channel. Undo and Redo were
            shoulder mouldings on the top corners for a day; see
            `ScopeControls.tsx` for why a front elevation cannot draw those. */}
        <div className="scope-sill">
          {!compact && <ToolPill side="left" />}
          <SlideToClear />
          {!compact && <ToolPill side="right" />}
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
