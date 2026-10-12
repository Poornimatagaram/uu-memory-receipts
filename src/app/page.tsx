import type { Metadata } from "next";
import Link from "next/link";
import ReplyPreview from "@/components/ReplyPreview";
import seedMemories from "@/data/memories.json";
import { parseMemories } from "@/lib/memories";
import type { ChatMessage, Memory } from "@/lib/types";

// The full title, written out. The "%s · memory receipts" template in layout.tsx
// only applies to pages in *child* folders (like /chat), not to this page, which
// sits in the same folder as that layout.
export const metadata: Metadata = {
  title: "meet future maya · memory receipts",
};

const STEPS = [
  "say what's on your mind",
  "tap 🧠 to see what she remembered",
  "fix or forget anything that's wrong",
];

// The preview's reply. Its receipts point at two of maya's real memories, so
// the chips take their label and date from the seed data, as they do in the chat.
// (The "why"s are never shown: nothing in the preview opens.)
const PREVIEW_REPLY: ChatMessage = {
  role: "future",
  text: "you told me you'd rather ship things people touch. start there?",
  used: [
    { id: "m18", why: "the panel she built for the support team" },
    { id: "m01", why: "her goal, as she corrected it" },
  ],
};

// The preview's loop starts with an earlier reply that leans on m01, maya's
// research goal, as it was before she corrected it ("a first-author workshop paper
// within a year"). It's built like the reply above and wraps onto the same number
// of lines at every screen width (checked from 320px to 1920px), so the bubble
// doesn't have to change size when one text crossfades into the other.
const PREVIEW_OPENING = "you told me you'd rather chase a paper first. aim for a workshop?";

// m01 is shown as if maya had corrected it, so the preview has a ✎ chip too.
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
// Each block rises in gently, one after another. The animation sits behind
// motion-safe:, so with "reduce motion" on, everything is simply there. The
// delays are behind motion-safe: too, on purpose: animate-rise-in sets the
// `animation` shorthand, which resets animation-delay to 0, so a plain
// [animation-delay:...] would lose (see LEARNING.md, Step 8).
//
// Phones get one column: the text, the button, then the preview. From the lg
// breakpoint (1024px) up, it's two: the text on the left, the preview on the right.
// From lg up, the vertical gaps are also one step smaller (the lg:mt-*, lg:pt-6 and
// lg:gap-3 classes), so "start talking" fits in a 1280x800 window without scrolling.
// Phones never see those classes, so their layout is unchanged.
export default function WelcomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* A soft warm glow behind the headline. Decoration only. With motion allowed,
          it drifts and breathes very slowly (80s a lap): only its transform and
          opacity change, scaled from its top edge (origin-top), so the gradient is
          painted once and then just moved. main's overflow-hidden clips the edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] origin-top bg-[radial-gradient(75%_70%_at_50%_0%,var(--warm),transparent)] motion-safe:animate-glow-drift"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-6 pb-10 sm:pt-8 lg:max-w-5xl lg:pt-6">
        {/* The app's name, small. Not a heading: the headline below is the page's h1.
            It sits on the warm glow, where --muted gray was too faint in light mode
            (4.2:1, under the 4.5:1 that small text needs). --warm-ink is the color
            for text on --warm: 4.6:1 even on pure --warm, the strongest the glow
            ever gets, so it stays readable wherever the drift moves the glow. */}
        <p className="text-sm font-medium tracking-tight motion-safe:animate-rise-in">
          future maya <span className="text-warm-ink">· memory receipts</span>
        </p>

        <div className="mt-10 sm:mt-16 lg:mt-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col">
            <h1 className="text-[2rem] leading-[1.2] font-medium tracking-tight text-balance motion-safe:animate-rise-in sm:text-[2.5rem]">
              some days you need to hear from the you who made it through.
            </h1>

            <section
              aria-labelledby="meet-maya"
              className="mt-12 motion-safe:animate-rise-in motion-safe:[animation-delay:120ms] lg:mt-10"
            >
              <h2 id="meet-maya" className="text-sm font-medium text-warm-ink">
                meet maya
              </h2>
              <p className="mt-2 text-lg leading-relaxed text-pretty">
                you&apos;ll be texting as maya, a junior ML engineer six months into her first job.
                future maya is her, two years from now.
              </p>
            </section>

            <p className="mt-8 rounded-2xl bg-accent-soft px-5 py-4 leading-relaxed text-pretty motion-safe:animate-rise-in motion-safe:[animation-delay:240ms] lg:mt-6">
              every reply shows which memories it used. tap a 🧠 to see why, fix it, or forget it.
            </p>

            <section
              aria-labelledby="how-it-works"
              className="mt-10 motion-safe:animate-rise-in motion-safe:[animation-delay:360ms] lg:mt-8"
            >
              <h2 id="how-it-works" className="text-sm font-medium text-warm-ink">
                how it works
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

            {/* A link, not a button: it goes to another page, and works without JavaScript. */}
            <Link
              href="/chat"
              className="mt-12 flex w-full items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-medium text-accent-ink shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-safe:animate-rise-in motion-safe:[animation-delay:480ms] sm:w-auto sm:self-start lg:mt-10"
            >
              start talking
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
            className="mt-16 motion-safe:animate-rise-in motion-safe:[animation-delay:540ms] lg:mt-0"
          />
        </div>

        {/* {" "} keeps the space before the link: a line break next to a tag is dropped.
            The link is --accent, underlined (5.8:1 in light mode, 7.7:1 in dark). */}
        <footer className="mt-auto pt-16 text-sm text-muted motion-safe:animate-rise-in motion-safe:[animation-delay:600ms]">
          a prototype by poornima ·{" "}
          <Link
            href="/about"
            className="rounded-sm text-accent underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            read the write-up
          </Link>
        </footer>
      </div>
    </main>
  );
}
