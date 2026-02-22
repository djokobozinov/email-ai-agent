import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getOpenAIModel } from "./openai";

const ASSISTANT_SYSTEM_PROMPT =
  "You are a helpful Telegram assistant. Give concise, accurate answers. Use plain text only.";

export async function generateAssistantReply(
  userMessage: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = createOpenAI({ apiKey });
  const model = getOpenAIModel();

  try {
    const result = await generateText({
      model: openai(model),
      system: ASSISTANT_SYSTEM_PROMPT,
      prompt: userMessage,
    });

    const text = result.text?.trim();
    return text || null;
  } catch (err) {
    console.error(
      "Assistant error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
