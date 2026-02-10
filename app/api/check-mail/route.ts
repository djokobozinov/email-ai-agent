import { NextRequest, NextResponse } from "next/server";
import { listUnreadMessageIds, getMessage, isGmailConfigured } from "@/lib/gmail";
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
  let ids: string[] = [];

  try {
    ids = await listUnreadMessageIds();
  } catch (err) {
    console.error("Gmail list error:", err instanceof Error ? err.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to list emails. Check Gmail configuration." },
      { status: 500 }
    );
  }

  for (const id of ids) {
    try {
      const email = await getMessage(id);
      if (!email) continue;

      const summary = await summarizeEmail(email);
      if (!summary || summary.bullets.length === 0) continue;

      const sent = await sendToTelegram(email, summary);
      if (sent) processed++;
    } catch (err) {
      console.error("Email processing error:", err instanceof Error ? err.message : "Unknown");
    }
  }

  return NextResponse.json({ processed });
}
