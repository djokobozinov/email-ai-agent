import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { generateAssistantReply } from "./assistant";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => (model: string) => model,
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
});
