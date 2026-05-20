import { NextRequest, NextResponse } from "next/server";
import {
  TELEGRAM_WEBHOOK_SETUP_REQUIRED_ENV_VARS,
  getConfiguredValue,
} from "@/lib/config";
import { setTelegramWebhook } from "@/lib/telegram";

function isPasswordValid(password?: string): boolean {
  const testPassword = getConfiguredValue("TEST_PASSWORD");
  return !!testPassword && password === testPassword;
}

function getMissingConfigVars(): string[] {
  return TELEGRAM_WEBHOOK_SETUP_REQUIRED_ENV_VARS.filter(
    (name) => !getConfiguredValue(name)
  );
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
