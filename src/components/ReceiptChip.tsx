import type { Receipt } from "@/lib/receipts";
import type { Memory } from "@/lib/types";

type ReceiptChipProps = {
  receipt: Receipt;
  memory: Memory | undefined; // undefined when no memory has this receipt's id
  onOpen: (receipt: Receipt) => void;
};

// One small "memory receipt" under a future-maya reply. Tapping it opens the MemoryPanel.
// The chip shows the memory's *current* status, so older replies update too: a corrected
// memory gets a ✎, and a forgotten one stays visible (the reply did use it) but faded.
export default function ReceiptChip({ receipt, memory, onOpen }: ReceiptChipProps) {
  const corrected = memory?.status === "corrected";
  const forgotten = memory?.status === "forgotten";

  // The date is shown exactly as stored. new Date("2026-07-13") would
  // read it as UTC midnight and show July 12 in US time zones.
  const label = memory ? `${memory.date} · ${memory.type}` : "memory not found";
  // Screen readers can't see a ✎ or a strikethrough, so aria-label spells the
  // status out: "memory used: 2026-08-07 · feeling, corrected by you". It
  // replaces the button's text for screen readers, so it repeats the visible label.
  let status = "";
  if (corrected) {
    status = ", corrected by you";
  } else if (forgotten) {
    status = ", forgotten";
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(receipt)}
      aria-haspopup="dialog"
      aria-label={`memory used: ${label}${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        forgotten
          ? "border border-dashed border-line text-muted hover:text-foreground"
          : "bg-accent-soft text-foreground/80 hover:text-foreground"
      }`}
    >
      <span aria-hidden="true" className={forgotten ? "opacity-50" : undefined}>
        🧠
      </span>
      <span className={forgotten ? "line-through" : undefined}>{label}</span>
      {corrected && <span aria-hidden="true">✎</span>}
    </button>
  );
}
