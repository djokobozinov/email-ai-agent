/**
 * Central configuration for the AI agent: constants, env-var requirements per
 * feature, and helpers for reading process.env.
 */

// --- Google OAuth & multi-account Gmail ---

/** Max Gmail accounts supported via GOOGLE_REFRESH_TOKEN, _2, … _5. */
export const MAX_GOOGLE_ACCOUNTS = 5;

/** Env var names for each linked Google account (account 1 uses unsuffixed name). */
export const GOOGLE_REFRESH_TOKEN_VARS = [
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_REFRESH_TOKEN_2",
  "GOOGLE_REFRESH_TOKEN_3",
  "GOOGLE_REFRESH_TOKEN_4",
  "GOOGLE_REFRESH_TOKEN_5",
] as const;

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

/** Shown in setup errors when a refresh token env var is missing. */
export const EMAIL_SUMMARY_REFRESH_TOKEN_HINT =
  "GOOGLE_REFRESH_TOKEN (or _2, _3, _4, _5)";

// --- Required env vars per feature (used for startup / health checks) ---

export const EMAIL_SUMMARY_REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export const TELEGRAM_ASSISTANT_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "OPENAI_API_KEY",
] as const;

export const NOTION_NOTES_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "NOTION_API_KEY",
  "NOTION_NOTES_PAGE_ID",
] as const;

export const RECEIPT_CAPTURE_REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "NOTION_API_KEY",
  "NOTION_NOTES_PAGE_ID",
] as const;

