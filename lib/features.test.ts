import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getEmailSummaryFeatureReadiness,
  getOptionalFeaturesStatus,
  hasAnyEnabledFeature,
} from "./features";

describe("feature readiness", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.GOOGLE_REFRESH_TOKEN_2;
    delete process.env.GOOGLE_REFRESH_TOKEN_3;
    delete process.env.GOOGLE_REFRESH_TOKEN_4;
    delete process.env.GOOGLE_REFRESH_TOKEN_5;
    delete process.env.OPENAI_API_KEY;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_NOTES_PAGE_ID;
    delete process.env.TEST_PASSWORD;
    delete process.env.APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("marks email summaries as disabled when required env vars are missing", () => {
    const result = getEmailSummaryFeatureReadiness();

    expect(result.enabled).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "OPENAI_API_KEY",
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_CHAT_ID",
        "GOOGLE_REFRESH_TOKEN (or _2, _3, _4, _5)",
      ])
    );
  });

  it("marks email summaries as enabled when all required vars are configured", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REFRESH_TOKEN_3 = "refresh-token";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
    process.env.TELEGRAM_CHAT_ID = "12345";

    const result = getEmailSummaryFeatureReadiness();

    expect(result).toEqual({
      enabled: true,
      missing: [],
    });
  });

  it("reports no enabled features when nothing is configured", () => {
    const status = getOptionalFeaturesStatus();
    expect(hasAnyEnabledFeature(status)).toBe(false);
  });

  it("reports enabled features when telegram assistant env vars are configured", () => {
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";

    const status = getOptionalFeaturesStatus();

    expect(status.telegramAssistant.enabled).toBe(true);
    expect(hasAnyEnabledFeature(status)).toBe(true);
  });
});
