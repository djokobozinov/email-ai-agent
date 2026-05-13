import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredAccountIds,
  listUnreadMessageIds,
  getMessage,
} from "@/lib/gmail";
import {
  getDailyWeatherReportFeatureReadiness,
  getEmailSummaryFeatureReadiness,
} from "@/lib/features";
import { summarizeEmail } from "@/lib/summarizer";
import { sendRawMessage, sendToTelegram } from "@/lib/telegram";
import {
  getVranskoWeatherReport,
  shouldSendDailyWeatherReport,
} from "@/lib/weather";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailFeature = getEmailSummaryFeatureReadiness();
  const weatherFeature = getDailyWeatherReportFeatureReadiness();
  let processed = 0;
  let weatherSent = false;
  const weatherDue = shouldSendDailyWeatherReport();

  if (emailFeature.enabled) {
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
  }

  if (weatherFeature.enabled && weatherDue) {
    const report = await getVranskoWeatherReport();
    weatherSent = report ? await sendRawMessage(report) : false;
  }

  return NextResponse.json({
    processed,
    email: emailFeature.enabled
      ? { enabled: true }
      : {
          enabled: false,
          skipped: true,
          reason:
            "Email summary feature is disabled because required configuration is missing.",
          missing: emailFeature.missing,
        },
    weather: weatherFeature.enabled
      ? { enabled: true, due: weatherDue, sent: weatherSent }
      : {
          enabled: false,
          due: weatherDue,
          sent: false,
          skipped: true,
          reason:
            "Daily weather report feature is disabled because required configuration is missing.",
          missing: weatherFeature.missing,
        },
  });
}
