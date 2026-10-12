import type { Metadata } from "next";
import Link from "next/link";
import AmbientBackground from "@/components/AmbientBackground";
import ReplyPreview from "@/components/ReplyPreview";
import seedMemories from "@/data/memories.json";
import { parseMemories } from "@/lib/memories";
import type { ChatMessage, Memory } from "@/lib/types";

// The full title, written out. The "%s · Memory receipts" template in layout.tsx
// only applies to pages in *child* folders (like /chat), not to this page, which
// sits in the same folder as that layout.
export const metadata: Metadata = {
  title: "Meet future Maya · Memory receipts",
};

const STEPS = [
  "Say what's on your mind",
  "Tap 🧠 to see what she remembered",
  "Fix or forget anything that's wrong",
];

// The preview's reply. Its receipts point at two of Maya's real memories, so
// the chips take their label and date from the seed data, as they do in the chat.
// (The "why"s are never shown: nothing in the preview opens.)
// The reply text is future Maya's texting voice, so it stays lowercase.
const PREVIEW_REPLY: ChatMessage = {
  role: "future",
  text: "you told me you'd rather ship things people touch. start there?",
  used: [
    { id: "m18", why: "the panel she built for the support team" },
    { id: "m01", why: "her goal, as she corrected it" },
  ],
};

// The preview's loop starts with an earlier reply that leans on m01, Maya's
// research goal, as it was before she corrected it ("a first-author workshop paper
// within a year"). It's built like the reply above and wraps onto the same number
// of lines at every screen width (checked from 320px to 1920px), so the bubble
// doesn't have to change size when one text crossfades into the other.
const PREVIEW_OPENING = "you told me you'd rather chase a paper first. aim for a workshop?";

// m01 is shown as if Maya had corrected it, so the preview has a ✎ chip too.
// Only the memories the chips point at are passed on to the preview, since
// everything a Client Component gets from the server is sent to the browser.
const PREVIEW_MEMORIES = parseMemories(seedMemories)
  .filter((m) => PREVIEW_REPLY.used?.some((r) => r.id === m.id))
  .map((m): Memory => (m.id === "m01" ? { ...m, status: "corrected" } : m));

// The welcome screen at "/". There's no "use client" here: this page itself needs
// no state or click handlers (the button is a link), so it's a Server Component,
// rendered to HTML on the server. The one interactive piece, the preview with its
// pause button, is its own Client Component (src/components/ReplyPreview.tsx).
//
// How it moves (all of it behind motion-safe or reduced-motion checks, so with
// "reduce motion" on, everything is simply there):
// - On load, the wordmark rises in and the headline reveals gently.
// - The scroll story (globals.css): as you scroll, the sky turns from dusk to dawn,
//   and each block with the scroll-reveal class fades and rises in as it comes
//   onto the screen. A block that's already on screen when the page loads just
//   shows. "Start talking" never waits for a scroll: it's always fully there.
// - Browsers without scroll-driven animations get no scroll story at all: every
//   block is visible and the sky stays dusk.
//
// <main> has no overflow-hidden on purpose. overflow-hidden would make <main> its
// own scroll container, and view() follows the nearest one: <main> never scrolls
// (the whole page does), so the reveals would never move.
//
// Phones get one column: the text, the button, then the preview. From the lg
// breakpoint (1024px) up, it's two: the text on the left, the preview on the right.
// From lg up, the vertical gaps are also one step smaller (the lg:mt-*, lg:pt-6 and
// lg:gap-3 classes), so "Start talking" fits in a 1280x800 window without scrolling.
// Phones never see those classes, so their layout is unchanged.
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AmbientBackground scrollStory />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-6 pb-10 sm:pt-8 lg:max-w-5xl lg:pt-6">
        {/* The app's name, small, in the heading font. Not a heading: the headline
            below is the page's h1. text-base/5 is 16px type on a 20px line: Fraunces
            looks smaller than Geist at the same size, and the 20px line keeps the
            layout's height exactly as it was. "· Memory receipts" is --warm-ink:
            4.6:1 or better on every part of the background. */}
        <p className="font-display text-base/5 font-medium motion-safe:animate-rise-in">
          Future Maya <span className="text-warm-ink">· Memory receipts</span>
        </p>

        <div className="mt-10 sm:mt-16 lg:mt-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col">
            <h1 className="font-display text-[2rem] leading-[1.2] font-normal tracking-[-0.01em] text-balance motion-safe:animate-headline-in sm:text-[2.5rem]">
              Some days you need to hear from the you who made it through.
            </h1>

            <section aria-labelledby="meet-maya" className="scroll-reveal mt-12 lg:mt-10">
              <h2 id="meet-maya" className="font-display text-base/5 font-medium text-warm-ink">
                Meet Maya
              </h2>
              <p className="mt-2 text-lg leading-relaxed text-pretty">
                You&apos;ll be texting as Maya, a junior ML engineer six months into her first job.
                Future Maya is her, two years from now.
              </p>
            </section>

            <p className="scroll-reveal mt-8 rounded-2xl bg-accent-soft px-5 py-4 leading-relaxed text-pretty lg:mt-6">
              Every reply shows which memories it used. Tap a 🧠 to see why, fix it, or forget it.
            </p>

            <section aria-labelledby="how-it-works" className="scroll-reveal mt-10 lg:mt-8">
              <h2 id="how-it-works" className="font-display text-base/5 font-medium text-warm-ink">
                How it works
              </h2>
              <ol className="mt-4 flex flex-col gap-3.5 lg:mt-3 lg:gap-3">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-medium text-warm-ink">
                      {index + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* A link, not a button: it goes to another page, and works without JavaScript.
                No scroll-reveal: if it sat at the bottom edge of the screen, the reveal
                would leave it half-faded until you scrolled. */}
            <Link
              href="/chat"
              className="mt-12 flex w-full items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-medium text-accent-ink shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:w-auto sm:self-start lg:mt-10"
            >
              Start talking
            </Link>
          </div>

          {/* A picture of a reply, not a live chat: the real ChatBubble and
              ReceiptChip, with nothing to press except the loop's pause button.
              See ReplyPreview for the loop and what screen readers hear. */}
          <ReplyPreview
            openingText={PREVIEW_OPENING}
            reply={PREVIEW_REPLY}
            memories={PREVIEW_MEMORIES}
            correctedId="m01"
            className="scroll-reveal mt-16 lg:mt-0"
          />
        </div>

        {/* {" "} keeps the space before the link: a line break next to a tag is dropped.
            The link is --accent, underlined: 4.7:1 or better on every part of the
            background in light mode, 5.4:1 in dark. */}
        <footer className="scroll-reveal mt-auto pt-16 text-sm text-muted">
          A prototype by Poornima ·{" "}
          <Link
            href="/about"
            className="rounded-sm text-accent underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Read the write-up
          </Link>
        </footer>
      </div>
    </main>
  );
}
