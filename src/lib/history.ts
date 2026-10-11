import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

// What one history item looks like in a request. The route reads only these two
// fields, so the receipts and the UI-only fields stay in the browser.
export type HistoryItem = Pick<ChatMessage, "role" | "text">;

// Sent instead of an earlier reply that relied on a memory Maya has since changed.
export const REDACTED_REPLY = "[earlier reply removed: it used a memory maya has since changed]";

// Records the text each cited memory had at the moment a reply arrived. Call it
// with the memories the request was sent with, so the snapshot matches what
// Claude actually saw, even if the user edited a memory while waiting.
export function snapshotUsedText(used: Receipt[], memories: Memory[]): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const receipt of used) {
    const memory = memories.find((m) => m.id === receipt.id);
    if (memory) {
      snapshot[receipt.id] = memory.text;
    }
  }
  return snapshot;
}

// True if any memory this reply cited has changed since the reply was written:
// - forgotten: always counts as changed.
// - otherwise: changed if its text now differs from the text in the snapshot.
//   A reply written *after* a correction saw the corrected text, so it's fine
//   until the memory is corrected again.
// A cited memory we can't find, or that has no snapshot, counts as changed: we
// can't show it's safe, so we leave the reply out.
export function usedChangedMemory(message: ChatMessage, memories: Memory[]): boolean {
  return (message.used ?? []).some((receipt) => {
    const now = memories.find((m) => m.id === receipt.id);
    if (now === undefined || now.status === "forgotten") {
      return true;
    }
    return now.text !== message.usedText?.[receipt.id];
  });
}

// The history a request actually sends. An old reply can repeat a memory in its
// own words, so if that memory was forgotten or corrected afterwards, sending the
// reply would carry the old version back to Claude. Those replies are swapped
// for REDACTED_REPLY. The user's own messages are sent as they are.
// This changes only the request: the chat on screen keeps the original replies.
export function historyForRequest(history: ChatMessage[], memories: Memory[]): HistoryItem[] {
  return history.map((message) => ({
    role: message.role,
    text:
      message.role === "future" && usedChangedMemory(message, memories) ? REDACTED_REPLY : message.text,
  }));
}
