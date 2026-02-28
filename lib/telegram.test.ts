import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailMessage } from "./gmail";
import { sendToTelegram } from "./telegram";

const sampleEmail: EmailMessage = {
  id: "msg-1",
  from: "sender@example.com",
  subject: "Weekly update",
  body: "Body",
};

describe("sendToTelegram", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_CHAT_ID: "12345",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends summary title when non-receipt summary has no bullets", async () => {
    const sent = await sendToTelegram(sampleEmail, {
      title: "Action needed by Friday",
      bullets: [],
      isReceipt: false,
      isImportant: true,
    });

    expect(sent).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(options?.body));

    expect(body.text).toContain("Action needed by Friday");
    expect(body.text).toContain("⚡");
  });
});
