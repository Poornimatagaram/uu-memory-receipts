# Memory receipts for u.u

**Live demo:** https://uu-memory-receipts.vercel.app · **Code:** https://github.com/Poornimatagaram/uu-memory-receipts

## Try it in 60 seconds

1. Click **Start talking**, then tap **"should i keep up with my paper reading list?"**
2. Under future Maya's reply, tap the **🧠 Research goal** chip. That memory is out of date.
3. Tap **That's not right**, change it to *"I used to want research, but now I love shipping features users actually touch."*, and tap **Save**.
4. Close the panel, tap **Ask again**, and compare the two replies.

## What I built

A future-self chat where every reply shows **which memories it used, and why.** Under each message from future Maya, small 🧠 chips name the memories behind it ("Research goal · Jul 13"). Tap one to see the memory and the reason it was used, then **correct it** or **forget it**. Tap "Ask again," and the reply changes to reflect what you fixed.

The demo persona is Maya, a junior ML engineer six months into her first job. One of her memories is deliberately out of date: an early goal of becoming a research scientist, even though her recent memories show she loves shipping things users touch. Correcting that one memory visibly changes future Maya's advice.

## Why: the user problem

u.u's promise is memory: it remembers your way here. But memory you can't see is memory you can't trust. When future you says "this connects to what you asked last Tuesday," you have no way to check what it remembered, or to fix it when it's wrong. And people's goals change. A future self that keeps steering you toward a goal you've outgrown is worse than one with no memory at all.

Receipts turn memory from a black box into something you can see and correct. They protect the core promise, that it's still *you*, by keeping the user in charge of who "you" is.

## Key decisions and tradeoffs

**Trust is enforced, not asked for.** The model's citations are treated as untrusted. Forgotten memories are removed *before* the model call, and every receipt the model returns is checked against the active memory store, so a hallucinated or forgotten memory can never appear as a chip. Earlier replies that relied on a since-changed memory are redacted from the history sent to the model, so it can't re-learn what the user removed.

**Forgetting really forgets.** A forgotten memory's text is hidden everywhere, but its chip stays visible (faded) under old replies, so the conversation history remains honest.

**No sign-up, deliberately.** A reviewer should reach the feature in one click. In production, auth and per-user storage would be required; I left them out to keep the demo frictionless.

**Small memory set, no retrieval.** With 20 memories, everything fits in the prompt. At u.u's scale, retrieval would select candidates, and receipts would show what was actually used.

**Live voice, deferred.** I considered it, but u.u is text-native, private, and low pressure. I'd test voice notes before live calls, and ask whether users want future them to sound like them.

## Known limitations

- Redaction catches memories that were *cited*. A reply that uses a memory without citing it can slip through.
- Citations come from the model itself, so they may be incomplete.
- There's no undo for forget yet.

## What I'd do next

1. **Receipts over SMS.** Since u.u lives in text messages: *"🧠 used: research goal (jul 13). reply WHY or FORGET."*
2. **Connect receipts to the memory graph.** The graph shows what future you knows; receipts show what it used just now. Tapping a receipt could highlight that node in the graph.
3. **Measure citation faithfulness.** Remove each cited memory, regenerate, and check that the reply actually changes. That separates real receipts from decorative ones.
4. **Test the core tension.** Do receipts increase trust, or break the illusion of talking to yourself? I'd test receipts that stay hidden until tapped against always-visible ones, and track correction rate, forget rate, and return visits.

**Stack:** Next.js, TypeScript, Tailwind, the Claude API with structured JSON output, and Vercel. Built in about a day with Claude Code.

## Run it locally

First, install the dependencies:

```bash
npm install
```

The chat needs an Anthropic API key. Put it in a file called `.env.local` in the project root (it's git-ignored, so it never gets committed):

```bash
ANTHROPIC_API_KEY=...
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
