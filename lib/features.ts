const REFRESH_TOKEN_VARS = [
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_REFRESH_TOKEN_2",
  "GOOGLE_REFRESH_TOKEN_3",
  "GOOGLE_REFRESH_TOKEN_4",
  "GOOGLE_REFRESH_TOKEN_5",
] as const;

const EMAIL_SUMMARY_REFRESH_TOKEN_HINT =
  "GOOGLE_REFRESH_TOKEN (or _2, _3, _4, _5)";

const EMAIL_SUMMARY_REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

const TELEGRAM_ASSISTANT_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "OPENAI_API_KEY",
] as const;

const NOTION_NOTES_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "NOTION_API_KEY",
  "NOTION_NOTES_PAGE_ID",
] as const;

const TELEGRAM_TEST_REQUIRED_VARS = [
  "TEST_PASSWORD",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

const TELEGRAM_WEBHOOK_SETUP_REQUIRED_VARS = [
  "TEST_PASSWORD",
  "APP_URL",
  "TELEGRAM_BOT_TOKEN",
] as const;

const DAILY_WEATHER_REPORT_REQUIRED_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

const DAILY_CALENDAR_REPORT_REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

function hasConfiguredValue(name: string): boolean {
  return !!process.env[name]?.trim();
}

function getMissingEnvVars(envVars: readonly string[]): string[] {
  return envVars.filter((name) => !hasConfiguredValue(name));
}

function hasAtLeastOneRefreshToken(): boolean {
  return REFRESH_TOKEN_VARS.some((name) => hasConfiguredValue(name));
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
    telegramTest: getTelegramTestFeatureReadiness(),
    telegramWebhookSetup: getTelegramWebhookSetupFeatureReadiness(),
    dailyWeatherReport: getDailyWeatherReportFeatureReadiness(),
    dailyCalendarReport: getDailyCalendarReportFeatureReadiness(),
  };
}

export function hasAnyEnabledFeature(status: OptionalFeaturesStatus): boolean {
  return Object.values(status).some((feature) => feature.enabled);
}
