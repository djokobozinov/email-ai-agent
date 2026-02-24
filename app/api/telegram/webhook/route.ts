import { NextRequest, NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/assistant";
import { sendMessageToTelegramChat } from "@/lib/telegram";
import { extractTelegramNote, saveNoteToNotion } from "@/lib/notion";

interface TelegramMessage {
  text?: string;
  chat?: {
    id?: number | string;
  };
  from?: {
    is_bot?: boolean;
  };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

function getMessageFromUpdate(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

function isWebhookAuthorized(request: NextRequest): boolean {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) return true;
  return (
    request.headers.get("x-telegram-bot-api-secret-token") === webhookSecret
  );
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as
    | TelegramUpdate
    | null;
  if (!update) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const message = getMessageFromUpdate(update);
  const chatId = message?.chat?.id;
  const input = message?.text?.trim();
  if (!chatId || !input || message?.from?.is_bot) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const note = extractTelegramNote(input);
  if (note !== null) {
    const noteResult = await saveNoteToNotion(note.text, {
      subpageName: note.subpageName,
    });

    const noteReply = noteResult.ok
      ? note.subpageName
        ? `Saved your note to Notion subpage "${note.subpageName}".`
        : "Saved your note to Notion."
      : `Could not save note to Notion: ${noteResult.error ?? "Unknown error."}`;

    const noteSent = await sendMessageToTelegramChat(chatId, noteReply);
    if (!noteSent) {
      return NextResponse.json(
        { error: "Failed to send Telegram response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: noteResult.ok,
      handled: "notion_note",
      ...(noteResult.error ? { error: noteResult.error } : {}),
    });
  }

  const reply =
    (await generateAssistantReply(input)) ??
    "I could not generate a response right now. Please try again.";

  const sent = await sendMessageToTelegramChat(chatId, reply);
  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send Telegram response" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
