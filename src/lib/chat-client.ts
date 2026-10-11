import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

// The browser side of POST /api/chat (src/app/api/chat/route.ts).
export type ChatRequest = {
  message: string;
  history: ChatMessage[]; // the messages before `message`
  memories: Memory[];
};

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
      body: JSON.stringify(request),
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
