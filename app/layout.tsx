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
  metadataBase: new URL("https://agent.gbozhinov.com"),
  title: "gjoko-ai-agent",
  description:
    "Self-hosted personal AI agent for Telegram assistant replies, Notion notes, Gmail summaries, weather reports, and small automations.",
  openGraph: {
    type: "website",
    title: "gjoko-ai-agent",
    description:
      "Self-hosted personal AI agent for Telegram assistant replies, Notion notes, Gmail summaries, weather reports, and small automations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "gjoko-ai-agent",
    description:
      "Self-hosted personal AI agent for Telegram assistant replies, Notion notes, Gmail summaries, weather reports, and small automations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
