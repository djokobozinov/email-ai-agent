import type { Summary } from "./summarizer";
import type { EmailMessage } from "./gmail";
import {
  CATEGORY_PROMOTIONS,
  CATEGORY_SOCIAL,
  getConfiguredValue,
} from "./config";

function getTelegramToken(): string | null {
  return getConfiguredValue("TELEGRAM_BOT_TOKEN");
}

function getConfiguredChatId(): string | null {
  return getConfiguredValue("TELEGRAM_CHAT_ID");
}

function getAppUrl(): string | null {
  return getConfiguredValue("APP_URL");
}

function getWebhookUrl(): string | null {
  const appUrl = getAppUrl();
  if (!appUrl) return null;
  return `${appUrl.replace(/\/+$/, "")}/api/telegram/webhook`;
}

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

export interface TelegramWebhookSetupResult {
  ok: boolean;
  webhookUrl: string | null;
  secretEnabled: boolean;
  description?: string;
  error?: string;
}

function getCategoryEmoji(email: EmailMessage): string {
  const labels = email.labelIds ?? [];
  if (labels.includes(CATEGORY_SOCIAL)) return "👥 ";
  if (labels.includes(CATEGORY_PROMOTIONS)) return "🏷️ ";
  return "";
}

function formatMessage(email: EmailMessage, summary: Summary): string {
  let prefix = getCategoryEmoji(email);
  if (summary.isImportant) prefix += "⚡ ";
  if (summary.isReceipt) {
    return `${prefix}${email.from}
${email.subject}

${summary.title}`.trim();
  }
  const bullets = summary.bullets.map((b) => `– ${b}`).join("\n");
  const details = [summary.title, bullets].filter(Boolean).join("\n");

  return `${prefix}${email.from}
${email.subject}

${details}`.trim();
}

export async function sendMessageToTelegramChat(
  chatId: string | number,
  text: string
): Promise<boolean> {
  const token = getTelegramToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendToTelegram(
  email: EmailMessage,
  summary: Summary
): Promise<boolean> {
  const chatId = getConfiguredChatId();
  if (!chatId) return false;

  const text = formatMessage(email, summary);
  return sendMessageToTelegramChat(chatId, text);
}

export async function sendRawMessage(text: string): Promise<boolean> {
  const chatId = getConfiguredChatId();
  if (!chatId) return false;
  return sendMessageToTelegramChat(chatId, text);
}

export async function setTelegramWebhook(): Promise<TelegramWebhookSetupResult> {
  const token = getTelegramToken();
  const webhookUrl = getWebhookUrl();
  const webhookSecret = getConfiguredValue("TELEGRAM_WEBHOOK_SECRET");
  const secretEnabled = !!webhookSecret;

  if (!token || !webhookUrl) {
    return {
      ok: false,
      webhookUrl,
      secretEnabled,
      error: "TELEGRAM_BOT_TOKEN and APP_URL are required.",
    };
  }

  const payload: Record<string, string> = { url: webhookUrl };
  if (webhookSecret) {
    payload.secret_token = webhookSecret;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as TelegramApiResponse | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        webhookUrl,
        secretEnabled,
        error:
          data?.description ??
          `Telegram API request failed with status ${res.status}.`,
      };
    }

    return {
      ok: true,
      webhookUrl,
      secretEnabled,
      description: data.description,
    };
  } catch {
    return {
      ok: false,
      webhookUrl,
      secretEnabled,
      error: "Failed to reach Telegram API.",
    };
  }
}
