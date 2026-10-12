import type { Metadata } from "next";
import Link from "next/link";
import AmbientBackground from "@/components/AmbientBackground";

// This page lives in src/app/about/, a *child* folder of the root layout, so the
// "%s · Memory receipts" template in src/app/layout.tsx does apply here: the tab
// reads "Write-up · Memory receipts". (The welcome page, in the same folder as that
// layout, has to write its whole title out.)
export const metadata: Metadata = {
  title: "Write-up",
  description:
    "What memory receipts are, why they matter for u.u, the decisions behind them, and how to try the demo in 60 seconds.",
};

// The "Start talking" button's look, from src/app/page.tsx. text-base is set on
// purpose: the column below switches to text-lg on wider screens, and the button
// shouldn't grow with it.
const BUTTON =
  "flex w-full items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-medium text-accent-ink shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:w-fit";

// Links inside the text. --accent is 4.7:1 or better on every part of the ambient
// background in light mode and 5.4:1 in dark mode, and the underline says "link"
// without relying on color alone.
const TEXT_LINK =
  "rounded-sm text-accent underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Section headings: the welcome page's warm headings in the heading font, a few
// sizes up, since a reader skims these to find their place. (Fraunces looks smaller
// than Geist at the same size, so they're a step bigger than before.) --warm-ink is
// 4.6:1 or better on every part of the background.
const H2 = "font-display text-xl font-medium text-warm-ink sm:text-2xl";

// A small component, used twice: at the top and at the bottom of the page.
// In Python terms it's a function that returns markup; `className` is an optional
// keyword argument with a default, like `def try_the_demo(class_name: str = "")`.
function TryTheDemo({ className = "" }: { className?: string }) {
  return (
    <Link href="/chat" className={`${BUTTON} ${className}`}>
      Try the demo
    </Link>
  );
}

