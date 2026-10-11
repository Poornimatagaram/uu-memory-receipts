"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ChatBubble from "@/components/ChatBubble";
import MemoryPanel from "@/components/MemoryPanel";
import seedMemories from "@/data/memories.json";
import { askFutureMaya } from "@/lib/chat-client";
import { parseMemories } from "@/lib/memories";
import type { Receipt } from "@/lib/receipts";
import type { ChatMessage, Memory } from "@/lib/types";

// These mirror the limits in src/app/api/chat/route.ts. Change both together.
const MAX_HISTORY_MESSAGES = 40; // the route rejects a longer history (usage cap for the demo)
const MAX_MESSAGE_CHARS = 1000; // the route rejects a message this long or longer

const STARTER_PROMPTS = [
  "i don't know where i want to grow anymore",
  "my code review went badly today",
  "should i keep up with my paper reading list?",
];

// Checked once, when this file loads. Invalid entries are dropped (see src/lib/memories.ts).
const SEED_MEMORIES = parseMemories(seedMemories);

// A message whose request failed. It stays on screen, so it's never lost.
// askedAgain: it was an "ask again", so "try again" should repeat it the same way.
type FailedSend = { text: string; reason: string; askedAgain: boolean };

type SendOptions = {
  history?: ChatMessage[]; // the context to send; defaults to the whole chat so far
  askedAgain?: boolean; // marks the new user bubble as a re-sent question
};

