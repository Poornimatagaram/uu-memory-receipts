// A "receipt" says which memory a reply used, and why.
// It has the same shape as each item in ChatMessage["used"] (src/lib/types.ts).
// TypeScript compares shapes, not names, so the two are interchangeable.
export type Receipt = { id: string; why: string };

/**
 * Keep only the receipts that point at a real, active memory, and drop duplicates.
 *
 * TODO(human): implement this function. It currently returns [] so the app
 * still runs; until you implement it, every reply will show no memory chips.
 *
 * Why this matters:
 * Receipts are a promise to the user: "this is exactly what I remembered to
 * write this reply." Claude picks the ids itself, so it can get them wrong:
 *   - it can cite an id that doesn't exist (a made-up memory),
 *   - it can cite a memory the user just forgot, or one the request didn't include,
 *   - it can cite the same memory twice.
 * A chip that points nowhere is a fake receipt. A chip for a memory the user
 * told us to forget makes it look like "forget" didn't work. Either one breaks
 * the user's trust in every other receipt, so we check Claude's work here
 * instead of trusting it.
 *
 * What it must do:
 *   1. Keep a receipt only if its `id` is in `activeMemoryIds`.
 *   2. If the same `id` appears more than once, keep only the first one.
 *   3. Keep the remaining receipts in their original order.
 *   4. Return a new array. Don't modify `used`.
 *
 * Example:
 *   verifyReceipts(
 *     [{ id: "m02", why: "a" }, { id: "m99", why: "b" }, { id: "m02", why: "c" }],
 *     ["m01", "m02"],
 *   )
 *   // returns [{ id: "m02", why: "a" }]
 *   // m99 doesn't exist, and the second m02 is a duplicate.
 *
 * Hint: a `Set` works like a Python `set`. `new Set(activeMemoryIds)` gives fast
 * `.has(id)` lookups, and a second Set can track the ids you've already kept.
 */
export function verifyReceipts(used: Receipt[], activeMemoryIds: string[]): Receipt[] {
  const active = new Set(activeMemoryIds); // all valid IDs, for fast lookup
  const seen = new Set<string>();          // IDs we've already kept

  return used.filter((receipt) => {
    if (!active.has(receipt.id)) return false; // rule 1: drop fake or forgotten memories
    if (seen.has(receipt.id)) return false;    // rule 2: drop duplicates
    seen.add(receipt.id);                      // remember that we kept this one
    return true;                               // keep it
  });
}
