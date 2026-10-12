import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { flushSync } from "react-dom";
import { longDate } from "@/lib/dates";
import type { Receipt } from "@/lib/receipts";
import type { Memory } from "@/lib/types";
import { usePlayOnce } from "@/lib/use-play-once";

// Long enough for a few sentences (the longest seed memory is 227 characters).
const MAX_MEMORY_CHARS = 500;

type MemoryPanelProps = {
  receipt: Receipt; // the chip that was tapped: which memory, and why it was used
  memory: Memory | undefined; // undefined when that id isn't in the current memories
  onClose: () => void;
  onCorrect: (id: string, newText: string) => void; // the page stores the fixed text
  onForget: (id: string) => void; // the page marks the memory forgotten
};

// What the panel is showing. Only the panel needs this, so it's the panel's own
// state. The memories themselves belong to the page: the panel asks the page to
// change one through onCorrect or onForget, and never edits it itself.
type Mode = "view" | "editing" | "confirmingForget";

// The detail view behind a receipt chip: a bottom sheet on phones, a side panel
// from the md breakpoint (768px) up. The page only renders it while it's open.
export default function MemoryPanel({ receipt, memory, onClose, onCorrect, onForget }: MemoryPanelProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(""); // the textarea's text while editing
  const [announcement, setAnnouncement] = useState(""); // read out by screen readers

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const correctButtonRef = useRef<HTMLButtonElement>(null);
  const forgetButtonRef = useRef<HTMLButtonElement>(null);
  const cancelForgetButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The two moments of a correction: the new text fades in, and the original
  // wording gets struck through. Both start off and are only played in
  // saveCorrection, so a panel opened on an already-corrected memory just shows
  // the result.
  const [newTextFading, newTextRef, fadeInNewText] = usePlayOnce(false);
  const [striking, strikeRef, strikeOriginal] = usePlayOnce(false);

  // Escape steps back (see stepBack). This effect has no dependency array, so it
  // runs after every render, and the listener always sees the current `mode`.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // isComposing: this Escape belongs to an input method (e.g. typing Japanese).
      if (event.key === "Escape" && !event.isComposing) {
        stepBack();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Move keyboard focus into the panel when it opens, and hand it back to
  // whatever had it (usually the chip) when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, []);

  // Switch mode, then focus `target`. The element only exists once React has drawn
  // the new mode, so flushSync makes React draw it now, before we call focus().
  function switchMode(next: Mode, target: RefObject<HTMLElement | null>) {
    flushSync(() => setMode(next));
    target.current?.focus();
  }

  // One step back: leave edit or confirm mode first, and only then close the panel.
  // Escape and a tap on the backdrop both do this, so a stray tap can't lose a draft.
  function stepBack() {
    if (mode === "editing") {
      switchMode("view", correctButtonRef);
    } else if (mode === "confirmingForget") {
      switchMode("view", forgetButtonRef);
    } else {
      onClose();
    }
  }

  function startEditing() {
    if (!memory) {
      return;
    }
    setDraft(memory.text); // prefill with the current wording
    setAnnouncement("");
    switchMode("editing", textareaRef);
    const box = textareaRef.current;
    box?.setSelectionRange(box.value.length, box.value.length); // caret at the end
  }

  const trimmedDraft = draft.trim();
  const canSave = memory !== undefined && trimmedDraft !== "" && trimmedDraft !== memory.text;

  function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser's own form submit
    if (!memory || !canSave) {
      return;
    }
    onCorrect(memory.id, trimmedDraft);
    fadeInNewText();
    // Only the first correction strikes a line through. After that, the "originally"
    // line keeps the very first wording, which is already struck through.
    if (!isCorrected) {
      strikeOriginal();
    }
    setAnnouncement("corrected. future maya will use your version from now on.");
    switchMode("view", correctButtonRef);
  }

  function confirmForget() {
    if (!memory) {
      return;
    }
    onForget(memory.id);
    setAnnouncement("forgotten. future maya won't use this memory again.");
    // The action buttons are gone now, so focus goes to the close button.
    switchMode("view", closeButtonRef);
  }

  const isCorrected = memory?.status === "corrected";
  const isForgotten = memory?.status === "forgotten";

  // The heading is the memory's label, the same words as the chip that was tapped.
  // A forgotten memory keeps a neutral heading, since its content stays hidden here.
  let title = memory?.label ?? "memory not found";
  if (isForgotten) {
    title = "a forgotten memory";
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop: tapping outside the panel steps back, like Escape. */}
      <div
        aria-hidden="true"
        onClick={stepBack}
        className="absolute inset-0 bg-black/30 motion-safe:animate-fade-in dark:bg-black/50"
      />

      <section
        role="dialog"
        aria-modal="true"
        // Two ids: screen readers announce the name as "memory receipt, rough code review".
        aria-labelledby="memory-panel-kind memory-panel-title"
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface px-6 pt-4 pb-8 shadow-2xl motion-safe:animate-sheet-up md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-96 md:rounded-tr-none md:rounded-bl-3xl md:pt-6 md:motion-safe:animate-panel-in"
      >
        {/* A grab-handle look, so the sheet reads as a sheet on phones. */}
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" />

        <header className="flex items-start justify-between gap-4">
          <div>
            <p id="memory-panel-kind" className="text-xs tracking-wide text-muted uppercase">
              memory receipt
            </p>
            <h2 id="memory-panel-title" className="mt-1 text-lg font-medium">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            close
          </button>
        </header>

        {/* Screen readers read this out when it changes, e.g. right after a save. */}
        <p role="status" className="sr-only">
          {announcement}
        </p>

        {memory ? (
          <>
            {(isCorrected || isForgotten) && (
              <p className="mt-5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isCorrected ? "bg-accent-soft text-accent" : "border border-line text-muted"
                  }`}
                >
                  {isCorrected ? "corrected by you" : "forgotten"}
                </span>
              </p>
            )}

            {mode === "editing" ? (
              <form onSubmit={saveCorrection} className="mt-5">
                <label htmlFor="memory-edit" className="text-sm font-medium">
                  {"what's the right version?"}
                </label>
                {/* text-base (16px) stops iPhones from zooming in when the box is tapped. */}
                <textarea
                  ref={textareaRef}
                  id="memory-edit"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={MAX_MEMORY_CHARS}
                  rows={5}
                  className="mt-2 block w-full resize-y rounded-2xl border border-line bg-background px-4 py-3 text-base leading-relaxed focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
                  >
                    save
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("view", correctButtonRef)}
                    className="rounded-full border border-line px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    cancel
                  </button>
                  <span className="ml-auto text-xs text-muted">
                    {draft.length}/{MAX_MEMORY_CHARS}
                  </span>
                </div>
              </form>
            ) : isForgotten ? (
              // The text stays hidden: the user asked for this memory to go away.
              <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed">
                you asked future maya to forget this, so its text is hidden and new replies
                won&apos;t use it. older replies keep this chip, so the chat history stays honest.
              </p>
            ) : (
              <>
                <blockquote
                  ref={newTextRef}
                  className={`${isCorrected ? "mt-3" : "mt-5"} rounded-2xl bg-background px-4 py-3 leading-relaxed ${
                    newTextFading ? "motion-safe:animate-fade-in" : ""
                  }`}
                >
                  {memory.text}
                </blockquote>
                {isCorrected && memory.originalText !== undefined && (
                  <p className="mt-2 px-1 text-sm leading-relaxed text-muted">
                    {/* strike-draw (globals.css) draws the line left to right, then hands
                        back to the <del>'s own strikethrough. */}
                    originally:{" "}
                    <del
                      ref={strikeRef}
                      className={striking ? "motion-safe:strike-draw" : undefined}
                    >
                      {memory.originalText}
                    </del>
                  </p>
                )}
              </>
            )}

            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">date</dt>
                {/* The chip says "jul 13"; here there's room for the year too. */}
                <dd className="mt-0.5">{longDate(memory.date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">type</dt>
                <dd className="mt-0.5">{memory.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">status</dt>
                <dd className="mt-0.5">{memory.status}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed">
            {`this reply pointed to a memory (id "${receipt.id}") that isn't in maya's memories right now, so there's nothing to show.`}
          </p>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-medium">why future maya used this</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{receipt.why}</p>
        </section>

        {/* No actions for a missing or forgotten memory, or while the edit box is open. */}
        {memory && !isForgotten && mode !== "editing" && (
          <div className="mt-8">
            {mode === "confirmingForget" ? (
              // A labelled group: screen readers read the question when focus lands on a button.
              <div role="group" aria-labelledby="forget-question">
                <p id="forget-question" className="text-sm font-medium">
                  forget this memory? future maya won&apos;t use it again.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmForget}
                    className="rounded-full border border-danger/60 px-4 py-2 text-sm font-medium text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    yes, forget it
                  </button>
                  <button
                    ref={cancelForgetButtonRef}
                    type="button"
                    onClick={() => switchMode("view", forgetButtonRef)}
                    className="rounded-full border border-line px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  ref={correctButtonRef}
                  type="button"
                  onClick={startEditing}
                  className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {"that's not right"}
                </button>
                <button
                  ref={forgetButtonRef}
                  type="button"
                  // Focus starts on "cancel", the safe choice, since forgetting can't be undone.
                  onClick={() => switchMode("confirmingForget", cancelForgetButtonRef)}
                  className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  forget this
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
