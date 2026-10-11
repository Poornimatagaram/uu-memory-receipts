import ReceiptChip from "@/components/ReceiptChip";
import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

type ChatBubbleProps = {
  message: ChatMessage;
  memories: Memory[]; // used to look up each receipt's label and date
  // Leave this out and the chips become pictures with nothing to press. The
  // welcome page's preview does that; the chat always passes it.
  onOpenReceipt?: (receipt: Receipt) => void;
};

// A bubble's shape and colors. Every bubble uses this: messages, the welcome
// page's preview, and the typing dots, so they all stay the same.
function bubbleLook(role: ChatMessage["role"]): string {
  const shape = "max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed";
  return role === "user"
    ? `${shape} rounded-br-md bg-accent text-accent-ink`
    : `${shape} rounded-bl-md border border-line bg-surface`;
}

// One message. The user's bubbles sit on the right, future maya's on the left
// with one chip per memory the reply used.
//
// No "use client" and no hooks, so this also works inside a Server Component
// (the welcome page), as long as no onOpenReceipt is passed there.
export default function ChatBubble({ message, memories, onOpenReceipt }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const receipts = message.used ?? []; // user messages have no `used` at all

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <p className={`${bubbleLook(message.role)} whitespace-pre-wrap wrap-break-word`}>
        <span className="sr-only">{isUser ? "you: " : "future maya: "}</span>
        {message.text}
      </p>

      {/* A re-sent question, so the two replies can be compared. */}
      {message.askedAgain && <p className="text-xs text-muted">asked again with updated memories</p>}

      {/* An empty list renders nothing: no chips, no gap, no placeholder. */}
      {receipts.length > 0 && (
        <ul aria-label="memories this reply used" className="flex max-w-[85%] flex-wrap gap-1.5">
          {receipts.map((receipt, index) => (
            <li key={`${index}-${receipt.id}`}>
              <ReceiptChip
                receipt={receipt}
                memory={memories.find((m) => m.id === receipt.id)}
                onOpen={onOpenReceipt}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Three dots in a future-maya bubble while a reply is on its way. It's only a
// picture (aria-hidden): the chat page announces "future maya is typing" in
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
