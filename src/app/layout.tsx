import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    // A child route that sets title: "future maya" gets "future maya · memory receipts".
    // It skips src/app/page.tsx, which shares this folder, so that page writes its title out.
    template: "%s · memory receipts",
    default: "memory receipts", // for any page that doesn't set its own title
  },
  description: "Chat with future maya and see which memories each reply used.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
