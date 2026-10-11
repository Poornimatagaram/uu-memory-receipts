import { historyForRequest, type HistoryItem } from "@/lib/history";
import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

// The browser side of POST /api/chat (src/app/api/chat/route.ts).
export type ChatRequest = {
  message: string;
  history: ChatMessage[]; // the messages before `message`, as shown on screen
  memories: Memory[]; // all of maya's memories, in their current state
};

// The fields of a memory the server needs. `label` is only for chips, and
// `originalText` is the wording the user said was wrong, so neither is sent.
type MemoryForRequest = Pick<Memory, "id" | "type" | "date" | "text" | "status">;

// What actually goes over the wire.
type ChatRequestBody = {
  message: string;
  history: HistoryItem[];
  memories: MemoryForRequest[];
};

// The one place a request body is built, so every way of sending (a normal
// message, "ask again", "try again") gets the same treatment:
// - forgotten memories are left out (the route also drops them, as a backstop),
// - each memory is copied field by field, so nothing extra like `originalText` slips in,
// - earlier replies that used a since-changed memory are redacted (src/lib/history.ts).
function buildRequestBody({ message, history, memories }: ChatRequest): ChatRequestBody {
  return {
    message,
    history: historyForRequest(history, memories),
    memories: memories
      .filter((m) => m.status !== "forgotten")
      .map(({ id, type, date, text, status }) => ({ id, type, date, text, status })),
  };
}

export type ChatReply = {
  reply: string;
  used: Receipt[];
};

/**
 * Asks future Maya for a reply.
 * Resolves with { reply, used }, or throws an Error whose message is safe to show.
 */
export async function askFutureMaya(request: ChatRequest): Promise<ChatReply> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(request)),
    });
  } catch {
    // fetch only throws when no response came back at all (offline, server down).
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  // Error pages aren't always JSON, so a parse failure becomes null instead of a crash.
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // The route's { error } text is written for people, so show it when it's there.
    throw new Error(
      readErrorText(data) ?? `Something went wrong (error ${response.status}). Please try again.`,
    );
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Future Maya's reply came back garbled. Please try again.");
  }
  const { reply, used } = data as Record<string, unknown>;
  if (typeof reply !== "string") {
    throw new Error("Future Maya's reply came back garbled. Please try again.");
  }

  // A missing or malformed `used` just means no chips, not a failed reply.
  return { reply, used: Array.isArray(used) ? used.filter(isReceipt) : [] };
}

function readErrorText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const { error } = data as Record<string, unknown>;
  return typeof error === "string" && error.trim() !== "" ? error : null;
}

function isReceipt(value: unknown): value is Receipt {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, why } = value as Record<string, unknown>;
  return typeof id === "string" && typeof why === "string";
}
