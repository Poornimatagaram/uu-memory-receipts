// Shared shapes used across the app. These are compile-time only:
// TypeScript checks them while you code, then erases them at runtime.

export type MemoryType = "goal" | "project" | "question" | "feeling" | "preference";

export type MemoryStatus = "active" | "corrected" | "forgotten";

export type Memory = {
  id: string;
  label: string; // a 2-4 word name for chips, e.g. "research goal"
  type: MemoryType;
  date: string; // ISO date, e.g. "2026-07-13"
  text: string;
  status: MemoryStatus;
  originalText?: string; // only set when status is "corrected"
};

export type ChatMessage = {
  role: "user" | "future";
  text: string;
  used?: { id: string; why: string }[]; // memory receipts: which memories a reply used, and why
  askedAgain?: boolean; // UI only: a user message re-sent with "ask again" after a memory changed
  // UI only: the text each cited memory had when this reply arrived, keyed by id,
  // e.g. { m01: "I want to become..." }. Used to spot memories changed since then
  // (see src/lib/history.ts). Never sent to the server.
  usedText?: Record<string, string>;
};
