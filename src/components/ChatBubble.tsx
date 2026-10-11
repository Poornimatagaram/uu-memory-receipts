import ReceiptChip from "@/components/ReceiptChip";
import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

type ChatBubbleProps = {
  message: ChatMessage;
  memories: Memory[]; // used to look up each receipt's label and date
  onOpenReceipt: (receipt: Receipt) => void;
};

// One message. The user's bubbles sit on the right, future maya's on the left
// with one chip per memory the reply used.
export default function ChatBubble({ message, memories, onOpenReceipt }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const receipts = message.used ?? []; // user messages have no `used` at all

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "rounded-br-md bg-accent text-accent-ink"
            : "rounded-bl-md border border-line bg-surface"
        }`}
      >
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
