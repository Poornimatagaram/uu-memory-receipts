import { useState } from "react";
import { shortDate } from "@/lib/dates";
import type { Receipt } from "@/lib/receipts";
import type { Memory } from "@/lib/types";
import { usePlayOnce } from "@/lib/use-play-once";

type ReceiptChipProps = {
  receipt: Receipt;
  memory: Memory | undefined; // undefined when no memory has this receipt's id
  // Leave this out for a chip that's only a picture (the welcome page's preview).
  onOpen?: (receipt: Receipt) => void;
};

// One small "memory receipt" under a future-maya reply. Tapping it opens the MemoryPanel.
// The chip shows the memory's *current* status, so older replies update too: a corrected
// memory gets a ✎, and a forgotten one stays visible (the reply did use it) but faded.
//
// It uses a hook (useState), so it only runs in Client Components: the chat page,
// and the welcome page's preview (src/components/ReplyPreview.tsx).
export default function ReceiptChip({ receipt, memory, onOpen }: ReceiptChipProps) {
  const corrected = memory?.status === "corrected";
  const forgotten = memory?.status === "forgotten";

  // Was the memory already corrected when this chip first appeared? useState keeps
  // the first value it's given and ignores later ones, so this never changes. A chip
  // that's corrected *while you watch* pops its ✎; one that arrives corrected doesn't.
  const [correctedAtFirstRender] = useState(corrected);

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
  //
  // Forgetting fades the chip into its quiet look instead of snapping (300ms, and
  // only with motion-safe:, so it's instant with reduced motion):
  // - the fill fades out and the text fades to muted (transition-colors);
  // - the dashed outline fades in. border-style can't be animated (it's either
  //   dashed or not), so the outline lives on a ::after layer (the after: classes)
  //   that's always there, and only its opacity changes. As a bonus the chip no
  //   longer grows by the border's 1px on each side when it's forgotten.
  // These are transitions, not keyframe animations: a transition only runs when a
  // value changes, so it can't replay later (see LEARNING.md, Step 9).
  const fade = "motion-safe:duration-300 motion-safe:ease-out";
  const look = `relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs motion-safe:transition-colors ${fade} after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-dashed after:border-line motion-safe:after:transition-opacity motion-safe:after:duration-300 ${
    forgotten ? "bg-transparent text-muted after:opacity-100" : "bg-accent-soft text-foreground/80 after:opacity-0"
  }`;
  const face = (
    <>
      <span
        aria-hidden="true"
        className={`motion-safe:transition-opacity ${fade} ${forgotten ? "opacity-50" : ""}`}
      >
        🧠
      </span>
      {/* The strikethrough fades in too. text-decoration-line can't be animated
          either, but its color can: before, the line's color is transparent; forgetting
          turns the line on (invisible for now) and fades its color to muted. */}
      <span
        className={`motion-safe:transition-[text-decoration-color] ${fade} ${
          forgotten ? "line-through decoration-muted" : "decoration-transparent"
        }`}
      >
        {label}
        {/* Only the picture version needs this; the button uses aria-label (below). */}
        {!onOpen && status && <span className="sr-only">{status}</span>}
      </span>
      {corrected && <EditMark pop={!correctedAtFirstRender} />}
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
      className={`${look} hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {face}
    </button>
  );
}

// The ✎ on a corrected chip. With pop, it pops in once (the memory was just
// corrected), and usePlayOnce takes the animation off again when it's done.
// data-edit-mark lets the welcome preview's loop find this ✎ and time its own pop.
function EditMark({ pop }: { pop: boolean }) {
  const [popping, popRef] = usePlayOnce(pop);
  return (
    <span
      ref={popRef}
      aria-hidden="true"
      data-edit-mark=""
      className={popping ? "motion-safe:animate-pop" : undefined}
    >
      ✎
    </span>
  );
}
