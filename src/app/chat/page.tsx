"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import AmbientBackground from "@/components/AmbientBackground";
import ChatBubble, { TypingBubble } from "@/components/ChatBubble";
import MemoryPanel from "@/components/MemoryPanel";
import seedMemories from "@/data/memories.json";
import { askFutureMaya } from "@/lib/chat-client";
import { snapshotUsedText } from "@/lib/history";
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
// askedAgain: it was an "Ask again", so "Try again" should repeat it the same way.
type FailedSend = { text: string; reason: string; askedAgain: boolean };

type SendOptions = {
  history?: ChatMessage[]; // the context to send; defaults to the whole chat so far
  askedAgain?: boolean; // marks the new user bubble as a re-sent question
};

// What "Ask again" sends: the last question, plus the history from *before* that
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

// The chat at /chat. This file lives in src/app/chat/, and that folder is the URL.
// Its tab title comes from src/app/chat/layout.tsx, because a "use client" file
// can't export metadata.
export default function ChatPage() {
  const [memories, setMemories] = useState<Memory[]>(SEED_MEMORIES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<Receipt | null>(null);
  const [failed, setFailed] = useState<FailedSend | null>(null);
  // true right after a memory is corrected or forgotten: shows the "Ask again" notice.
  const [memoryNotice, setMemoryNotice] = useState(false);
  // true while the "Start over?" question is showing under the header.
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);

  // Numbers each request. "Start over" bumps it too, so when a reply comes back
  // for an older request (one sent before starting over), send() can tell it's
  // stale and drop it instead of letting it land in the fresh chat.
  // A ref, not state: changing it shouldn't redraw anything.
  const latestRequest = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const startOverButtonRef = useRef<HTMLButtonElement>(null);
  const cancelStartOverRef = useRef<HTMLButtonElement>(null);

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

    latestRequest.current += 1;
    const requestId = latestRequest.current;
    // False once the user has started over since this request was sent.
    const stillCurrent = () => requestId === latestRequest.current;

    try {
      // askFutureMaya builds the request body: it drops forgotten memories and
      // redacts old replies that used a since-changed memory (src/lib/history.ts).
      const { reply, used } = await askFutureMaya({ message, history, memories });
      if (!stillCurrent()) {
        return; // a reply for a chat that's gone: drop it
      }
      // `memories` is still the list this request sent (each render keeps its own
      // snapshot), so usedText records what Claude saw, even if a memory was
      // edited while we waited.
      const futureMessage: ChatMessage = {
        role: "future",
        text: reply,
        used,
        usedText: snapshotUsedText(used, memories),
      };
      setMessages([...shown, userMessage, futureMessage]);
    } catch (error) {
      if (!stillCurrent()) {
        return;
      }
      // Take the message out of the history, so the next request still alternates
      // user/future/user, but keep it on screen with a "Try again" button.
      setMessages(shown);
      setFailed({
        text: message,
        reason: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        askedAgain,
      });
    } finally {
      // `finally` runs even after the early returns above. A stale request leaves
      // `loading` alone: start over already reset it, and a newer request may own it.
      if (stillCurrent()) {
        setLoading(false);
      }
    }
  }

  // Re-sends the last question so the new reply can be compared with the old one.
  function askAgain() {
    const target = findAskAgain(messages);
    if (target) {
      void send(target.text, { history: target.history, askedAgain: true });
    }
  }

  // "Try again" repeats a failed request the same way it was first sent.
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

  // "Start over" asks first, because it throws away the user's memory fixes.
  // flushSync draws the question now, so its "Cancel" button exists to focus.
  function askToStartOver() {
    flushSync(() => setConfirmingStartOver(true));
    cancelStartOverRef.current?.focus(); // the safe choice, like "Forget this"
  }

  function cancelStartOver() {
    flushSync(() => setConfirmingStartOver(false));
    startOverButtonRef.current?.focus();
  }

  // Back to the demo's first moment: the seed memories, an empty chat, nothing pending.
  function startOver() {
    latestRequest.current += 1; // any reply still on its way is now stale (see send)
    flushSync(() => {
      setMemories(SEED_MEMORIES);
      setMessages([]);
      setInput("");
      setLoading(false);
      setOpenReceipt(null);
      setFailed(null);
      setMemoryNotice(false);
      setConfirmingStartOver(false);
    });
    inputRef.current?.focus(); // ready for a new first message
  }

  // The panel stores only the tapped receipt. The memory is looked up fresh from
  // state, so it always shows the current version, including right after a correction.
  const openMemory = openReceipt ? memories.find((m) => m.id === openReceipt.id) : undefined;
  const showStarters = messages.length === 0 && failed === null;
  // Offered only when there's a finished exchange to redo (so never while a reply is
  // loading). While a failed message is waiting, its own "Try again" is the way
  // forward, and it already uses the new memories.
  const canAskAgain = !chatIsFull && failed === null && findAskAgain(messages) !== null;
  // Memories the user corrected or forgot. Starting over would undo these.
  const changedCount = memories.filter((m) => m.status !== "active").length;
  const nothingToReset = messages.length === 0 && failed === null && changedCount === 0;
  let startOverQuestion = "Start over? This clears the chat.";
  if (changedCount === 1) {
    startOverQuestion = "Start over? This clears the chat and undoes your change to 1 memory.";
  } else if (changedCount > 1) {
    startOverQuestion = `Start over? This clears the chat and undoes your changes to ${changedCount} memories.`;
  }

  return (
    <>
      {/* The welcome page's background, calmed down: fainter shapes that hold
          still, so nothing moves behind the conversation. It's fixed behind
          everything, so it sits outside <main> (and outside its inert). */}
      <AmbientBackground mood="calm" />

      {/* inert: while the panel is open, nothing behind it can be clicked or focused.
          The column is the full width on phones and at most 768px (max-w-3xl) on
          bigger screens. From md (768px) up there's room beside it, so hairlines
          mark its edges. */}
      <main
        inert={openReceipt !== null}
        className="mx-auto flex h-dvh w-full max-w-3xl flex-col md:border-x md:border-line"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Back to the welcome page. aria-label gives the arrow a name screen
                readers can say. With cacheComponents, Next.js hides this page
                instead of throwing it away, so the chat is still here on return. */}
            <Link
              href="/"
              aria-label="Back to the welcome page"
              className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ←
            </Link>
            {/* Decoration: the heading next to it already says who this is. */}
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display font-medium text-accent"
            >
              M
            </span>
            <div className="min-w-0">
              {/* Her name in the heading font. text-xl: Fraunces looks smaller than
                  Geist at the same size. */}
              <h1 className="font-display text-xl leading-tight font-medium">Future Maya</h1>
              <p className="text-sm text-muted">Maya, two years from now</p>
            </div>
          </div>
          <button
            ref={startOverButtonRef}
            type="button"
            onClick={askToStartOver}
            disabled={nothingToReset}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 disabled:hover:text-muted"
          >
            Start over
          </button>
        </header>

        {confirmingStartOver && (
          // A labelled group, like the panel's "Forget this memory?" question. Escape means cancel.
          <div
            role="group"
            aria-labelledby="start-over-question"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancelStartOver();
              }
            }}
            className="border-b border-line bg-surface px-5 py-3"
          >
            <p id="start-over-question" className="text-sm leading-snug">
              {startOverQuestion}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startOver}
                className="rounded-full border border-danger/60 px-3.5 py-1.5 text-sm font-medium text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Yes, start over
              </button>
              <button
                ref={cancelStartOverRef}
                type="button"
                onClick={cancelStartOver}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* [--bubble-max:75%]: every bubble in here is at most 75% of the column
            (see bubbleLook in ChatBubble.tsx). */}
        <div className="flex-1 overflow-y-auto px-4 pt-6 [--bubble-max:75%]">
          {showStarters ? (
            // max-w-xl keeps the starters, and their lines of text, a readable
            // width when the column is wide.
            <div className="flex h-full max-w-xl flex-col justify-end gap-3 pb-2">
              <p className="px-1 text-sm leading-relaxed text-muted">
                Future Maya remembers the last few months. Every reply shows the memories it used.
                Start with one of these, or write your own.
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
              <p className="px-1 pt-1 text-xs leading-relaxed text-muted">
                Tap a 🧠 under her replies to see what she remembered.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-5">
              {messages.map((message, index) => (
                // Messages are only ever appended, so their position is a stable key.
                // That also means a bubble appears exactly once, when its message
                // arrives, which is when animateArrival plays its effects.
                <li key={index}>
                  <ChatBubble
                    message={message}
                    memories={memories}
                    onOpenReceipt={setOpenReceipt}
                    animateArrival
                    // A reply to an "Ask again" glows softly as it arrives.
                    glowOnArrival={message.role === "future" && messages[index - 1]?.askedAgain === true}
                  />
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
                  <p role="alert" className="max-w-(--bubble-max) text-right text-xs leading-relaxed text-danger">
                    Not sent. {failed.reason}{" "}
                    <button
                      type="button"
                      onClick={retryFailed}
                      className="font-medium underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </p>
                </li>
              )}
            </ol>
          )}

          {/* role="status": screen readers announce what appears inside it, here
              "Future Maya is typing". The dots are only for the eyes (aria-hidden). */}
          <div role="status" className="py-4">
            {loading && (
              // pt-1 + the py-4 above: 20px, the same gap as between messages.
              <div className="pt-1">
                <span className="sr-only">Future Maya is typing</span>
                <TypingBubble />
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {memoryNotice && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-accent-soft px-5 py-2.5">
            <p className="text-sm leading-snug">Future Maya will use your changes from now on</p>
            {canAskAgain && (
              <button
                type="button"
                onClick={askAgain}
                className="shrink-0 rounded-full border border-accent/60 bg-surface px-3 py-1 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Ask again
              </button>
            )}
          </div>
        )}

        {chatIsFull ? (
          <div className="border-t border-line px-5 py-4">
            <p className="max-w-xl text-sm leading-relaxed">
              {
                "This chat has reached the demo's length limit, which keeps the public demo free to run. Start a new chat to keep talking. Maya's memories stay as they are."
              }
            </p>
            <button
              type="button"
              onClick={startNewChat}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line px-4 py-3">
            <label htmlFor="chat-input" className="sr-only">
              Message future Maya
            </label>
            {/* text-base (16px) stops iPhones from zooming in when the box is tapped. */}
            <input
              ref={inputRef}
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={MAX_MESSAGE_CHARS - 1}
              placeholder="Write to future Maya..."
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-base placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            {/* Solid green when there's something to send. While it's disabled (an
                empty box, or a reply still loading), the disabled: classes swap in a
                quiet look that matches the message box next to it: a surface fill, a
                hairline border and muted text, still readable in light and dark. */}
            <button
              type="submit"
              disabled={loading || input.trim() === ""}
              className="rounded-full border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:border-line disabled:bg-surface disabled:text-muted"
            >
              Send
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
