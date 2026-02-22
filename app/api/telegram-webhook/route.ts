import { NextRequest, NextResponse } from "next/server";
import { setTelegramWebhook } from "@/lib/telegram";

const REQUIRED_ENV_VARS = ["APP_URL", "TELEGRAM_BOT_TOKEN"] as const;

function isPasswordValid(password?: string): boolean {
  const testPassword = process.env.TEST_PASSWORD?.trim();
  return !!testPassword && password === testPassword;
}

function getMissingConfigVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const missingConfigVars = getMissingConfigVars();
  if (missingConfigVars.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required configuration: ${missingConfigVars.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const result = await setTelegramWebhook();
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to set Telegram webhook.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    webhookUrl: result.webhookUrl,
    secretEnabled: result.secretEnabled,
    description: result.description ?? "Webhook set successfully.",
  });
}
