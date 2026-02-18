import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateText } from "ai";
import { summarizeEmail } from "./summarizer";
import type { EmailMessage } from "./gmail";

// Mock the AI SDK generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: (opts: { schema: unknown }) => opts },
  zodSchema: (schema: unknown) => schema,
}));

// Mock createOpenAI - summarizer calls openai("gpt-4o-mini")
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => (model: string) => model,
}));

const sampleEmail: EmailMessage = {
  id: "msg-1",
  from: "sender@example.com",
  subject: "Test Subject",
  body: "Hello, this is a test email body with some content to summarize.",
};

describe("summarizeEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await summarizeEmail(sampleEmail);
    expect(result).toBeNull();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns summary when generateText succeeds", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockResolvedValue({
      output: {
        title: "Test Email Summary",
        bullets: ["Key point 1", "Key point 2"],
        isReceipt: false,
      },
    } as never);

    const result = await summarizeEmail(sampleEmail);

    expect(result).toEqual({
      title: "Test Email Summary",
      bullets: ["Key point 1", "Key point 2"],
      isReceipt: false,
    });
    expect(generateText).toHaveBeenCalledOnce();
  });

  it("returns receipt summary when isReceipt is true", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockResolvedValue({
      output: {
        title: "🧾 Netflix $15.99 - Due Jan 25",
        bullets: [],
        isReceipt: true,
      },
    } as never);

    const result = await summarizeEmail(sampleEmail);

    expect(result).toEqual({
      title: "🧾 Netflix $15.99 - Due Jan 25",
      bullets: [],
      isReceipt: true,
    });
  });

  it("handles empty output and falls back to defaults", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockResolvedValue({
      output: {
        title: undefined,
        bullets: "not-an-array",
        isReceipt: "true", // string "true" is not === true
      },
    } as never);

    const result = await summarizeEmail(sampleEmail);

    expect(result).toEqual({
      title: "No title",
      bullets: [],
      isReceipt: false, // only strict true becomes true
    });
  });

  it("returns null when generateText throws", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockRejectedValue(new Error("API error"));

    const result = await summarizeEmail(sampleEmail);

    expect(result).toBeNull();
  });

  it("truncates body to 8000 characters in prompt", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    vi.mocked(generateText).mockResolvedValue({
      output: {
        title: "Summary",
        bullets: [],
        isReceipt: false,
      },
    } as never);

    const longEmail: EmailMessage = {
      ...sampleEmail,
      body: "x".repeat(10000),
    };
    await summarizeEmail(longEmail);

    const callArg = vi.mocked(generateText).mock.calls[0][0];
    const promptContent = typeof callArg.prompt === "string" ? callArg.prompt : "";
    const bodyInPrompt = promptContent.split("\n\n")[1] ?? "";
    expect(bodyInPrompt.length).toBeLessThanOrEqual(8000);
  });
});
