import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getCalendarReport, type CalendarReportTarget } from "./calendar";
import { getOpenAIModel } from "./openai";

const ASSISTANT_SYSTEM_PROMPT =
  "You are a helpful Telegram assistant. Give concise, accurate answers. Use plain text only.";

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

export async function generateAssistantReply(
  userMessage: string
): Promise<string | null> {
  const calendarTarget = detectCalendarReportTarget(userMessage);
  if (calendarTarget) {
    return (
      (await getCalendarReport(calendarTarget)) ??
      "Calendar access is not configured yet. Add Google Calendar credentials and a refresh token to enable this."
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
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
    return null;
  }
}
