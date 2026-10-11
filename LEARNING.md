# Learning log

## Step 3: Types and seed memories

### What I built
I defined the two data shapes the whole app will share: a `Memory` (one thing "future you" remembers) and a `ChatMessage` (one bubble in the chat, with optional "receipts" listing the memories a reply used). I also wrote 20 seed memories for the demo persona Maya, a junior ML engineer six months into her first startup job, which stand in for a database. Nothing renders yet; this step is just the data and its contract.

### Files changed
- `src/lib/types.ts` (new): exports `Memory`, `ChatMessage`, and the two helper unions `MemoryType` and `MemoryStatus`. Any file can import these to get autocomplete and type errors.
- `src/data/memories.json` (new): 20 memories (`m01`–`m20`) dated 2026-07-13 to 2026-10-09, all `"active"`. One early goal (`m01`) is deliberately out of date, and several recent memories hint that Maya's interests have shifted, so the correct/forget feature has something real to fix.
- `LEARNING.md` (new): this log.

### Key concepts
- **`type X = { ... }` describes the shape of plain data.** Python analogy: a `TypedDict`, not a class. There's no constructor and no methods. It just says "an object with these keys and these value types."
- **String literal unions: `"goal" | "project" | ...`.** Python analogy: `Literal["goal", "project", ...]` from `typing`. `type: "hobby"` is a compile error, the same way mypy rejects a value outside the `Literal`.
- **Optional properties: `originalText?: string`.** Python analogy: `NotRequired[str]` in a `TypedDict`, meaning the key may be missing entirely. This is not `Optional[str]`, which means the key is present but may be `None`.
- **Arrays and inline object types: `{ id: string; why: string }[]`.** Python analogy: `list[SomeTypedDict]`, where the TypedDict is written inline instead of given its own name.
- **`export` makes a name importable.** In Python, every top-level name in a module can be imported. In TypeScript, a name stays private to its file unless you `export` it. Later steps will write `import type { Memory } from "@/lib/types";`. That's like `from lib.types import Memory`, and `@/` is a shortcut for `src/`, set up in `tsconfig.json` under `paths`.
- **Types disappear at runtime.** Python analogy: mypy type hints, not Pydantic. TypeScript checks your code while you write it, then strips all types out. Nothing checks the JSON when the app runs. That's why importing the JSON needs care: TypeScript reads `"type": "goal"` from a `.json` file as a plain `string`, not the literal `"goal"`, so `const m: Memory[] = json` is a type error. There are two ways to fix it. `json as Memory[]` is like `typing.cast`: you promise it's right and nothing is checked. Runtime validation is like Pydantic's `TypeAdapter(list[Memory]).validate_python(data)`; in TypeScript, libraries such as zod do this.
- **Seed JSON instead of a database.** Python analogy: a fixtures file you'd load at FastAPI startup. Later steps will copy it into React state so corrections can change it while the app runs.

### One line worth understanding
```ts
used?: { id: string; why: string }[]; // memory receipts: which memories a reply used, and why
```
- `used`: the property name on a `ChatMessage`.
- `?`: the property is optional. A user's message has no receipts, so the key can be left out.
- `:`: "has the type…", the same role as `:` in a Python annotation.
- `{ id: string; why: string }`: an inline object type. Each receipt has the `id` of a memory (like `"m05"`) and a `why` sentence explaining how the reply used it.
- `[]`: "a list of" those objects, like `list[...]`.
- `;`: ends the property. In TypeScript object types, properties are separated by `;` (commas also work).
- `// ...`: a comment. Ignored by the compiler.

In Python it would be `used: NotRequired[list[Receipt]]`, where `Receipt` is a TypedDict with `id: str` and `why: str`.

### Quiz
Every entry in `memories.json` is valid, yet `const memories: Memory[] = memoriesJson;` is a type error. Why does TypeScript complain, and what is the practical difference between fixing it with `as Memory[]` and validating the data at runtime?

## Step 4: The chat API route

### What I built
A backend endpoint, `POST /api/chat`, that takes Maya's message, the chat history, and her memories, then asks Claude (`claude-sonnet-5-5`) to reply as future Maya and return JSON: `{"reply": "...", "used": [{"id": "m01", "why": "..."}]}`. It rejects bad requests with clear 400 errors, never sends forgotten memories to Claude, and falls back to a friendly reply if Claude's output can't be parsed. There's no UI yet; you test it with curl. **Your turn:** `verifyReceipts` in `src/lib/receipts.ts` is a `TODO(human)` stub that returns `[]`, so `used` stays empty until you implement it.

