import type { Summary } from "./summarizer";
import type { EmailMessage } from "./gmail";

const CATEGORY_SOCIAL = "CATEGORY_SOCIAL";
const CATEGORY_PROMOTIONS = "CATEGORY_PROMOTIONS";

function getCategoryEmoji(email: EmailMessage): string {
  const labels = email.labelIds ?? [];
  if (labels.includes(CATEGORY_SOCIAL)) return "👥 ";
  if (labels.includes(CATEGORY_PROMOTIONS)) return "🏷️ ";
  return "";
}

function formatMessage(email: EmailMessage, summary: Summary): string {
  const prefix = getCategoryEmoji(email);
  if (summary.isReceipt) {
    return `${prefix}${email.from}
${email.subject}

${summary.title}`.trim();
  }
  const bullets = summary.bullets
    .map((b) => `– ${b}`)
    .join("\n");
  return `${prefix}${email.from}
${email.subject}

${bullets}`.trim();
}

export async function sendToTelegram(
  email: EmailMessage,
  summary: Summary
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  const text = formatMessage(email, summary);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: undefined,
        }),
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}

export async function sendRawMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
