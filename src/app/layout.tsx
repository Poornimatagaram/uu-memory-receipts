import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The heading font. next/font downloads it when the app is built and serves it
// from this site, so visitors' browsers never contact Google. It's a variable
// font: one file holds every weight. By default that's the only axis it includes;
// `axes` adds two more of Fraunces' own: SOFT (how rounded the letters are) and
// opsz (optical size: finer details for big text, sturdier shapes for small).
// globals.css turns it into the font-display class.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: {
    // A child route that sets title: "Future Maya" gets "Future Maya · Memory receipts".
    // It skips src/app/page.tsx, which shares this folder, so that page writes its title out.
    template: "%s · Memory receipts",
    default: "Memory receipts", // for any page that doesn't set its own title
  },
  description: "Chat with future Maya and see which memories each reply used.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
