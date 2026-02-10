import type { Summary } from "./summarizer";
import type { EmailMessage } from "./gmail";

function formatMessage(email: EmailMessage, summary: Summary): string {
  const bullets = summary.bullets
    .map((b) => `– ${b}`)
    .join("\n");
  return `${email.from}
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
