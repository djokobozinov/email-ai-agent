import { NextResponse } from "next/server";

const REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APP_URL",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

const REFRESH_TOKEN_VARS = [
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_REFRESH_TOKEN_2",
  "GOOGLE_REFRESH_TOKEN_3",
  "GOOGLE_REFRESH_TOKEN_4",
  "GOOGLE_REFRESH_TOKEN_5",
] as const;

function hasAtLeastOneRefreshToken(): boolean {
  return REFRESH_TOKEN_VARS.some((name) => process.env[name]);
}

function getMissingVars(): string[] {
  const missing: string[] = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (!hasAtLeastOneRefreshToken()) {
    missing.push("GOOGLE_REFRESH_TOKEN (or _2, _3, _4, _5)");
  }
  return missing;
}

function isFullyConfigured(): boolean {
  return getMissingVars().length === 0;
}

export async function GET() {
  const configured = isFullyConfigured();
  const missing = configured ? undefined : getMissingVars();
  return NextResponse.json({ configured, missing });
}
