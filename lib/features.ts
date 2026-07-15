import {
  DAILY_CALENDAR_REPORT_REQUIRED_VARS,
  DAILY_WEATHER_REPORT_REQUIRED_VARS,
  EMAIL_SUMMARY_REFRESH_TOKEN_HINT,
  EMAIL_SUMMARY_REQUIRED_VARS,
  GOOGLE_REFRESH_TOKEN_VARS,
  NOTION_NOTES_REQUIRED_VARS,
  RECEIPT_CAPTURE_REQUIRED_VARS,
  TELEGRAM_ASSISTANT_REQUIRED_VARS,
  TELEGRAM_TEST_REQUIRED_VARS,
  TELEGRAM_WEBHOOK_SETUP_REQUIRED_VARS,
  getConfiguredValue,
} from "./config";

function hasConfiguredValue(name: string): boolean {
  return !!getConfiguredValue(name);
}

function getMissingEnvVars(envVars: readonly string[]): string[] {
  return envVars.filter((name) => !hasConfiguredValue(name));
}

function hasAtLeastOneRefreshToken(): boolean {
  return GOOGLE_REFRESH_TOKEN_VARS.some((name) => hasConfiguredValue(name));
}

function getFeatureReadiness(
  envVars: readonly string[],
  extraMissing: string[] = []
): FeatureReadiness {
  const missing = [...getMissingEnvVars(envVars), ...extraMissing];
  return {
    enabled: missing.length === 0,
    missing,
  };
}

export interface FeatureReadiness {
  enabled: boolean;
  missing: string[];
}

export interface OptionalFeaturesStatus {
  emailSummaries: FeatureReadiness;
  telegramAssistant: FeatureReadiness;
  notionNotes: FeatureReadiness;
  receiptCapture: FeatureReadiness;
  telegramTest: FeatureReadiness;
  telegramWebhookSetup: FeatureReadiness;
  dailyWeatherReport: FeatureReadiness;
  dailyCalendarReport: FeatureReadiness;
}

export function getEmailSummaryFeatureReadiness(): FeatureReadiness {
  const extraMissing = hasAtLeastOneRefreshToken()
    ? []
    : [EMAIL_SUMMARY_REFRESH_TOKEN_HINT];

  return getFeatureReadiness(EMAIL_SUMMARY_REQUIRED_VARS, extraMissing);
}

export function getTelegramAssistantFeatureReadiness(): FeatureReadiness {
  return getFeatureReadiness(TELEGRAM_ASSISTANT_REQUIRED_VARS);
}

export function getNotionNotesFeatureReadiness(): FeatureReadiness {
  return getFeatureReadiness(NOTION_NOTES_REQUIRED_VARS);
}

export function getReceiptCaptureFeatureReadiness(): FeatureReadiness {
  const extraMissing = hasAtLeastOneRefreshToken()
    ? []
    : [EMAIL_SUMMARY_REFRESH_TOKEN_HINT];

  return getFeatureReadiness(RECEIPT_CAPTURE_REQUIRED_VARS, extraMissing);
}

export function getTelegramTestFeatureReadiness(): FeatureReadiness {
  return getFeatureReadiness(TELEGRAM_TEST_REQUIRED_VARS);
}

export function getTelegramWebhookSetupFeatureReadiness(): FeatureReadiness {
  return getFeatureReadiness(TELEGRAM_WEBHOOK_SETUP_REQUIRED_VARS);
}

export function getDailyWeatherReportFeatureReadiness(): FeatureReadiness {
  return getFeatureReadiness(DAILY_WEATHER_REPORT_REQUIRED_VARS);
}

export function getDailyCalendarReportFeatureReadiness(): FeatureReadiness {
  const extraMissing = hasAtLeastOneRefreshToken()
    ? []
    : [EMAIL_SUMMARY_REFRESH_TOKEN_HINT];

  return getFeatureReadiness(DAILY_CALENDAR_REPORT_REQUIRED_VARS, extraMissing);
}

export function getOptionalFeaturesStatus(): OptionalFeaturesStatus {
  return {
    emailSummaries: getEmailSummaryFeatureReadiness(),
    telegramAssistant: getTelegramAssistantFeatureReadiness(),
    notionNotes: getNotionNotesFeatureReadiness(),
    receiptCapture: getReceiptCaptureFeatureReadiness(),
    telegramTest: getTelegramTestFeatureReadiness(),
    telegramWebhookSetup: getTelegramWebhookSetupFeatureReadiness(),
    dailyWeatherReport: getDailyWeatherReportFeatureReadiness(),
    dailyCalendarReport: getDailyCalendarReportFeatureReadiness(),
  };
}

export function hasAnyEnabledFeature(status: OptionalFeaturesStatus): boolean {
  return Object.values(status).some((feature) => feature.enabled);
}
