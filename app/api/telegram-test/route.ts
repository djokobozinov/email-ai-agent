import { NextRequest, NextResponse } from "next/server";
import { sendRawMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { password, message } = body as { password?: string; message?: string };

  const testPassword = process.env.TEST_PASSWORD;
  if (!testPassword || password !== testPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const text = message.trim();
  if (!text) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const sent = await sendRawMessage(text);
  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
