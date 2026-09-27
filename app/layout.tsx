import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOEFL WorkBuddy",
  description: "Mistakes, vocabulary, and reusable ideas in one focused TOEFL workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
