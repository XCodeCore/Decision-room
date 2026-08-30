import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Room — AI-assisted decisions",
  description: "A collaborative workspace for decisions with humans and AI agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
