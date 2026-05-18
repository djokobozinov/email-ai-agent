import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { getCalendarReport } from "./calendar";
import { getVranskoWeatherReport } from "./weather";
import { generateAssistantReply } from "./assistant";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => (model: string) => model,
}));

vi.mock("./calendar", () => ({
  getCalendarReport: vi.fn(),
}));

vi.mock("./weather", () => ({
  getVranskoWeatherReport: vi.fn(),
}));

describe("generateAssistantReply", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateAssistantReply("hello");

    expect(result).toBeNull();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns trimmed text response", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockResolvedValue({
      text: "  hello from bot  ",
    } as never);

    const result = await generateAssistantReply("hello");

    expect(result).toBe("hello from bot");
  });

  it("uses gpt-5-nano by default", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    delete process.env.OPENAI_MODEL;
    vi.mocked(generateText).mockResolvedValue({
      text: "ok",
    } as never);

    await generateAssistantReply("hello");

    const callArg = vi.mocked(generateText).mock.calls[0][0];
    expect(callArg.model).toBe("gpt-5-nano");
  });

  it("uses OPENAI_MODEL when set", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    vi.mocked(generateText).mockResolvedValue({
      text: "ok",
    } as never);

    await generateAssistantReply("hello");

    const callArg = vi.mocked(generateText).mock.calls[0][0];
    expect(callArg.model).toBe("gpt-5-mini");
  });

  it("returns null when generateText throws", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockRejectedValue(new Error("failure"));

    const result = await generateAssistantReply("hello");

    expect(result).toBeNull();
  });

  it("returns a clear billing message when OpenAI quota is exhausted", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const err = new Error("insufficient_quota: exceeded current quota");
    vi.mocked(generateText).mockRejectedValue(err);

    const result = await generateAssistantReply("hello");

    expect(result).toContain("OpenAI credits or quota appear to be exhausted");
  });

  it("returns today's calendar report without calling OpenAI", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.mocked(getCalendarReport).mockResolvedValue("📅 Today (2026-05-15)\n\n📅 Events");

    const result = await generateAssistantReply("what events do I have today?");

    expect(result).toBe("📅 Today (2026-05-15)\n\n📅 Events");
    expect(getCalendarReport).toHaveBeenCalledWith("today");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("recognizes a misspelled tomorrow calendar request", async () => {
    vi.mocked(getCalendarReport).mockResolvedValue("Tomorrow (2026-05-16)");

    const result = await generateAssistantReply("show my tomorow events");

    expect(result).toBe("Tomorrow (2026-05-16)");
    expect(getCalendarReport).toHaveBeenCalledWith("tomorrow");
  });

  it("returns setup guidance when calendar access is unavailable", async () => {
    vi.mocked(getCalendarReport).mockResolvedValue(null);

    const result = await generateAssistantReply("today calendar");

    expect(result).toContain("Calendar access is not configured yet.");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns today's weather report without calling OpenAI", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.mocked(getVranskoWeatherReport).mockResolvedValue(
      "🌧️ Vransko today: 7-14°C"
    );

    const result = await generateAssistantReply("how will be the weather today?");

    expect(result).toBe("🌧️ Vransko today: 7-14°C");
    expect(getVranskoWeatherReport).toHaveBeenCalledWith(
      expect.any(Date),
      "today"
    );
    expect(generateText).not.toHaveBeenCalled();
  });

  it("recognizes a misspelled tomorrow weather request", async () => {
    vi.mocked(getVranskoWeatherReport).mockResolvedValue(
      "🌧️ Vransko tomorrow: 7-14°C"
    );

    const result = await generateAssistantReply("how will be the weather tomorow?");

    expect(result).toBe("🌧️ Vransko tomorrow: 7-14°C");
    expect(getVranskoWeatherReport).toHaveBeenCalledWith(
      expect.any(Date),
      "tomorrow"
    );
  });

  it("returns weather guidance when the forecast is unavailable", async () => {
    vi.mocked(getVranskoWeatherReport).mockResolvedValue(null);

    const result = await generateAssistantReply("weather today");

    expect(result).toContain("Weather access is not available right now.");
    expect(generateText).not.toHaveBeenCalled();
  });
});
