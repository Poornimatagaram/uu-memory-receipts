import type { Metadata } from "next";
import Link from "next/link";

// With the template in layout.tsx, the tab reads "meet future maya · memory receipts".
export const metadata: Metadata = {
  title: "meet future maya",
};

const STEPS = [
  "say what's on your mind",
  "tap 🧠 to see what she remembered",
  "fix or forget anything that's wrong",
];

// The welcome screen at "/". There's no "use client" here: nothing on this page
// needs state or click handlers (the button is a link), so it's a Server
// Component. It's rendered to HTML on the server and adds no JavaScript of its own.
//
// Each block rises in gently, one after another ([animation-delay:...]). The
// animation sits behind motion-safe:, so with "reduce motion" on, everything
// is simply there.
export default function WelcomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* A soft warm glow behind the headline. Decoration only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(75%_70%_at_50%_0%,var(--warm),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-20 pb-10 sm:pt-28">
        <h1 className="text-[2rem] leading-[1.2] font-medium tracking-tight text-balance motion-safe:animate-rise-in sm:text-[2.5rem]">
          some days you need to hear from the you who made it through.
        </h1>

        <section
          aria-labelledby="meet-maya"
          className="mt-12 motion-safe:animate-rise-in [animation-delay:120ms]"
        >
          <h2 id="meet-maya" className="text-sm font-medium text-warm-ink">
            meet maya
          </h2>
          <p className="mt-2 text-lg leading-relaxed">
            you&apos;ll be texting as maya, a junior ML engineer six months into her first job.
            future maya is her, two years from now.
          </p>
        </section>

        <p className="mt-8 rounded-2xl bg-accent-soft px-5 py-4 leading-relaxed motion-safe:animate-rise-in [animation-delay:240ms]">
          every reply shows which memories it used. tap a 🧠 to see why, fix it, or forget it.
        </p>

        <section
          aria-labelledby="how-it-works"
          className="mt-10 motion-safe:animate-rise-in [animation-delay:360ms]"
        >
          <h2 id="how-it-works" className="text-sm font-medium text-warm-ink">
            how it works
          </h2>
          <ol className="mt-4 flex flex-col gap-3.5">
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
          className="mt-12 flex w-full items-center justify-center rounded-full bg-accent px-7 py-3.5 text-base font-medium text-accent-ink shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-safe:animate-rise-in [animation-delay:480ms] sm:w-auto sm:self-start"
        >
          start talking
        </Link>

        <footer className="mt-auto pt-16 text-sm text-muted motion-safe:animate-rise-in [animation-delay:600ms]">
          a prototype by poornima
        </footer>
      </div>
    </main>
  );
}
