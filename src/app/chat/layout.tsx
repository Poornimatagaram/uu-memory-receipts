import type { Metadata } from "next";

// The chat page (page.tsx in this folder) starts with "use client", and only
// Server Components can export `metadata`. This layout is a Server Component,
// so the chat's tab title lives here. With the template in src/app/layout.tsx,
// the tab reads "future maya · memory receipts".
export const metadata: Metadata = {
  title: "future maya",
};

// No UI of its own: it just renders the page.
export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return children;
}
