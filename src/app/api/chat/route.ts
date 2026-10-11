import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, REPLY_SCHEMA } from "@/lib/prompt";
import { verifyReceipts, type Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

// POST /api/chat
// Request body: { message: string, history: ChatMessage[], memories: Memory[] }
// Success (200): { reply: string, used: Receipt[] }
// Failure (4xx/5xx): { error: string }

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 600;
const MAX_MESSAGE_CHARS = 1000; // a message must be shorter than this
const MAX_HISTORY_MESSAGES = 40; // usage cap for the public demo

// Shown when Claude's reply can't be parsed. Written in future Maya's voice.
const FALLBACK_REPLY = "hmm, my thoughts got tangled for a sec. can you say that again?";

// Shown when Claude declines to answer (stop_reason "refusal"). It points to
// real support, in case the message that triggered the refusal was a hard one.
const REFUSAL_REPLY =
  "i can't answer that one here. if something heavy is going on, please talk to someone you trust, or call or text 988 if you're in the US.";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  // 1. Read the body and check its shape. Every failure is a 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const { message, history, memories } = body as Record<string, unknown>;

  if (typeof message !== "string" || message.trim() === "") {
    return jsonError("`message` must be a non-empty string.", 400);
  }
  if (message.length >= MAX_MESSAGE_CHARS) {
    return jsonError(`\`message\` must be under ${MAX_MESSAGE_CHARS} characters.`, 400);
  }
  if (!Array.isArray(history)) {
    return jsonError("`history` must be an array.", 400);
  }
  if (history.length > MAX_HISTORY_MESSAGES) {
    return jsonError(`\`history\` can have at most ${MAX_HISTORY_MESSAGES} messages.`, 400);
  }
  if (!Array.isArray(memories)) {
    return jsonError("`memories` must be an array.", 400);
  }

  // 2. Forgotten memories never reach Claude. Corrected ones are labelled in the prompt.
  // `as Memory[]` is a promise to the compiler, not a runtime check (see LEARNING.md, Step 3).
  const activeMemories = (memories as Memory[]).filter((m) => m.status !== "forgotten");

  // 3. Call Claude. The key comes only from the environment (.env.local locally,
  // project settings on Vercel). Never hardcode it.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      "The server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart the dev server.",
      500,
    );
  }
  const client = new Anthropic({ apiKey });

  // Our "future" role is Claude's "assistant" role. We send only the text, not the receipts.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(history as ChatMessage[]).map(
      (m): Anthropic.Beta.BetaMessageParam => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }),
    ),
    { role: "user", content: message },
  ];

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(activeMemories),
      messages,
      output_config: {
        // Chat replies are short, so low effort keeps thinking brief and leaves
        // the 600-token budget for the reply itself.
        effort: "low",
        // Force the reply to match {"reply": ..., "used": [...]} (see src/lib/prompt.ts).
        format: { type: "json_schema", schema: REPLY_SCHEMA },
      },
      // If a safety classifier declines, retry server-side on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    return claudeErrorResponse(error);
  }

  if (response.stop_reason === "refusal") {
    return Response.json({ reply: REFUSAL_REPLY, used: [] });
  }

  // The response is a list of content blocks (text, thinking, ...). Keep only the text.
  let rawText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      rawText += block.text;
    }
  }

  // 4. Parse Claude's JSON. If it's malformed, reply with a friendly fallback.
  const parsed = parseFutureReply(rawText);
  if (parsed === null) {
    console.warn(`Could not parse Claude's reply as JSON (stop_reason: ${response.stop_reason}).`);
    return Response.json({ reply: FALLBACK_REPLY, used: [] });
  }

  // 5. Only receipts for memories that really exist and are active reach the user.
  const used = verifyReceipts(
    parsed.used,
    activeMemories.map((m) => m.id),
  );

  return Response.json({ reply: parsed.reply, used });
}

// Expected shape: {"reply": "...", "used": [{"id": "m01", "why": "..."}]}
// Returns null when the text isn't that shape, so the caller can fall back.
// Structured outputs make bad JSON rare, but a reply cut off at max_tokens can
// still be incomplete, so we never trust the text blindly.
function parseFutureReply(rawText: string): { reply: string; used: Receipt[] } | null {
  // Strip ```json ... ``` fences, in case the model adds them anyway.
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const { reply, used } = parsed as Record<string, unknown>;
  if (typeof reply !== "string" || reply.trim() === "" || !Array.isArray(used)) {
    return null;
  }

  // Drop any receipt that isn't shaped like { id: string, why: string }.
  return { reply, used: used.filter(isReceipt) };
}

// A "type guard": if it returns true, TypeScript treats `value` as a Receipt afterwards.
function isReceipt(value: unknown): value is Receipt {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, why } = value as Record<string, unknown>;
  return typeof id === "string" && typeof why === "string";
}

// Turns an SDK error into a JSON error with a sensible status.
// Most specific class first: AuthenticationError and RateLimitError are both APIErrors.
function claudeErrorResponse(error: unknown) {
  console.error("Claude call failed:", error instanceof Error ? error.message : error);

  if (error instanceof Anthropic.AuthenticationError) {
    return jsonError("The server's Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return jsonError("Future Maya is getting a lot of messages right now. Try again in a minute.", 429);
  }
  if (error instanceof Anthropic.APIError) {
    // Any other API failure, including network errors (APIConnectionError).
    return jsonError("Couldn't get a reply from Claude. Please try again.", 502);
  }
  return jsonError("Something went wrong on the server.", 500);
}
