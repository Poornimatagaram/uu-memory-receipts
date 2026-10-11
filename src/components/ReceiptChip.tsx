import { shortDate } from "@/lib/dates";
import type { Receipt } from "@/lib/receipts";
import type { Memory } from "@/lib/types";

type ReceiptChipProps = {
  receipt: Receipt;
  memory: Memory | undefined; // undefined when no memory has this receipt's id
  // Leave this out for a chip that's only a picture (the welcome page's preview).
  onOpen?: (receipt: Receipt) => void;
};

// One small "memory receipt" under a future-maya reply. Tapping it opens the MemoryPanel.
// The chip shows the memory's *current* status, so older replies update too: a corrected
// memory gets a ✎, and a forgotten one stays visible (the reply did use it) but faded.
export default function ReceiptChip({ receipt, memory, onOpen }: ReceiptChipProps) {
  const corrected = memory?.status === "corrected";
  const forgotten = memory?.status === "forgotten";

  // "rough code review · aug 7". shortDate splits the date string instead of
  // using new Date(), which would show the day before in US time zones.
  const label = memory ? `${memory.label} · ${shortDate(memory.date)}` : "memory not found";
  // Screen readers can't see a ✎ or a strikethrough, so the status is spelled out:
  // "rough code review · aug 7, corrected by you".
  let status = "";
  if (corrected) {
    status = ", corrected by you";
  } else if (forgotten) {
    status = ", forgotten";
  }

  // The chip's shape and colors, and what's inside it. Both versions below use
  // these, so the welcome page's preview always looks exactly like a real chip.
  const look = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
    forgotten ? "border border-dashed border-line text-muted" : "bg-accent-soft text-foreground/80"
  }`;
  const face = (
    <>
      <span aria-hidden="true" className={forgotten ? "opacity-50" : undefined}>
        🧠
      </span>
      <span className={forgotten ? "line-through" : undefined}>
        {label}
        {/* Only the picture version needs this; the button uses aria-label (below). */}
        {!onOpen && status && <span className="sr-only">{status}</span>}
      </span>
      {corrected && <span aria-hidden="true">✎</span>}
    </>
  );

  // No onOpen: a picture of a chip, with nothing to press. A <span>, not a
  // <button>, so it isn't announced as a control or reachable with Tab. The
  // status goes in screen-reader-only text right after the label, since
  // aria-label isn't meant for a plain span.
  if (!onOpen) {
    return <span className={look}>{face}</span>;
  }

  // aria-label replaces the button's text for screen readers, so it repeats the
  // visible label: "memory used: rough code review · aug 7, corrected by you".
  return (
    <button
      type="button"
      onClick={() => onOpen(receipt)}
      aria-haspopup="dialog"
      aria-label={`memory used: ${label}${status}`}
      className={`${look} transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {face}
    </button>
  );
}
