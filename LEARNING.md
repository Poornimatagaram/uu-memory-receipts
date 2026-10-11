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
