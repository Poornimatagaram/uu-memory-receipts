"use client";

import { useState, useSyncExternalStore } from "react";
import ChatBubble, { CHIP_ROW_LOOK, bubbleLook, messageColumnLook } from "@/components/ChatBubble";
import ReceiptChip from "@/components/ReceiptChip";
import type { ChatMessage, Memory } from "@/lib/types";

type ReplyPreviewProps = {
  openingText: string; // the earlier reply, from before the correction
  reply: ChatMessage; // the reply after it: what the static card shows
  memories: Memory[]; // the memories the reply's chips point at, after the correction
  correctedId: string; // the memory that gets corrected during the loop
  className?: string; // the page's spacing and rise-in classes for the <figure>
};

// Is the browser tab hidden right now? useSyncExternalStore reads a value that
// lives outside React (here, document.visibilityState), and re-renders whenever
// the "visibilitychange" event says it changed. On the server there's no tab, so
// the third function says "not hidden".
function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const tabIsHidden = () => document.visibilityState === "hidden";
const tabIsHiddenOnServer = () => false;

// The welcome page's "What a reply looks like" card. It plays an 8-second loop of
// a correction landing: a reply that leans on Maya's old research goal, its chips,
// a highlight on that chip, the chip gaining its ✎, and the reply changing.
//
// Two layers, both made of the real ChatBubble / ReceiptChip pieces:
// 1. The static card: the loop's final frame, exactly as before this step. Screen
//    readers always get this one, so they hear one stable description instead of
//    text that changes every few seconds. With reduced motion, it's the card you see.
// 2. The loop: for the eyes only (aria-hidden). It's all CSS keyframes, on one shared
//    clock (--preview-loop in globals.css). With reduced motion it isn't shown at all.
//
// The only interactive thing is the pause button (WCAG 2.2.2: motion that runs
// longer than 5 seconds needs a way to pause it). The loop also pauses on its own
// while the tab is hidden. Both also pause the page's breathing background
// (a rule in globals.css that looks for data-paused).
export default function ReplyPreview({ openingText, reply, memories, correctedId, className = "" }: ReplyPreviewProps) {
  const [pausedByUser, setPausedByUser] = useState(false);
  const tabHidden = useSyncExternalStore(subscribeToVisibility, tabIsHidden, tabIsHiddenOnServer);
  const paused = pausedByUser || tabHidden;

  // The same memories as they were before the correction, so that chip has no ✎ yet.
  const memoriesBefore = memories.map((m): Memory => (m.id === correctedId ? { ...m, status: "active" } : m));
  const receipts = reply.used ?? [];

  return (
    <figure aria-labelledby="reply-preview" className={`relative ${className}`}>
      {/* Styled like the page's small headings (src/app/page.tsx): same font, same
          20px line, so the pause button below still sits on this line. */}
      <figcaption id="reply-preview" className="font-display text-base/5 font-medium text-warm-ink">
        What a reply looks like
      </figcaption>

      {/* p-3 on phones leaves a 320px screen room for the longest chip on one line. */}
      <div className="mt-4 rounded-3xl border border-line bg-background p-3 shadow-sm sm:p-5">
        {/* Layer 1, the static card. motion-safe:sr-only: when the loop is showing,
            this is hidden from the eyes but still read by screen readers. */}
        <div className="motion-safe:sr-only">
          <ChatBubble message={reply} memories={memories} />
        </div>

        {/* Layer 2, the loop. data-paused stops every part of it (globals.css). */}
        <div aria-hidden="true" data-loop="" data-paused={paused ? "" : undefined} className="motion-reduce:hidden">
          <div className={`${messageColumnLook("future")} motion-safe:animate-loop-reply`}>
            {/* One bubble with both texts stacked in the same grid cell, so the
                bubble is sized for both and doesn't jump when the text changes.
                The two lines wrap the same way at every width (see page.tsx), so
                the final frame's bubble is exactly the static card's. */}
            <p className={`${bubbleLook("future")} grid`}>
              <span className="[grid-area:1/1] opacity-0 motion-safe:animate-loop-old-text">{openingText}</span>
              <span className="[grid-area:1/1] motion-safe:animate-loop-new-text">{reply.text}</span>
            </p>
            <ul className={CHIP_ROW_LOOK}>
              {receipts.map((receipt, index) => (
                <li
                  key={`${index}-${receipt.id}`}
                  className="motion-safe:animate-loop-chip"
                  // One chip after another, 80ms apart, like in the chat.
                  style={{ animationDelay: `calc(var(--preview-loop-delay) + ${index * 80}ms)` }}
                >
                  {receipt.id === correctedId ? (
                    // The chip before and after the correction, stacked like the texts.
                    // Each has its own highlight ring, so the ring always fits the chip
                    // that's showing (the corrected one is wider: it has the ✎).
                    <span className="inline-grid">
                      <span className="relative flex [grid-area:1/1] opacity-0 motion-safe:animate-loop-goal-before">
                        <ReceiptChip receipt={receipt} memory={memoriesBefore.find((m) => m.id === receipt.id)} />
                        <Highlight />
                      </span>
                      {/* [&_[data-edit-mark]]: reaches the ✎ inside this chip (see ReceiptChip). */}
                      <span className="relative flex [grid-area:1/1] motion-safe:animate-loop-goal-after motion-safe:[&_[data-edit-mark]]:animate-loop-mark">
                        <ReceiptChip receipt={receipt} memory={memories.find((m) => m.id === receipt.id)} />
                        <Highlight />
                      </span>
                    </span>
                  ) : (
                    <ReceiptChip receipt={receipt} memory={memories.find((m) => m.id === receipt.id)} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sits on the caption's line, at the right. Hidden with reduced motion, since
          then nothing moves. Its name reads "Pause animation" or "Play animation". */}
      <button
        type="button"
        onClick={() => setPausedByUser((wasPaused) => !wasPaused)}
        className="absolute -top-[3px] right-0 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5" fill="currentColor">
          {pausedByUser ? (
            <path d="M3 1.8v8.4c0 .5.5.8.9.5l6.4-4.2a.6.6 0 0 0 0-1L3.9 1.3c-.4-.3-.9 0-.9.5Z" />
          ) : (
            <>
              <rect x="2" y="1.5" width="2.8" height="9" rx="0.8" />
              <rect x="7.2" y="1.5" width="2.8" height="9" rx="0.8" />
            </>
          )}
        </svg>
        {pausedByUser ? "Play" : "Pause"}
        <span className="sr-only"> animation</span>
      </button>
    </figure>
  );
}

// The soft ring that lands on the "Research goal" chip. Both copies run the same
// keyframes; whichever chip is showing shows its ring.
function Highlight() {
  return (
    <span
      data-loop-highlight=""
      className="pointer-events-none absolute -inset-[3px] rounded-full opacity-0 ring-2 ring-accent/35 motion-safe:animate-loop-highlight"
    />
  );
}
