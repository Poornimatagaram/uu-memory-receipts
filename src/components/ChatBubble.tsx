import type { ReactNode } from "react";
import ReceiptChip from "@/components/ReceiptChip";
import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";
import { usePlayOnce } from "@/lib/use-play-once";

// Chips under a new reply rise in one after another: the first after 150ms, then
// one every 80ms.
const CHIP_FIRST_DELAY_MS = 150;
const CHIP_STAGGER_MS = 80;

type ChatBubbleProps = {
  message: ChatMessage;
  memories: Memory[]; // used to look up each receipt's label and date
  // Leave this out and the chips become pictures with nothing to press. The
  // welcome page's preview does that; the chat always passes it.
  onOpenReceipt?: (receipt: Receipt) => void;
  // The chat sets this: when the bubble first appears, its chips rise in. The
  // preview's static card leaves it off, so it's still.
  animateArrival?: boolean;
  // A reply to an "Ask again": a soft glow around the bubble, once, as it arrives.
  glowOnArrival?: boolean;
};

// A bubble's shape and colors. Every bubble uses this: messages, the welcome
// page's preview, and the typing dots, so they all stay the same.
// The widest a bubble gets is --bubble-max, a CSS variable, or 85% of its column
// when nothing sets it. The chat sets it to 75% on the scrolling area around its
// messages, and every bubble inside inherits it, like a default argument that a
// parent can override. The welcome preview sets nothing, so its wording keeps
// wrapping exactly as it was tuned to.
export function bubbleLook(role: ChatMessage["role"]): string {
  const shape =
    "max-w-[var(--bubble-max,85%)] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap wrap-break-word";
  return role === "user"
    ? `${shape} rounded-br-md bg-accent text-accent-ink`
    : `${shape} rounded-bl-md border border-line bg-surface`;
}

// The column a message sits in, and the row of chips under a reply. Exported
// with bubbleLook for the welcome page's preview loop (src/components/ReplyPreview.tsx),
// which builds its moving copy of a reply from the same pieces.
export function messageColumnLook(role: ChatMessage["role"]): string {
  return `flex flex-col gap-2 ${role === "user" ? "items-end" : "items-start"}`;
}
export const CHIP_ROW_LOOK = "flex max-w-[85%] flex-wrap gap-1.5";

// One message. The user's bubbles sit on the right, future Maya's on the left
// with one chip per memory the reply used.
//
// It uses hooks (through usePlayOnce), so it only runs in Client Components:
// the chat page, and the welcome page's preview.
export default function ChatBubble({
  message,
  memories,
  onOpenReceipt,
  animateArrival = false,
  glowOnArrival = false,
}: ChatBubbleProps) {
  const isUser = message.role === "user";
  const receipts = message.used ?? []; // user messages have no `used` at all
  // Plays once when the bubble appears, then the class comes off for good.
  const [glowing, glowRef] = usePlayOnce(animateArrival && glowOnArrival);

  return (
    <div className={messageColumnLook(message.role)}>
      <p
        ref={glowRef}
        className={`${bubbleLook(message.role)} ${glowing ? "motion-safe:glow-once" : ""}`}
      >
        <span className="sr-only">{isUser ? "You: " : "Future Maya: "}</span>
        {message.text}
      </p>

      {/* A re-sent question, so the two replies can be compared. */}
      {message.askedAgain && <p className="text-xs text-muted">Asked again with updated memories</p>}

      {/* An empty list renders nothing: no chips, no gap, no placeholder. */}
      {receipts.length > 0 && (
        <ul aria-label="Memories this reply used" className={CHIP_ROW_LOOK}>
          {receipts.map((receipt, index) => (
            <ArrivingChip key={`${index}-${receipt.id}`} index={index} animate={animateArrival}>
              <ReceiptChip
                receipt={receipt}
                memory={memories.find((m) => m.id === receipt.id)}
                onOpen={onOpenReceipt}
              />
            </ArrivingChip>
          ))}
        </ul>
      )}
    </div>
  );
}

// One chip's <li>. With animate, it fades and rises in once when it first appears,
// `index` steps later than the first chip. The delay is an inline style because
// it's different for each chip. (A plain [animation-delay:...] class would be
// reset by animate-chip-in's shorthand; an inline style always wins. See Step 8.)
function ArrivingChip({ index, animate, children }: { index: number; animate: boolean; children: ReactNode }) {
  const [arriving, arrivalRef] = usePlayOnce(animate);
  return (
    <li
      ref={arrivalRef}
      className={arriving ? "motion-safe:animate-chip-in" : undefined}
      style={arriving ? { animationDelay: `${CHIP_FIRST_DELAY_MS + index * CHIP_STAGGER_MS}ms` } : undefined}
    >
      {children}
    </li>
  );
}

// Three dots in a future-Maya bubble while a reply is on its way. It's only a
// picture (aria-hidden): the chat page announces "Future Maya is typing" in
// its role="status" line. The dots bob one after another (each starts 160ms
// later), and motion-safe: keeps them still for anyone who asks for reduced motion.
export function TypingBubble() {
  return (
    <div aria-hidden="true" className={`${bubbleLook("future")} w-fit`}>
      {/* h-[1.625rem]: one line of leading-relaxed text, so this is as tall as a one-line reply. */}
      <span className="flex h-[1.625rem] items-center gap-1.5">
        {["", "motion-safe:[animation-delay:160ms]", "motion-safe:[animation-delay:320ms]"].map((delay) => (
          <span
            key={delay}
            className={`size-1.5 rounded-full bg-muted motion-safe:animate-typing-dot ${delay}`}
          />
        ))}
      </span>
    </div>
  );
}