// What "ask again" sends: the last question, plus the history from *before* that
// question was first asked. The old answer is left out on purpose: it may quote
// the memory that was just corrected or forgotten, and a reply that can see its
// earlier answer tends to repeat it. Without it, the new reply comes only from
// the updated memories. Returns null when there's no finished exchange to redo.
function findAskAgain(messages: ChatMessage[]): { text: string; history: ChatMessage[] } | null {
  const last = messages.length - 2; // the last question, if the chat ends with its reply
  if (last < 0 || messages[last].role !== "user" || messages[last + 1].role !== "future") {
    return null;
  }
  // If that question was itself an ask-again, step back past the earlier copies
  // and their answers too, to where the question was first asked.
  let start = last;
  while (start >= 2 && messages[start].askedAgain) {
    start -= 2;
  }
  return { text: messages[last].text, history: messages.slice(0, start) };
}

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>(SEED_MEMORIES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<Receipt | null>(null);
  const [failed, setFailed] = useState<FailedSend | null>(null);
  // true right after a memory is corrected or forgotten: shows the "ask again" notice.
  const [memoryNotice, setMemoryNotice] = useState(false);

  // After every change to the conversation, scroll the newest message into view.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, failed]);

  // The next request would send all of `messages` as its history, and the route
  // caps that. We stop here and say so, rather than quietly dropping old messages.
  const chatIsFull = !loading && messages.length > MAX_HISTORY_MESSAGES;

  async function send(text: string, options: SendOptions = {}) {
    const message = text.trim();
    if (message === "" || loading || chatIsFull) {
      return; // ignore empty input, and never send twice at once
    }

    const shown = messages; // everything on screen before this message
    const history = options.history ?? shown; // what the request sends as context
    const askedAgain = options.askedAgain ?? false;
    const userMessage: ChatMessage = askedAgain
      ? { role: "user", text: message, askedAgain: true }
      : { role: "user", text: message };
    // New messages always go at the end, so an ask-again sits below the old reply.
    setMessages([...shown, userMessage]); // show it right away
    setFailed(null);
    setMemoryNotice(false); // a new question is on its way, so the notice has done its job
    setLoading(true);

    try {
      const { reply, used } = await askFutureMaya({ message, history, memories });
      setMessages([...shown, userMessage, { role: "future", text: reply, used }]);
    } catch (error) {
      // Take the message out of the history, so the next request still alternates
      // user/future/user, but keep it on screen with a "try again" button.
      setMessages(shown);
      setFailed({
        text: message,
        reason: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        askedAgain,
      });
    } finally {
      setLoading(false);
    }
  }

  // Re-sends the last question so the new reply can be compared with the old one.
  function askAgain() {
    const target = findAskAgain(messages);
    if (target) {
      void send(target.text, { history: target.history, askedAgain: true });
    }
  }

  // "try again" repeats a failed request the same way it was first sent.
  function retryFailed() {
    if (failed?.askedAgain) {
      askAgain();
    } else if (failed) {
      void send(failed.text);
    }
  }

  // Memories are never edited in place. Each change builds a new array, with a new
  // object for the one memory that changed (see LEARNING.md, Step 6). Passing a
  // function to setMemories means "start from the latest memories", like the
  // messages updates above but without needing a saved copy.
  function correctMemory(id: string, newText: string) {
    setMemories((prev) =>
      prev.map(
        (m): Memory =>
          m.id === id
            ? {
                ...m,
                text: newText,
                status: "corrected",
                // Keep the very first wording, even if this memory was corrected before.
                originalText: m.status === "corrected" ? (m.originalText ?? m.text) : m.text,
              }
            : m,
      ),
    );
    setMemoryNotice(true);
  }

  function forgetMemory(id: string) {
    setMemories((prev) =>
      prev.map((m): Memory => (m.id === id ? { ...m, status: "forgotten" } : m)),
    );
    setMemoryNotice(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser's own full-page form submit
    if (loading) {
      return; // keep the draft in the box; it can go once the reply arrives
    }
    void send(input);
    setInput("");
  }

  function startNewChat() {
    setMessages([]);
    setFailed(null);
    setMemoryNotice(false);
  }

  // The panel stores only the tapped receipt. The memory is looked up fresh from
  // state, so it always shows the current version, including right after a correction.
  const openMemory = openReceipt ? memories.find((m) => m.id === openReceipt.id) : undefined;
  const showStarters = messages.length === 0 && failed === null;
  // Offered only when there's a finished exchange to redo (so never while a reply is
  // loading). While a failed message is waiting, its own "try again" is the way
  // forward, and it already uses the new memories.
  const canAskAgain = !chatIsFull && failed === null && findAskAgain(messages) !== null;

  return (
    <>
      {/* inert: while the panel is open, nothing behind it can be clicked or focused. */}
      <main
        inert={openReceipt !== null}
        className="mx-auto flex h-dvh w-full max-w-md flex-col sm:border-x sm:border-line"
      >
        <header className="border-b border-line px-5 py-4">
          <h1 className="text-lg leading-tight font-medium">future maya</h1>
          <p className="text-sm text-muted">maya, two years from now</p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-6">
          {showStarters ? (
            <div className="flex h-full flex-col justify-end gap-3 pb-2">
              <p className="px-1 text-sm leading-relaxed text-muted">
                future maya remembers the last few months. every reply shows the memories it used.
                start with one of these, or write your own.
              </p>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="rounded-2xl border border-line bg-surface px-4 py-3 text-left leading-snug transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : (
            <ol className="flex flex-col gap-5">
              {messages.map((message, index) => (
                // Messages are only ever appended, so their position is a stable key.
                <li key={index}>
                  <ChatBubble message={message} memories={memories} onOpenReceipt={setOpenReceipt} />
                </li>
              ))}

              {failed && (
                <li className="flex flex-col items-end gap-1.5">
                  <div className="w-full opacity-70">
                    <ChatBubble
                      message={{ role: "user", text: failed.text, askedAgain: failed.askedAgain }}
                      memories={memories}
                      onOpenReceipt={setOpenReceipt}
                    />
                  </div>
                  <p role="alert" className="max-w-[85%] text-right text-xs leading-relaxed text-danger">
                    not sent. {failed.reason}{" "}
                    <button
                      type="button"
                      onClick={retryFailed}
                      className="font-medium underline underline-offset-2"
                    >
                      try again
                    </button>
                  </p>
                </li>
              )}
            </ol>
          )}

          {/* role="status" lets screen readers announce the typing line. */}
          <p role="status" className="px-1 pt-4 pb-4 text-sm text-muted">
            {loading && <span className="motion-safe:animate-pulse">future maya is typing...</span>}
          </p>
          <div ref={bottomRef} />
        </div>

        {memoryNotice && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-accent-soft px-5 py-2.5">
            <p className="text-sm leading-snug">future maya will use this from now on.</p>
            {canAskAgain && (
              <button
                type="button"
                onClick={askAgain}
                className="shrink-0 rounded-full border border-accent/60 bg-surface px-3 py-1 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                ask again
              </button>
            )}
          </div>
        )}

        {chatIsFull ? (
          <div className="border-t border-line px-5 py-4">
            <p className="text-sm leading-relaxed">
              {
                "this chat has reached the demo's length limit, which keeps the public demo free to run. start a new chat to keep talking. maya's memories stay as they are."
              }
            </p>
            <button
              type="button"
              onClick={startNewChat}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              start a new chat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line px-4 py-3">
            <label htmlFor="chat-input" className="sr-only">
              message future maya
            </label>
            {/* text-base (16px) stops iPhones from zooming in when the box is tapped. */}
            <input
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={MAX_MESSAGE_CHARS - 1}
              placeholder="write to future maya..."
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-base placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ""}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
            >
              send
            </button>
          </form>
        )}
      </main>

      {openReceipt && (
        <MemoryPanel
          receipt={openReceipt}
          memory={openMemory}
          onClose={() => setOpenReceipt(null)}
          onCorrect={correctMemory}
          onForget={forgetMemory}
        />
      )}
    </>
  );
}
