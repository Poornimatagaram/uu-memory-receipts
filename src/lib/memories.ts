import type { Memory, MemoryStatus, MemoryType } from "@/lib/types";

// Runtime copies of the unions in types.ts. Types disappear at runtime, so we
// need real values to check against. Typing each object as Record<Union, true>
// makes TypeScript complain if a value is missing or extra, so the two can't drift.
const MEMORY_TYPES: Record<MemoryType, true> = {
  goal: true,
  project: true,
  question: true,
  feeling: true,
  preference: true,
};

const MEMORY_STATUSES: Record<MemoryStatus, true> = {
  active: true,
  corrected: true,
  forgotten: true,
};

// "2026-07-13": the only date format the UI knows how to show.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A type guard: if it returns true, TypeScript treats `value` as a Memory afterwards.
export function isMemory(value: unknown): value is Memory {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    m.id !== "" &&
    typeof m.label === "string" &&
    m.label.trim() !== "" &&
    typeof m.type === "string" &&
    Object.hasOwn(MEMORY_TYPES, m.type) &&
    typeof m.date === "string" &&
    ISO_DATE.test(m.date) &&
    typeof m.text === "string" &&
    m.text.trim() !== "" &&
    typeof m.status === "string" &&
    Object.hasOwn(MEMORY_STATUSES, m.status) &&
    (m.originalText === undefined || typeof m.originalText === "string")
  );
}

// Keeps the valid memories and drops the rest, instead of trusting a cast.
// A repeated id is dropped too, because receipts look memories up by id.
export function parseMemories(raw: unknown): Memory[] {
  if (!Array.isArray(raw)) {
    console.warn("Seed memories must be a JSON array. Starting with no memories.");
    return [];
  }

  const seenIds = new Set<string>();
  const memories: Memory[] = [];
  for (const item of raw) {
    if (isMemory(item) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      memories.push(item);
    }
  }

  const dropped = raw.length - memories.length;
  if (dropped > 0) {
    console.warn(`Dropped ${dropped} invalid or duplicate memories from the seed data.`);
  }
  return memories;
}
