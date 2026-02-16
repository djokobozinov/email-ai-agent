import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredAccountIds,
  listUnreadMessageIds,
  getMessage,
  isGmailConfigured,
} from "@/lib/gmail";
import { summarizeEmail } from "@/lib/summarizer";
import { sendToTelegram } from "@/lib/telegram";

function isFullyConfigured(): boolean {
  return !!(
    isGmailConfigured() &&
    process.env.OPENAI_API_KEY &&
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const testPassword = process.env.TEST_PASSWORD;
  if (!testPassword || password !== testPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!isFullyConfigured()) {
    return NextResponse.json(
      { error: "Gmail, OpenAI, and Telegram must be configured." },
      { status: 400 }
    );
  }

  let processed = 0;
  const accountIds = getConfiguredAccountIds();

  for (const accountId of accountIds) {
    let ids: string[] = [];
    try {
      ids = await listUnreadMessageIds(accountId);
    } catch (err) {
      console.error(
        `Gmail list error (account ${accountId}):`,
        err instanceof Error ? err.message : "Unknown"
      );
      continue;
    }

    for (const id of ids) {
      try {
        const email = await getMessage(id, accountId);
        if (!email) continue;

        const summary = await summarizeEmail(email);
        if (
          !summary ||
          (summary.bullets.length === 0 && !summary.isReceipt)
        )
          continue;

        const sent = await sendToTelegram(email, summary);
        if (sent) processed++;
      } catch (err) {
        console.error(
          "Email processing error:",
          err instanceof Error ? err.message : "Unknown"
        );
      }
    }
  }

  return NextResponse.json({ processed });
}
