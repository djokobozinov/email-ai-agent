import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  createCalendarEvent,
  getCalendarReport,
  type CalendarReportTarget,
  type CreateCalendarEventInput,
} from "./calendar";
import {
  ASSISTANT_SYSTEM_PROMPT,
  CALENDAR_TIMEZONE,
  OPENAI_CREDITS_EXHAUSTED_MESSAGE,
  getConfiguredValue,
} from "./config";
import { getOpenAIModel } from "./openai";
import {
  getVranskoWeatherReport,
  type WeatherReportTarget,
} from "./weather";

function detectCalendarReportTarget(
  userMessage: string
): CalendarReportTarget | null {
  const normalized = userMessage.toLowerCase();
  const asksForCalendar =
    /\b(calendar|cal|agenda|schedule|event|events|meeting|meetings)\b/.test(
      normalized
    );
  if (!asksForCalendar) return null;

  if (/\btom+or+ow\b|\btomorrow\b/.test(normalized)) return "tomorrow";
  if (/\btoday\b/.test(normalized)) return "today";

  return null;
}

function detectWeatherReportTarget(
  userMessage: string
): WeatherReportTarget | null {
  const normalized = userMessage.toLowerCase();
  const asksForWeather =
    /\b(weather|forecast|rain|temperature|temp|cold|hot|sunny|cloudy)\b/.test(
      normalized
    );
  if (!asksForWeather) return null;

  if (/\btom+or+ow\b|\btomorrow\b/.test(normalized)) return "tomorrow";
  if (/\btoday\b/.test(normalized)) return "today";

  return null;
}

function toDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTomorrowDateKey(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return toDateKey(tomorrow);
}

function normalizeParsedDate(
  dateText: string,
  now = new Date()
): string | null {
  const normalized = dateText.toLowerCase();
  if (normalized === "today") return toDateKey(now);
  if (/tom+or+ow|tomorrow/.test(normalized)) return getTomorrowDateKey(now);

  const iso = normalized.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const european = normalized.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (european) {
    return `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
  }

  return null;
}

function normalizeParsedTime(timeText: string): string | null {
  const normalized = timeText.toLowerCase().replace(/\s+/g, "");
  const clock = normalized.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (clock) {
    return `${clock[1].padStart(2, "0")}:${clock[2]}`;
  }

  const meridiem = normalized.match(/\b(1[0-2]|[1-9])(?::([0-5]\d))?(am|pm)\b/);
  if (!meridiem) return null;

  let hour = Number(meridiem[1]);
  const minute = meridiem[2] ?? "00";
  if (meridiem[3] === "pm" && hour !== 12) hour += 12;
  if (meridiem[3] === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

export function parseCreateCalendarEventRequest(
  userMessage: string,
  now = new Date()
): CreateCalendarEventInput | null {
  const intent =
    /\b(add|create|schedule|book)\b.*\b(event|meeting|appointment|calendar)\b/i.test(
      userMessage
    );
  if (!intent) return null;

  const dateMatch =
    userMessage.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/) ??
    userMessage.match(/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/) ??
    userMessage.match(/\b(today|tom+or+ow|tomorrow)\b/i);
  const timeMatch =
    userMessage.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/) ??
    userMessage.match(/\b(1[0-2]|[1-9])(?::[0-5]\d)?\s?(am|pm)\b/i);

  if (!dateMatch || !timeMatch) return null;

  const date = normalizeParsedDate(dateMatch[0], now);
  const time = normalizeParsedTime(timeMatch[0]);
  if (!date || !time) return null;

  const title = userMessage
    .replace(/\b(add|create|schedule|book)\b/gi, " ")
    .replace(/\b(event|meeting|appointment|calendar)\b/gi, " ")
    .replace(/\b(on|at|for|called|titled)\b/gi, " ")
    .replace(dateMatch[0], " ")
    .replace(timeMatch[0], " ")
    .replace(/[-,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) return null;
  return { title, date, time };
}

function isOpenAICreditsExhaustedError(err: unknown): boolean {
  const details = [
    err instanceof Error ? err.message : "",
    typeof err === "object" && err !== null && "code" in err
      ? String(err.code)
      : "",
    typeof err === "object" && err !== null && "statusCode" in err
      ? String(err.statusCode)
      : "",
    typeof err === "object" && err !== null && "status" in err
      ? String(err.status)
      : "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    details.includes("insufficient_quota") ||
    details.includes("quota") ||
    details.includes("billing") ||
    details.includes("credits") ||
    details.includes("429")
  );
}

export async function generateAssistantReply(
  userMessage: string
): Promise<string | null> {
  const eventInput = parseCreateCalendarEventRequest(userMessage);
  if (eventInput) {
    const result = await createCalendarEvent(eventInput);
    if (!result) {
      return "Calendar access is not configured yet. Add Google Calendar credentials and a refresh token with Calendar event access to enable this.";
    }

    return result.ok
      ? result.message
      : `${result.message} ${result.error ?? "Unknown error."}`;
  }

  const calendarTarget = detectCalendarReportTarget(userMessage);
  if (calendarTarget) {
    return (
      (await getCalendarReport(calendarTarget)) ??
      "Calendar access is not configured yet. Add Google Calendar credentials and a refresh token to enable this."
    );
  }

  const weatherTarget = detectWeatherReportTarget(userMessage);
  if (weatherTarget) {
    return (
      (await getVranskoWeatherReport(new Date(), weatherTarget)) ??
      "Weather access is not available right now. Please try again later."
    );
  }

  const apiKey = getConfiguredValue("OPENAI_API_KEY");
  if (!apiKey) return null;

  const openai = createOpenAI({ apiKey });
  const model = getOpenAIModel();

  try {
    const result = await generateText({
      model: openai(model),
      system: ASSISTANT_SYSTEM_PROMPT,
      prompt: userMessage,
    });

    const text = result.text?.trim();
    return text || null;
  } catch (err) {
    console.error(
      "Assistant error:",
      err instanceof Error ? err.message : "Unknown"
    );
    if (isOpenAICreditsExhaustedError(err)) {
      return OPENAI_CREDITS_EXHAUSTED_MESSAGE;
    }

    return null;
  }
}
