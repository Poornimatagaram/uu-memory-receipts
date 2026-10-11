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
