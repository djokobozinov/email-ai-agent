import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredAccountIds,
  listUnreadMessageIds,
  getMessage,
} from "@/lib/gmail";
import { getEmailSummaryFeatureReadiness } from "@/lib/features";
import { summarizeEmail } from "@/lib/summarizer";
import { sendToTelegram } from "@/lib/telegram";
import { getConfiguredValue } from "@/lib/config";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const testPassword = getConfiguredValue("TEST_PASSWORD");
  if (!testPassword || password !== testPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const emailFeature = getEmailSummaryFeatureReadiness();
  if (!emailFeature.enabled) {
    return NextResponse.json({
      processed: 0,
      skipped: true,
      reason:
        "Email summary feature is disabled because required configuration is missing.",
      missing: emailFeature.missing,
    });
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
      console.log("Processing email:", id);
      try {
        const email = await getMessage(id, accountId);
        if (!email) continue;

        const summary = await summarizeEmail(email);
        console.log("Summary:", summary);
        if (!summary) continue;

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
