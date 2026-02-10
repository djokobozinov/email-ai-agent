import { NextResponse } from "next/server";

const REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "APP_URL",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

function getMissingVars(): string[] {
  return REQUIRED_VARS.filter((name) => !process.env[name]);
}

function isFullyConfigured(): boolean {
  return getMissingVars().length === 0;
}

export async function GET() {
  const configured = isFullyConfigured();
  const missing = configured ? undefined : getMissingVars();
  return NextResponse.json({ configured, missing });
}