// The write-up at "/about", the same words as WRITEUP.md, as JSX. No "use client":
// nothing here has state or click handlers, so it's a Server Component, sent to
// the browser as plain HTML.
//
// Writing prose in JSX, two things to know:
// - Quotes and apostrophes are written &quot; and &apos;. They show up as plain
//   " and ', but the linter wants them escaped, so a stray quote can't be mistaken
//   for the end of something.
// - A line break *inside* text becomes one space, but a line break right next to a
//   tag disappears. So a space that has to sit between a tag and a line break is
//   written {" "}, and "<strong>…</strong> The…" stays on one line.
//
// The reading width: the column is 31em wide, and em follows its font size (16px on
// phones, 18px from the sm breakpoint up). In Geist, that's about 67 characters
// per line at either size. (Tailwind's max-w-prose, 65ch, would be ~90 in Geist:
// "ch" is the width of a "0", which is much wider than an average letter.)
//
// Only the top of the page rises in, one block after another (the delays are
// behind motion-safe: too; see LEARNING.md, Step 8). The rest of the text is
// still: it's below the fold, and it's for reading. Behind it, the background's
// shapes breathe slowly (src/components/AmbientBackground.tsx).
export default function AboutPage() {
  return (
    <main className="flex-1 px-6">
      {/* The welcome page's background, breathing, but without its scroll story:
          the sky stays dusk the whole way down. */}
      <AmbientBackground />

      <div className="mx-auto w-full max-w-[31em] pt-6 pb-16 text-base leading-relaxed sm:pt-8 sm:text-lg [&_strong]:font-semibold">
        <header>
          {/* The app's name, as on the welcome page, and a way back to it. */}
          <p className="font-display text-base/5 font-medium motion-safe:animate-rise-in">
            <Link
              href="/"
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Future Maya <span className="text-warm-ink">· Memory receipts</span>
            </Link>
          </p>

          <h1 className="mt-10 font-display text-[2rem] leading-[1.2] font-normal tracking-[-0.01em] text-balance motion-safe:animate-rise-in sm:mt-16 sm:text-[2.5rem]">
            Memory receipts for u.u
          </h1>

          {/* wrap-anywhere lets the long URLs break mid-word when they don't fit,
              so a 320px screen never scrolls sideways. */}
          <p className="mt-4 wrap-anywhere motion-safe:animate-rise-in motion-safe:[animation-delay:120ms]">
            <strong>Live demo:</strong>{" "}
            <a href="https://uu-memory-receipts.vercel.app" className={TEXT_LINK}>
              https://uu-memory-receipts.vercel.app
            </a>{" "}
            · <strong>Code:</strong>{" "}
            <a href="https://github.com/Poornimatagaram/uu-memory-receipts" className={TEXT_LINK}>
              https://github.com/Poornimatagaram/uu-memory-receipts
            </a>
          </p>

          <TryTheDemo className="mt-8 motion-safe:animate-rise-in motion-safe:[animation-delay:240ms]" />
        </header>

        {/* What a reviewer should see first: a raised card (the --surface color the
            chat uses for cards), with numbered steps like the welcome page's
            "How it works". items-baseline lines each number up with the first line
            of its step, however many lines the step wraps onto. */}
        <section
          aria-labelledby="try-it"
          className="mt-10 rounded-2xl border border-line bg-surface p-5 shadow-sm motion-safe:animate-rise-in motion-safe:[animation-delay:360ms] sm:p-7"
        >
          <h2 id="try-it" className={H2}>
            Try it in 60 seconds
          </h2>
          <ol className="mt-5 flex flex-col gap-4">
            <li className="flex items-baseline gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-medium text-warm-ink">
                1
              </span>
              <span>
                Click <strong>Start talking</strong>, then tap{" "}
                <strong>&quot;should i keep up with my paper reading list?&quot;</strong>
              </span>
            </li>
            <li className="flex items-baseline gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-medium text-warm-ink">
                2
              </span>
              <span>
                Under future Maya&apos;s reply, tap the <strong>🧠 Research goal</strong> chip.
                That memory is out of date.
              </span>
            </li>
            <li className="flex items-baseline gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-medium text-warm-ink">
                3
              </span>
              <span>
                Tap <strong>That&apos;s not right</strong>, change it to{" "}
                <em>
                  &quot;I used to want research, but now I love shipping features users actually
                  touch.&quot;
                </em>
                , and tap <strong>Save</strong>.
              </span>
            </li>
            <li className="flex items-baseline gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm text-sm font-medium text-warm-ink">
                4
              </span>
              <span>
                Close the panel, tap <strong>Ask again</strong>, and compare the two replies.
              </span>
            </li>
          </ol>
        </section>

        <section aria-labelledby="what-i-built" className="mt-14">
          <h2 id="what-i-built" className={H2}>
            What I built
          </h2>
          <div className="mt-3 space-y-4">
            <p>
              A future-self chat where every reply shows{" "}
              <strong>which memories it used, and why.</strong> Under each message from future
              Maya, small 🧠 chips name the memories behind it (&quot;Research goal · Jul
              13&quot;). Tap one to see the memory and the reason it was used, then{" "}
              <strong>correct it</strong> or <strong>forget it</strong>. Tap &quot;Ask
              again,&quot; and the reply changes to reflect what you fixed.
            </p>
            <p>
              The demo persona is Maya, a junior ML engineer six months into her first job. One of
              her memories is deliberately out of date: an early goal of becoming a research
              scientist, even though her recent memories show she loves shipping things users
              touch. Correcting that one memory visibly changes future Maya&apos;s advice.
            </p>
          </div>
        </section>

        <section aria-labelledby="why" className="mt-14">
          <h2 id="why" className={H2}>
            Why: the user problem
          </h2>
          <div className="mt-3 space-y-4">
            <p>
              u.u&apos;s promise is memory: it remembers your way here. But memory you can&apos;t
              see is memory you can&apos;t trust. When future you says &quot;this connects to what
              you asked last Tuesday,&quot; you have no way to check what it remembered, or to fix
              it when it&apos;s wrong. And people&apos;s goals change. A future self that keeps
              steering you toward a goal you&apos;ve outgrown is worse than one with no memory at
              all.
            </p>
            <p>
              Receipts turn memory from a black box into something you can see and correct. They
              protect the core promise, that it&apos;s still <em>you</em>, by keeping the user in
              charge of who &quot;you&quot; is.
            </p>
          </div>
        </section>

        <section aria-labelledby="decisions" className="mt-14">
          <h2 id="decisions" className={H2}>
            Key decisions and tradeoffs
          </h2>
          <div className="mt-3 space-y-4">
            <p>
              <strong>Trust is enforced, not asked for.</strong> The model&apos;s citations are
              treated as untrusted. Forgotten memories are removed <em>before</em> the model call,
              and every receipt the model returns is checked against the active memory store, so a
              hallucinated or forgotten memory can never appear as a chip. Earlier replies that
              relied on a since-changed memory are redacted from the history sent to the model, so
              it can&apos;t re-learn what the user removed.
            </p>
            <p>
              <strong>Forgetting really forgets.</strong> A forgotten memory&apos;s text is hidden
              everywhere, but its chip stays visible (faded) under old replies, so the conversation
              history remains honest.
            </p>
            <p>
              <strong>No sign-up, deliberately.</strong> A reviewer should reach the feature in one
              click. In production, auth and per-user storage would be required; I left them out
              to keep the demo frictionless.
            </p>
            <p>
              <strong>Small memory set, no retrieval.</strong> With 20 memories, everything fits in
              the prompt. At u.u&apos;s scale, retrieval would select candidates, and receipts
              would show what was actually used.
            </p>
            <p>
              <strong>Live voice, deferred.</strong> I considered it, but u.u is text-native,
              private, and low pressure. I&apos;d test voice notes before live calls, and ask
              whether users want future them to sound like them.
            </p>
          </div>
        </section>

        <section aria-labelledby="limitations" className="mt-14">
          <h2 id="limitations" className={H2}>
            Known limitations
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-warm-ink">
            <li>
              Redaction catches memories that were <em>cited</em>. A reply that uses a memory
              without citing it can slip through.
            </li>
            <li>Citations come from the model itself, so they may be incomplete.</li>
            <li>There&apos;s no undo for forget yet.</li>
          </ul>
        </section>

        <section aria-labelledby="next" className="mt-14">
          <h2 id="next" className={H2}>
            What I&apos;d do next
          </h2>
          <ol className="mt-3 list-decimal space-y-3 pl-6 marker:font-medium marker:text-warm-ink">
            <li>
              <strong>Receipts over SMS.</strong> Since u.u lives in text messages:{" "}
              <em>&quot;🧠 used: research goal (jul 13). reply WHY or FORGET.&quot;</em>
            </li>
            <li>
              <strong>Connect receipts to the memory graph.</strong> The graph shows what future
              you knows; receipts show what it used just now. Tapping a receipt could highlight
              that node in the graph.
            </li>
            <li>
              <strong>Measure citation faithfulness.</strong> Remove each cited memory,
              regenerate, and check that the reply actually changes. That separates real receipts
              from decorative ones.
            </li>
            <li>
              <strong>Test the core tension.</strong> Do receipts increase trust, or break the
              illusion of talking to yourself? I&apos;d test receipts that stay hidden until
              tapped against always-visible ones, and track correction rate, forget rate, and
              return visits.
            </li>
          </ol>
        </section>

        <p className="mt-14 border-t border-line pt-6">
          <strong>Stack:</strong> Next.js, TypeScript, Tailwind, the Claude API with structured
          JSON output, and Vercel. Built in about a day with Claude Code.
        </p>

        <TryTheDemo className="mt-10" />
      </div>
    </main>
  );
}