### Files changed
- `src/app/api/chat/route.ts` (new): the endpoint. It validates the body, filters out forgotten memories, calls Claude, parses the JSON reply, and passes the receipts through `verifyReceipts`.
- `src/lib/prompt.ts` (new): `buildSystemPrompt(memories)` writes future Maya's instructions (persona, voice, safety, output format) and lists each memory as `- [m05] question, 2026-07-29: ...`, adding `(corrected by user)` where a memory was corrected. `REPLY_SCHEMA` is the JSON Schema the reply must match.
- `src/lib/receipts.ts` (new): the `Receipt` type and the `verifyReceipts(used, activeMemoryIds)` stub for you to implement. It lives outside `route.ts` because a route file may only export HTTP handlers like `POST`.
- `package.json`: unchanged. `@anthropic-ai/sdk` was already installed.

### Key concepts
- **The file path is the URL, and the function name is the HTTP method.** `src/app/api/chat/route.ts` exporting `async function POST(request)` is like `@app.post("/api/chat")` in FastAPI. Next.js answers other methods (like GET) with `405 Method Not Allowed` automatically.
- **No automatic validation.** FastAPI checks the body against a Pydantic model and returns 422 for you. Here `await request.json()` gives you whatever was sent, so we store it as `unknown` (TypeScript's "could be anything") and check it by hand with `typeof x === "string"` and `Array.isArray(x)`, like writing `isinstance` checks yourself. `Response.json(data, { status: 400 })` is like `JSONResponse(content=data, status_code=400)`.
- **Environment variables.** `process.env.ANTHROPIC_API_KEY` is `os.environ.get("ANTHROPIC_API_KEY")`. Next.js loads `.env.local` for you, like `python-dotenv`. Variables are server-only unless their name starts with `NEXT_PUBLIC_`, so the key never reaches the browser. On Vercel you set it in the project settings instead.
- **`try/catch` with `instanceof`.** This is `try/except`, catching specific exception classes, most specific first: `Anthropic.RateLimitError` before the general `Anthropic.APIError`, like catching `HTTPException` subclasses before `Exception`.
- **Type guards.** `function isReceipt(value: unknown): value is Receipt` returns a boolean, and TypeScript then treats `value` as a `Receipt` wherever the check passed. Python analogy: `TypeGuard[Receipt]` from `typing`. Similarly, `if (block.type === "text")` lets you read `block.text`, like `match` on a tagged union.
- **Prompt instructions vs. structured outputs.** At first the prompt alone asked for JSON. In testing, when the history contained earlier plain-text replies, Claude copied that style and skipped the JSON. Passing `output_config.format` with a JSON Schema makes Claude's output match the schema, a bit like FastAPI's `response_model`, except it's enforced while Claude writes. We still parse defensively, because a reply cut off by `max_tokens` can be incomplete.

### One line worth understanding
```ts
const activeMemories = (memories as Memory[]).filter((m) => m.status !== "forgotten");
```
- `const activeMemories =`: a variable that can't be reassigned, like annotating it with `typing.Final` (except TypeScript enforces it).
- `(memories as Memory[])`: a cast, like `typing.cast(list[Memory], memories)`. It's a promise to the compiler, not a check: we only verified that `memories` is an array, not what's inside it.
- `.filter(...)`: keep the items where the function returns `true`, like `[m for m in memories if ...]`.
- `(m) => ...`: an arrow function, TypeScript's `lambda m: ...`.
- `m.status !== "forgotten"`: "status is not forgotten". `!==` is strict inequality: no type conversion, so always use it instead of `!=`.

In Python: `active_memories = [m for m in cast(list[Memory], memories) if m["status"] != "forgotten"]`.

### Quiz
The route calls `verifyReceipts(parsed.used, activeMemories.map((m) => m.id))`, passing only the active ids, not every id in the request. Suppose we passed every id instead. Which user action would expose the bug, and what would the user see?

## Step 5: The chat UI with receipt chips

### What I built
The home page is now a real chat. You type to future Maya, or tap one of three starter prompts. While she's thinking you see "future maya is typing...", and her reply arrives with one small chip per memory she used. Tapping a chip opens a panel with that memory's text, date, type and status, plus why she used it. The "that's not right" and "forget this" buttons are there, but stay disabled until Step 6. If a request fails, your message stays on screen with a "try again" button. When the chat reaches the API's 40-message history cap, it says so plainly instead of quietly dropping old messages.

The chips come from your `verifyReceipts` in `src/lib/receipts.ts`, which is already implemented in the committed code. So real replies show chips now: in testing, "my code review went badly today" came back citing m07 and m09. If chips ever disappear, that function is the first place to look. (The comment above it still says it returns `[]`. That's out of date, and I left the file alone.)

### Files changed
- `src/app/page.tsx` (rewritten): the one client component that owns all the state and the send logic. It renders the header, starter prompts, message list, typing line, input box (or the cap notice) and the memory panel.
- `src/components/ChatBubble.tsx` (new): one message. User bubbles sit on the right, future Maya's on the left with a row of chips. An empty `used` list renders no chips at all.
- `src/components/ReceiptChip.tsx` (new): one chip, a real `<button>` reading "🧠 2026-08-07 · feeling", or "memory not found" if the id isn't in `memories`.
- `src/components/MemoryPanel.tsx` (new): the detail view. It's a bottom sheet on phones and a side panel from 768px up. It closes with the close button, a tap on the backdrop, or Escape.
- `src/lib/memories.ts` (new): `isMemory`, a type guard that checks every field and every union value, and `parseMemories`, which drops invalid or duplicate seed entries. This replaces a plain `as Memory[]` cast.
- `src/lib/chat-client.ts` (new): `askFutureMaya()`, the browser side of `POST /api/chat`. It turns network failures, non-2xx statuses and garbled replies into friendly error messages, and uses the route's own `{ error }` text when there is one.
- `src/app/layout.tsx`: the title is now "future maya · memory receipts", with a real description.
- `src/app/globals.css`: adds calm color tokens (light and dark), registers them with Tailwind v4's `@theme` so classes like `bg-surface` exist, and adds the panel's slide-in animations. It also removes a leftover Arial rule, so the Geist font loaded in `layout.tsx` actually applies.

### Key concepts
- **`"use client"`.** In the App Router, pages are Server Components by default. They run only on the server, like a FastAPI endpoint returning `HTMLResponse`: they can read secrets, and only the HTML reaches the browser. `"use client"` at the top of `page.tsx` says "this file also ships to the browser as JavaScript and runs there." That's like the `<script>` you'd attach to that HTML, and it's required for `useState` and `onClick`. You only need it on the entry file. Everything `page.tsx` imports (our three components) becomes client code automatically, which is why they don't have the directive. One catch: `export const metadata` only works in server files, so the page title lives in `layout.tsx`.
- **Components are functions that return UI.** Python analogy: a function, or a Jinja macro, that returns an HTML fragment. Writing `<ChatBubble message={m} />` calls `ChatBubble` with those arguments.
- **Props.** These are the keyword arguments to that function, with a TypedDict-like type describing them. `function ChatBubble({ message, memories, onOpenReceipt }: ChatBubbleProps)` is `def chat_bubble(*, message: ChatMessage, memories: list[Memory], on_open_receipt: Callable[[Receipt], None])`. Data flows one way, parent to child. The page passes `messages` and `memories` down. A child can't change the page's state itself, so the page also passes down a function (`onOpenReceipt={setOpenReceipt}`), and the chip calls it when tapped. That works like handing a callback to a helper.
- **`useState`.** Python analogy: an attribute on a long-lived object, plus a setter that also tells the framework to redraw. `const [input, setInput] = useState("")` is roughly `self.input = ""`, except you must change it through `setInput(...)`. React then calls `Home()` again with the new value. Each call sees a fixed snapshot: inside one run of `send()`, `messages` doesn't change even after `setMessages(...)`. That's why `send()` saves `const history = messages` up front.
- **New lists, not mutation.** `setMessages([...history, userMessage])` builds a new list, like `[*history, user_message]`. React decides whether to redraw by checking if the value is the same object (like Python's `is`), so `messages.push(...)` would change the list without React ever noticing.
- **`useEffect`.** Python analogy: a context manager tied to the component being on screen. In `MemoryPanel`, the effect adds a keydown listener when the panel appears, and the function it returns removes it when the panel goes away, like `__enter__` and `__exit__`.
- **Rendering with conditions and loops.** `{loading && <span>...</span>}` and `a ? b : c` play the role of Jinja's `{% if %}`, and `.map(...)` is `{% for %}`. Each item in a list needs a `key` so React can tell the items apart between redraws.

### One line worth understanding
```ts
const [messages, setMessages] = useState<ChatMessage[]>([]);
```
- `const [messages, setMessages] =`: destructuring, like `messages, set_messages = some_pair` in Python.
- `useState(...)`: asks React for a value that survives redraws. A plain local variable would reset to `[]` every time `Home()` runs.
- `<ChatMessage[]>`: a type parameter meaning "this state holds a list of ChatMessage", like `list[ChatMessage]`. Without it, TypeScript would type the empty `[]` as a list that can never hold anything (`never[]`).
- `([])`: the starting value, used only the first time the page renders.
- `messages`: the current value for this render. Read it, never modify it.
- `setMessages`: the only way to change it. Calling it schedules a redraw with the new value.

In Python terms: a `messages: list[ChatMessage] = []` that lives as long as the page does, where `set_messages(new_list)` is the only way to update it, and each update redraws the screen.

### Quiz
In `send()`, after `await askFutureMaya(...)` finishes, the code builds the new list from `history` (saved before the request) instead of reading `messages` again. What value would `messages` hold at that point, and why?

## Step 6: Correct and forget

### What I built
The two buttons in the memory panel now work: "that's not right" lets you rewrite a memory, which is then marked "corrected by you" with its first wording struck through, and "forget this" asks first, then marks the memory forgotten. Every chip that points at that memory updates at once, even under older replies: corrected ones get a ✎, and forgotten ones stay visible but faded and struck through. A notice under the chat then offers "ask again", which re-sends your last question so you can compare the old reply with a fresh one built from the updated memories.

### Files changed
- `src/app/page.tsx`: adds `setMemories` and the only two functions that change a memory, `correctMemory` and `forgetMemory`. It also adds the notice, `askAgain`, and `findAskAgain`, which works out what to re-send. `send()` now takes optional `history` and `askedAgain` settings, and "try again" after a failed ask-again repeats it the same way.
- `src/components/MemoryPanel.tsx`: the panel now has three modes: `"view"`, `"editing"` and `"confirmingForget"`. It shows the corrected and forgotten states, and asks the page for changes through `onCorrect` and `onForget` props. Escape (and a tap on the backdrop) steps back one level: out of edit or confirm mode first, and only then closes the panel. A forgotten memory's text is hidden here, since you asked for it to go away, but its date, type and the old "why" stay.
- `src/components/ReceiptChip.tsx`: shows the memory's current status, and its `aria-label` says it out loud for screen readers: "memory used: 2026-08-07 · feeling, corrected by you".
- `src/components/ChatBubble.tsx`: a small "asked again with updated memories" line under a re-sent question.
- `src/lib/types.ts`: `ChatMessage` gets an optional `askedAgain` flag. It's for the UI only; the route ignores it.
- Not changed: `route.ts`, `prompt.ts` and your `receipts.ts`. They already drop forgotten memories and label corrected ones.

### Why we never edit the array in place
React decides whether to redraw by asking "is this the same object as before?", like Python's `is`. If you change the list in place, the answer is "yes, same list", so React assumes nothing changed:

```python
memories = [{"id": "m07", "status": "active"}]
before = memories
memories[0]["status"] = "forgotten"   # in place
before is memories                    # True: React would see "no change" and skip the redraw
```

So every update builds a new list, with a new object for the one memory that changed:

```python
updated = [{**m, "status": "forgotten"} if m["id"] == "m07" else m for m in memories]
updated is memories   # False: React redraws, and every chip re-reads its memory
```

There's a second reason. Each render works from a fixed snapshot of the state (Step 5's quiz). `send()` keeps `shown = messages` across an `await`, and the panel's props come from one render. If we edited the shared objects in place, those snapshots would change under their feet, like two Python names aliasing one list. With new objects, an old snapshot stays exactly what it was. The memories that didn't change are reused as they are, so this is cheap: only one new array and one new object per change.

### Key concepts
- **Callback props: the owner changes the data.** The page owns `memories`. The panel gets `onCorrect(id, newText)` and `onForget(id)` and calls them; it never touches a memory itself. FastAPI analogy: the panel is a client calling `POST /memories/{id}/correct`, and the page is the server that owns the data and decides how to store the change.
- **Updater functions: `setMemories((prev) => ...)`.** Instead of "set it to this value", you say "here's how to compute the new value from the latest one", and React passes in the current list as `prev`. Analogy: SQL's `UPDATE memories SET status = 'forgotten' WHERE id = ?` runs against the current row. Reading a copy earlier and writing it back later could overwrite a newer change with stale data.
- **A union type as a small state machine.** `type Mode = "view" | "editing" | "confirmingForget"` keeps the panel in exactly one mode, so it can never be "editing and confirming" at once. Python analogy: a `Literal[...]` or `Enum` field, with each `if mode === ...` branch acting like a `match` case.
- **Refs and `flushSync` for focus.** `useRef` holds a handle to a real DOM element, so we can call `.focus()` on it. React normally waits and applies state changes together, so right after `setMode("editing")` the textarea doesn't exist yet. `flushSync(() => setMode(next))` makes React draw immediately, then we focus. Python analogy: React's updates are like buffered output, and `flushSync` is `sys.stdout.flush()`.
- **An effect with no dependency array runs after every render.** The Escape listener is re-added after each render, so it always sees the current `mode`. Python analogy: re-registering a callback each time the config changes, so it never holds an old config.
- **Asking again from a clean history.** "ask again" sends the history from before the question was first asked, leaving out the old reply. That reply might quote the memory you just forgot, and a model that can see its earlier answer tends to repeat it. Python analogy: re-running a test from a fresh fixture, not on top of the last run's leftover state.

### One line worth understanding
```ts
setMemories((prev) => prev.map((m): Memory => (m.id === id ? { ...m, status: "forgotten" } : m)));
```
- `setMemories(...)`: asks React to replace `memories` and redraw.
- `(prev) =>`: an updater function. React calls it with the latest memories.
- `prev.map(...)`: builds a **new** array with one item per memory, like a list comprehension. `prev` itself is never changed.
- `(m): Memory =>`: the function run for each memory `m`. `: Memory` declares that it returns a `Memory`, so TypeScript checks that `"forgotten"` is a valid status.
- `m.id === id ? ... : m`: a conditional expression, Python's `x if cond else y`.
- `{ ...m, status: "forgotten" }`: a new object with all of `m`'s fields, then `status` overridden. It's Python's `{**m, "status": "forgotten"}`.
- `: m`: every other memory is kept as the same object. It didn't change, so there's no need to copy it.

In Python: `set_memories(lambda prev: [{**m, "status": "forgotten"} if m["id"] == id else m for m in prev])`.

### Quiz
"ask again" sends only the history from before the question was first asked. Suppose it sent the whole chat instead, including the old reply that drew on the memory you just forgot. Could a chip for the forgotten memory appear under the new reply? And what could still go wrong in the new reply's text?

## Step 7: Welcome screen, chat polish, and the history leak fix

### What I built
The app now opens on a calm welcome screen at `/` with one "start talking" button, and the chat moved to `/chat`. The chat got easier to read: chips now say "🧠 research goal · jul 13", replies are at most two short sentences, and a "start over" button resets the demo after asking first. Most importantly, the request sent to Claude no longer carries forgotten or changed memories back in through old reply text.

### Files changed
- `src/app/page.tsx`: now the welcome screen. It's a Server Component (no `"use client"`): rendered to HTML on the server, it adds no JavaScript of its own, and it works even with JavaScript turned off.
- `src/app/chat/page.tsx`: the chat, moved here from `src/app/page.tsx`. It adds the "start over" button and its confirm step, a request counter that drops stale replies, a `usedText` snapshot on each new reply, the empty-chat hint, and the new notice text.
- `src/app/chat/layout.tsx` (new): a Server Component whose only job is the chat's tab title, because a `"use client"` page can't export `metadata`.
- `src/app/layout.tsx`: the title is now a template, `"%s · memory receipts"`.
- `src/app/globals.css`: two warm tokens (`--warm`, `--warm-ink`, light and dark) and a gentle `rise-in` animation.
- `src/lib/history.ts` (new): the redaction rule. `snapshotUsedText` records what each cited memory said when a reply arrived, `usedChangedMemory` checks whether any of them changed since, and `historyForRequest` swaps those replies for a placeholder.
- `src/lib/chat-client.ts`: `buildRequestBody` is now the one place a request body is built. It drops forgotten memories, copies only the memory fields the server needs (so no `originalText`), and redacts the history.
- `src/lib/dates.ts` (new): `shortDate` ("jul 13") for chips and `longDate` ("jul 13, 2026") for the panel, both made by splitting the string.
- `src/lib/types.ts`: `Memory` gets `label`, and `ChatMessage` gets the UI-only `usedText`.
- `src/lib/memories.ts`: `isMemory` also checks `label`.
- `src/data/memories.json`: a 2–4 word `label` on every memory, taken from its text.
- `src/lib/prompt.ts`: replies are at most 2 short sentences with one question or one next step, and people get a short "who they are" the first time they come up.
- `src/components/ReceiptChip.tsx`: shows label and short date. `MemoryPanel.tsx`: its heading is now the memory's label, matching the chip you tapped, and its date reads "jul 13, 2026". `ChatBubble.tsx`: a comment.
- Not changed: `route.ts` (it still drops forgotten memories itself, as a backstop) and your `receipts.ts`.

### Routing: folders become URLs
In the App Router, the folder a file sits in is its URL. A folder becomes a page only when it has a `page.tsx` (or an API endpoint when it has a `route.ts`):

| File | URL |
| --- | --- |
| `src/app/page.tsx` | `/` |
| `src/app/chat/page.tsx` | `/chat` |
| `src/app/api/chat/route.ts` | `POST /api/chat` |

FastAPI analogy: each folder is like an `APIRouter(prefix="/chat")`, and `page.tsx` is the `@router.get("")` inside it. The difference is that the path comes from where the file lives, not from a string you type in a decorator. So "moving the chat to `/chat`" was literally `mv src/app/page.tsx src/app/chat/page.tsx`.

A `layout.tsx` wraps every page in its folder and below, like a Jinja base template that pages `{% extends %}`. The root layout holds `<html>` and `<body>`. The new `chat/layout.tsx` adds no UI. It only exists to export `metadata`, because metadata is resolved on the server before the page renders, and a `"use client"` file can't do that. The Next.js docs also suggest another way: keep `page.tsx` as a server file and move the interactive part into its own client component. The layout let the chat stay in `chat/page.tsx` as it was.

One surprise, found by a test: the root layout's title template `"%s · memory receipts"` turned the chat's `"future maya"` into "future maya · memory receipts", but the welcome page's title came out bare. A template only applies to *child* folders, and `src/app/page.tsx` sits in the same folder as the root layout. So the welcome page writes its full title out.

`<Link href="/chat">` renders a real `<a>`, so it works without JavaScript. With JavaScript, Next.js intercepts the click and swaps in just the new page without reloading the browser tab. This project also turns on `cacheComponents` in `next.config.ts`, which makes Next.js *hide* a page you leave instead of throwing it away (React's `<Activity>`, for up to 3 pages). So if you go back to the welcome screen and tap "start talking" again, the chat and your memory fixes are still there. A full page reload, or "start over", gives you a fresh start. Python analogy: the page is a long-lived object kept in a small cache, not rebuilt on every request.

### Why the leak fix is needed
Forgetting a memory already removed it from the `memories` list the server sends to Claude. But the chat history is sent too, and an old reply can repeat a memory in its own words:

1. Future maya replies "carlos's 31 comments stung, i remember," citing m07.
2. You forget m07. The server drops it from the memory list.
3. You send another message. The history still contains step 1's reply word for word, so Claude reads "carlos's 31 comments" again and can reuse it.

The memory is gone from the list but still alive in the transcript. Python analogy: deleting a row from `users` while a denormalized copy of the same email still sits in an `audit_log` text column you keep feeding to the model. So before sending, any earlier reply that cited a changed memory becomes `"[earlier reply removed: it used a memory maya has since changed]"`. Your own messages are sent as they are, and the screen still shows the original replies.

**Why "changed since", not "currently corrected".** The simple rule, "redact any reply citing a corrected memory," is wrong. Say you correct m01, ask again, and the new reply uses your fixed m01. That reply is exactly what you wanted, but m01's status is still "corrected", so the simple rule would hide it on every turn after. The real question is "did this memory change *after* this reply was written?" So when a reply arrives we store `usedText`, the text each cited memory had at that moment, and compare it with now:

| Situation | Redacted? |
| --- | --- |
| cited memory was forgotten (any time) | yes, always |
| cited memory was corrected after the reply | yes: the text differs from the snapshot |
| reply was written after the correction and cites it | no: the text matches |
| that memory is corrected again later | yes: it differs again |

Python analogy: an ETag or a version number. You remember the version you saw, and anything built on an older version is stale. `usedText` is filled from the memories *as sent with that request*, so a correction made while a reply is still loading also counts as "changed since".

What it can't catch: redaction follows receipts. A reply that mentions a memory without citing it isn't redacted, and anything you typed yourself is always kept.

### Key concepts
- **Server vs. client components.** Python analogy: the welcome page is a FastAPI route returning a Jinja `HTMLResponse` with no `<script>`. The chat is that HTML plus a script that runs in the browser. Use `"use client"` only where you need state, effects, or click handlers.
- **`useRef` as a box that doesn't redraw.** `latestRequest = useRef(0)` holds a number that survives renders, but changing `.current` doesn't redraw anything. Python analogy: a plain attribute `self.latest_request`, unlike React state, which is a property whose setter repaints the screen.
- **Ignoring stale responses.** Each `send()` takes a ticket (`requestId`), and "start over" bumps the counter. After the `await`, a reply whose ticket isn't the latest is dropped. Python analogy: after `await client.post(...)` in an asyncio task, check `if request_id != self.latest_request: return` before writing results. Like Python, `finally` still runs after a `return` inside `try`, so it only clears `loading` when the request is still current.
- **`Record`, `Pick`, and picking fields.** `Record<string, string>` is `dict[str, str]`. `Pick<Memory, "id" | "text">` is a TypedDict with only those keys. `.map(({ id, type, date, text, status }) => ({ id, type, date, text, status }))` is `{k: m[k] for k in ("id", "type", "date", "text", "status")}`, an allowlist like Pydantic's `model_dump(include={...})`, so extra fields like `originalText` can't slip into the request.
- **Defense in depth.** The browser now leaves forgotten memories out, and the route still filters them too. Python analogy: validating in both the client SDK and the FastAPI endpoint, so a bug in one doesn't leak data.
- **Dates without `new Date()`.** `new Date("2026-07-13")` means UTC midnight, which is July 12 in US time zones. Python analogy: `datetime.fromisoformat("2026-07-13").replace(tzinfo=timezone.utc).astimezone()` would also land on the 12th in New York. We only need "jul 13", so we split the string, like `y, m, d = s.split("-")`.
- **`motion-safe:` and reduced motion.** `motion-safe:animate-rise-in` only applies when the operating system's "reduce motion" setting is off, using the CSS media query `prefers-reduced-motion`. Python analogy: a feature flag read from the user's settings. The default is the safe one: no flag, no animation.

### One line worth understanding
```ts
return now.text !== message.usedText?.[receipt.id];
```
This line in `usedChangedMemory` (src/lib/history.ts) is the "changed since" rule:
- `now.text`: what the memory says today.
- `message.usedText`: the snapshot stored on this reply when it arrived, a dict from memory id to text. It's optional, so it may be `undefined`.
- `?.[receipt.id]`: optional chaining, then a dict lookup. If `usedText` is missing, the whole thing becomes `undefined` instead of crashing. Python: `(message.used_text or {}).get(receipt.id)`.
- `!==`: strict "not equal", Python's `!=` with no type juggling.
- `return ... `: `true` means "this memory changed since the reply was written", so the reply gets redacted. If the snapshot has no entry, `undefined !== "some text"` is `true`, so the safe default is to leave the reply out.

In Python: `return now.text != (message.used_text or {}).get(receipt.id)`.

### Quiz
A reply that cites m09 is still loading when you correct m09. When it arrives, `send()` calls `snapshotUsedText(used, memories)` with the `memories` from when `send()` started, not the latest ones. If it used the latest memories instead, what would go wrong on the next turn?

## Step 8: UI polish

### What I built
The welcome screen now has a small "future maya · memory receipts" wordmark and a preview of what a reply looks like: one future-maya bubble with two memory chips. On wide screens it sits to the right of the text, and on phones it comes after the "start talking" button. In the chat, future maya has a round "m" avatar, a "←" link goes back to the welcome page without losing the chat, "future maya is typing..." became three gently bobbing dots in a bubble, and the send button stays quiet until there's something to send. Testing also turned up a Step 7 bug: the welcome blocks were meant to rise in one after another, but they all rose at once. That's fixed too.

### Files changed
- `src/app/page.tsx`: the wordmark (a `<p>`, so the headline is still the only `h1`), a wrapper that becomes two columns from the `lg` breakpoint (1024px) up, and the preview. The preview is a `<figure>` named by its `<figcaption>` that renders the real `ChatBubble`, fed by two seed memories (m18, and m01 shown as corrected). The animation delays are now `motion-safe:[animation-delay:...]` (see the concept below).
- `src/components/ChatBubble.tsx`: `bubbleLook(role)` holds the bubble's shape and colors, shared by every bubble. `onOpenReceipt` is now optional: leave it out and the chips are pictures, not buttons. There's also a new `TypingBubble`, the three dots in a future-maya bubble.
- `src/components/ReceiptChip.tsx`: `onOpen` is optional too. Without it, the chip is a `<span>` with the same look and contents, and its status ("corrected by you") goes in screen-reader-only text instead of `aria-label`.
- `src/app/chat/page.tsx`: the header gets the "←" `<Link href="/">` (named "back to the welcome page") and the decorative avatar (`aria-hidden`). The `role="status"` line now holds a screen-reader-only "future maya is typing" plus the `TypingBubble`. The send button has a solid look and a `disabled:` look.
- `src/app/globals.css`: the `typing-dot` keyframes and `--animate-typing-dot`.
- Not changed: `route.ts`, `prompt.ts`, your `receipts.ts`, `history.ts`, `chat-client.ts`.

### Why the preview can't drift from the real chat
The preview isn't a copy of the chat's markup. It *is* the chat's `ChatBubble`, called without a click handler:

```tsx
<ChatBubble message={PREVIEW_REPLY} memories={PREVIEW_MEMORIES} />
```

Inside `ReceiptChip`, the chip's classes (`look`) and contents (`face`: 🧠, label, ✎) are built once. Then one `if` picks the wrapper: no `onOpen` gives a `<span>`, otherwise a `<button>`. If you restyle a chip later, the preview changes with it. A test compares the computed styles of the preview and a real chat bubble and chips, in light and dark, and they match.

The welcome page is a Server Component, and that's why the handler has to be left out. Server Components render to HTML, and HTML can't carry a JavaScript function, so `onClick` can't exist there. `ChatBubble` and `ReceiptChip` have no `"use client"` and no hooks, so the server can render them as long as no function is passed in. In the chat, they run in the browser as part of the `"use client"` page.

### Key concepts
- **An optional callback picks the behavior.** `onOpen?: (receipt: Receipt) => void` is like `on_open: Callable[[Receipt], None] | None = None` in Python. The function checks `if (!onOpen)` and returns the inert version. It's like a Jinja macro that renders a link only when it's given a URL.
- **Tailwind variants are just CSS.** A variant is a prefix that wraps the utility in a condition. Here's what Tailwind actually generated for this app (copied from the browser):

  | Class you write | CSS it becomes |
  | --- | --- |
  | `motion-safe:animate-typing-dot` | `@media (prefers-reduced-motion: no-preference) { .motion-safe\:animate-typing-dot { animation: var(--animate-typing-dot); } }` |
  | `motion-reduce:...` (not used here) | the same, but inside `@media (prefers-reduced-motion: reduce)` |
  | `disabled:bg-surface` | `.disabled\:bg-surface:disabled { background-color: var(--surface); }` |

  `motion-safe:` means "only when the user hasn't asked for less motion", so animation is opt-in and the safe default is stillness. That's why this app never needs `motion-reduce:`, which suits the opposite design: animate by default, then switch it off. `disabled:` uses the CSS `:disabled` pseudo-class, which matches whenever the button has the `disabled` attribute. So the one prop `disabled={loading || input.trim() === ""}` drives both the behavior and the look. There's no separate "isMuted" state to keep in sync. Python analogy: the browser checks `if settings.prefers_reduced_motion == "no-preference":` or `if button.disabled:` for you, live, and the class name is just a key for that rule.
- **The Step 7 bug: a shorthand resets its longhands.** `[animation-delay:120ms]` and `motion-safe:animate-rise-in` are both a single class, so the rule that comes *later* in the CSS wins. Tailwind emits variant rules after plain ones, and `animation:` is a shorthand: it sets every `animation-*` property, including `animation-delay: 0s`. So every block's delay computed to 0s, and they all rose at once. Python analogy: `style = {**your_delays, **animation_shorthand}`, where the shorthand dict also contains `"delay": 0` and is merged last. The fix, `motion-safe:[animation-delay:120ms]`, puts the delay in the same media block, *after* the shorthand. The test now checks the computed delays: 0.12s for "meet maya", 0.36s for "how it works", and so on.
- **Live regions: say it once, in words.** A `role="status"` element is watched by screen readers, which read out new content when it appears. The dots are `aria-hidden` (a screen reader would only say "dot dot dot", or nothing), and a `sr-only` span says "future maya is typing" instead. Python analogy: logging, where you emit one clear message to the channel the listener subscribes to.
- **Navigation keeps the chat (cacheComponents).** `<Link href="/">` swaps pages without reloading the tab, and with `cacheComponents` Next.js *hides* the chat (React's `<Activity>`) instead of throwing it away. Tested: the messages, a corrected memory, and an unsent draft are all still there when you come back, and so is a reply that arrives while you're on the welcome page. Python analogy: the chat is an object kept in a cache, and an `asyncio` task that was already running still finishes and writes into it. A full reload still starts fresh.

### One line worth understanding
```tsx
className="rounded-full border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-colors ... disabled:border-line disabled:bg-surface disabled:text-muted"
```
This is the send button (`src/app/chat/page.tsx`):
- `border border-accent bg-accent`: a 1px border and a fill, both the `--accent` green. The border is there even in the solid state so the button is the same size in both states and nothing jumps.
- `text-accent-ink`: white text on the green (dark text in dark mode).
- `transition-colors`: fades between the two looks instead of snapping.
- `disabled:border-line disabled:bg-surface disabled:text-muted`: when the button has the `disabled` attribute, swap in the message box's quiet look: hairline border, surface fill, muted text. Measured contrast for the muted label: 5.2:1 in light, 6.1:1 in dark, above the 4.5:1 guideline for small text.
- `...`: the focus ring classes, unchanged.

In Python terms: `classes = SOLID if not button.disabled else MUTED`, except the browser evaluates that `if` for you, every time `disabled` changes.

### Quiz
The second typing dot has `motion-safe:animate-typing-dot motion-safe:[animation-delay:160ms]`. Suppose someone "simplifies" its delay to a plain `[animation-delay:160ms]`. With normal motion settings, what would you see the three dots do, and why? Would anything change for someone with "reduce motion" turned on?
