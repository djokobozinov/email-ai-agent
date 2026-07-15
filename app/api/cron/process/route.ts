import { NextRequest, NextResponse } from "next/server";
import { getConfiguredValue } from "@/lib/config";
import {
  getConfiguredAccountIds,
  getGmailMessageUrl,
  listUnreadMessageIds,
  getMessage,
} from "@/lib/gmail";
import {
  getDailyWeatherReportFeatureReadiness,
  getDailyCalendarReportFeatureReadiness,
  getEmailSummaryFeatureReadiness,
  getReceiptCaptureFeatureReadiness,
} from "@/lib/features";
import { summarizeEmail } from "@/lib/summarizer";
import { sendRawMessage, sendToTelegram } from "@/lib/telegram";
import {
  getTomorrowCalendarReport,
  shouldSendDailyCalendarReport,
} from "@/lib/calendar";
import {
  getDailyWeatherReportTarget,
  getVranskoImportantWeatherUpdate,
  getVranskoWeatherReport,
  shouldCheckHourlyWeatherUpdate,
  shouldSendDailyWeatherReport,
} from "@/lib/weather";
import { saveNoteToNotion } from "@/lib/notion";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = getConfiguredValue("CRON_SECRET");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailFeature = getEmailSummaryFeatureReadiness();
  const receiptFeature = getReceiptCaptureFeatureReadiness();
  const weatherFeature = getDailyWeatherReportFeatureReadiness();
  const calendarFeature = getDailyCalendarReportFeatureReadiness();
  const now = new Date();
  let processed = 0;
  let receiptsSaved = 0;
  let receiptFailures = 0;
  let weatherSent = false;
  let importantWeatherSent = false;
  let calendarSent = false;
  const weatherDue = shouldSendDailyWeatherReport(now);
  const weatherTarget = getDailyWeatherReportTarget(now);
  const importantWeatherDue = shouldCheckHourlyWeatherUpdate(now);
  const calendarDue = shouldSendDailyCalendarReport();

  if (emailFeature.enabled || receiptFeature.enabled) {
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

          if (emailFeature.enabled) {
            const sent = await sendToTelegram(email, summary);
            if (sent) processed++;
          }

          if (receiptFeature.enabled && summary.isReceipt) {
            const receipt = summary.receipt;
            const details = [
              summary.title,
              receipt?.vendor ? `Vendor: ${receipt.vendor}` : null,
              receipt?.amount !== null && receipt?.amount !== undefined
                ? `Amount: ${receipt.currency ? `${receipt.currency} ` : ""}${receipt.amount}`
                : null,
              receipt?.date ? `Date: ${receipt.date}` : null,
              receipt?.dueDate ? `Due date: ${receipt.dueDate}` : null,
              receipt?.reference ? `Reference: ${receipt.reference}` : null,
              receipt?.description ? `Details: ${receipt.description}` : null,
              `Subject: ${email.subject}`,
              `From: ${email.from}`,
              `Email: ${getGmailMessageUrl(email.id, accountId)}`,
            ].filter((line): line is string => !!line);
            const result = await saveNoteToNotion(details.join("\n"), {
              subpageName: "Invoices",
            });
            if (result.ok) receiptsSaved++;
            else {
              receiptFailures++;
              console.error("Receipt capture error:", result.error ?? "Unknown");
            }
          }
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
    const report = await getVranskoWeatherReport(
      now,
      weatherTarget ?? "tomorrow"
    );
    weatherSent = report ? await sendRawMessage(report) : false;
  }

  if (weatherFeature.enabled && importantWeatherDue) {
    const update = await getVranskoImportantWeatherUpdate();
    importantWeatherSent = update ? await sendRawMessage(update) : false;
  }

  if (calendarFeature.enabled && calendarDue) {
    const report = await getTomorrowCalendarReport();
    calendarSent = report ? await sendRawMessage(report) : false;
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
    receipts: receiptFeature.enabled
      ? {
          enabled: true,
          saved: receiptsSaved,
          failed: receiptFailures,
        }
      : {
          enabled: false,
          saved: 0,
          failed: 0,
          skipped: true,
          reason:
            "Receipt capture is disabled because required configuration is missing.",
          missing: receiptFeature.missing,
        },
    weather: weatherFeature.enabled
      ? {
          enabled: true,
          due: weatherDue,
          target: weatherTarget,
          sent: weatherSent,
          importantUpdate: {
            due: importantWeatherDue,
            sent: importantWeatherSent,
          },
        }
      : {
          enabled: false,
          due: weatherDue,
          target: weatherTarget,
          sent: false,
          importantUpdate: {
            due: importantWeatherDue,
            sent: false,
          },
          skipped: true,
          reason:
            "Daily weather report feature is disabled because required configuration is missing.",
          missing: weatherFeature.missing,
        },
    calendar: calendarFeature.enabled
      ? { enabled: true, due: calendarDue, sent: calendarSent }
      : {
          enabled: false,
          due: calendarDue,
          sent: false,
          skipped: true,
          reason:
            "Daily calendar report feature is disabled because required configuration is missing.",
          missing: calendarFeature.missing,
        },
  });
}