export const TELEGRAM_TEST_REQUIRED_VARS = [
  "TEST_PASSWORD",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export const TELEGRAM_WEBHOOK_SETUP_REQUIRED_VARS = [
  "TEST_PASSWORD",
  "APP_URL",
  "TELEGRAM_BOT_TOKEN",
] as const;

export const DAILY_WEATHER_REPORT_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export const DAILY_CALENDAR_REPORT_REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

/** Minimal env for registering the Telegram webhook (no TEST_PASSWORD). */
export const TELEGRAM_WEBHOOK_SETUP_REQUIRED_ENV_VARS = [
  "APP_URL",
  "TELEGRAM_BOT_TOKEN",
] as const;

// --- OpenAI & Telegram assistant ---

export const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
export const ASSISTANT_SYSTEM_PROMPT =
  "You are a helpful Telegram assistant. Give concise, accurate answers. Use plain text only.";
export const OPENAI_CREDITS_EXHAUSTED_MESSAGE =
  "I could not use AI because the OpenAI credits or quota appear to be exhausted. Please add credits or update billing, then try again.";

/** Prompt for Gmail summarizer; output must be JSON (see rules in string). */
export const EMAIL_SUMMARIZER_SYSTEM_PROMPT = `You summarize emails factually and concisely. Output valid JSON only.

For REGULAR emails, use:
{"title": "Short title", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], "isReceipt": false, "isImportant": true/false}

For RECEIPTS or INVOICES (payment confirmation, purchase receipt, subscription bill, etc.), use:
{"title": "🧾 [Summary: vendor, amount, due date if any. Important – need to pay/action.]", "bullets": [], "isReceipt": true, "isImportant": true/false, "receipt": {"vendor": "Vendor or null", "amount": 12.34, "currency": "EUR or null", "date": "YYYY-MM-DD or null", "dueDate": "YYYY-MM-DD or null", "reference": "Invoice/order/reference number or null", "description": "Short description or null"}}

Rules:
- Regular: 1 title, 2-3 bullets maximum. Preserve key facts: who, what, when, numbers. No advice, opinions, or suggestions.
- Receipts/invoices: No bullets. Put a concise summary in title. Include 🧾 emoji. Add "Important – need to pay" (or similar) if action is needed. Preserve: vendor, amount, due date, reference numbers.
- For regular emails set receipt to null. For receipts/invoices, fill every receipt field you can verify and use null for missing values. Never guess values.
- isImportant: Set to true when the email likely needs the recipient's attention. Consider important: personal/work messages from known people, action required (reply, deadline, meeting), time-sensitive requests, financial/legal matters. Consider NOT important: newsletters, marketing, automated notifications, low-priority updates, spam.
- If email is empty, promotional, or has no meaningful content, return:
  {"title": "No meaningful content to summarize", "bullets": [], "isReceipt": false, "isImportant": false}`;

// --- Google Calendar (daily report & event creation) ---

export const CALENDAR_TIMEZONE = "Europe/Ljubljana";
/** Local hour (0–23) when the daily calendar digest is sent. */
export const DAILY_CALENDAR_REPORT_HOUR = 20;
export const DEFAULT_EVENT_DURATION_MINUTES = 60;
export const DEFAULT_EVENT_CALENDAR_ID = "primary";
export const DEFAULT_HOLIDAY_CALENDAR_ID =
  "en.slovenian#holiday@group.v.calendar.google.com";
export const DEFAULT_BIRTHDAY_CALENDAR_ID =
  "addressbook#contacts@group.v.calendar.google.com";

// --- Weather reports (Open-Meteo, Vransko) ---

export const WEATHER_LOCATION_NAME = "Vransko";
export const VRANSKO_LATITUDE = 46.2441;
export const VRANSKO_LONGITUDE = 14.9514;
export const WEATHER_TIMEZONE = "Europe/Ljubljana";
export const MORNING_WEATHER_REPORT_HOUR = 7;
export const EVENING_WEATHER_REPORT_HOUR = 20;
/** Minute past the hour for both morning and evening weather cron. */
export const WEATHER_REPORT_MINUTE = 30;
/** Hours ahead to flag severe or notable conditions in the report. */
export const IMPORTANT_WEATHER_LOOKAHEAD_HOURS = 6;

// --- Gmail polling & summarization ---

/** How far back each mail check looks for new messages. */
export const EMAIL_LOOKBACK_MINUTES = 30;
export const DEFAULT_MAX_EMAILS_PER_RUN = 5;
export const MAX_EMAILS_PER_RUN_LIMIT = 10;
/** Skip bodies shorter than this (likely empty or stub messages). */
export const MIN_EMAIL_BODY_LENGTH = 5;
/** Gmail label IDs used to filter out social/promo in lib/filters. */
export const CATEGORY_SOCIAL = "CATEGORY_SOCIAL";
export const CATEGORY_PROMOTIONS = "CATEGORY_PROMOTIONS";

// --- Notion API (notes sync) ---

export const NOTION_API_BASE_URL = "https://api.notion.com/v1";
export const NOTION_API_VERSION = "2022-06-28";
/** Notion rich_text block limit is 2000; stay slightly under. */
export const NOTION_TEXT_CHUNK_SIZE = 1900;
export const NOTION_CHILDREN_PAGE_SIZE = 100;

// --- Env helpers ---

/** Returns trimmed env value, or null if missing/blank. */
export function getConfiguredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/** Parses a comma-separated env var into a trimmed, non-empty string array. */
export function getCommaSeparatedConfig(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Env var name for Google account 1–5 (1 → GOOGLE_REFRESH_TOKEN). */
export function getGoogleRefreshTokenVar(accountId: number): string {
  return accountId === 1
    ? "GOOGLE_REFRESH_TOKEN"
    : `GOOGLE_REFRESH_TOKEN_${accountId}`;
}

export function getGoogleRefreshToken(accountId: number): string | undefined {
  return process.env[getGoogleRefreshTokenVar(accountId)];
}

/** Account IDs 1..MAX_GOOGLE_ACCOUNTS that have a refresh token set. */
export function getGoogleConfiguredAccountIds(): number[] {
  const ids: number[] = [];
  for (let i = 1; i <= MAX_GOOGLE_ACCOUNTS; i++) {
    if (getGoogleRefreshToken(i)) ids.push(i);
  }
  return ids;
}

/** OAuth redirect URI derived from APP_URL. */
export function getGoogleRedirectUri(): string | undefined {
  const appUrl = getConfiguredValue("APP_URL");
  return appUrl ? `${appUrl.replace(/\/+$/, "")}/api/auth/gmail` : undefined;
}

/** EMAIL_SUMMARY_ALLOWED_SENDERS, lowercased for case-insensitive matching. */
export function getEmailSummaryAllowedSenders(): string[] {
  return getCommaSeparatedConfig("EMAIL_SUMMARY_ALLOWED_SENDERS").map((email) =>
    email.toLowerCase()
  );
}

/** EMAIL_SUMMARY_IGNORED_SENDERS, lowercased for case-insensitive matching. */
export function getEmailSummaryIgnoredSenders(): string[] {
  return getCommaSeparatedConfig("EMAIL_SUMMARY_IGNORED_SENDERS").map((email) =>
    email.toLowerCase()
  );
}
