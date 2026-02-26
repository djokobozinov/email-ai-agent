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
  title: "Gmail + Telegram Assistant + Notion Notes",
  description:
    "Open-source Gmail AI agent. Run it yourself—deploy, configure, and get summaries in Telegram, assistant replies, and *-prefixed notes to Notion.",
  openGraph: {
    type: "website",
    title: "Gmail + Telegram Assistant + Notion Notes",
    description:
      "Open-source Gmail AI agent. Run it yourself—deploy, configure, and get summaries in Telegram, assistant replies, and *-prefixed notes to Notion.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gmail + Telegram Assistant + Notion Notes",
    description:
      "Open-source Gmail AI agent. Run it yourself—deploy, configure, and get summaries in Telegram, assistant replies, and *-prefixed notes to Notion.",
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
