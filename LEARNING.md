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
