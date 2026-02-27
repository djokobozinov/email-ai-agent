import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, zodSchema } from "ai";
import { z } from "zod";
import type { EmailMessage } from "./gmail";
import { getOpenAIModel } from "./openai";

const SYSTEM_PROMPT = `You summarize emails factually and concisely. Output valid JSON only.

For REGULAR emails, use:
{"title": "Short title", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], "isReceipt": false, "isImportant": true/false}

For RECEIPTS or INVOICES (payment confirmation, purchase receipt, subscription bill, etc.), use:
{"title": "🧾 [Summary: vendor, amount, due date if any. Important – need to pay/action.]", "bullets": [], "isReceipt": true, "isImportant": true/false}

Rules:
- Regular: 1 title, 2-3 bullets maximum. Preserve key facts: who, what, when, numbers. No advice, opinions, or suggestions.
- Receipts/invoices: No bullets. Put a concise summary in title. Include 🧾 emoji. Add "Important – need to pay" (or similar) if action is needed. Preserve: vendor, amount, due date, reference numbers.
- isImportant: Set to true when the email likely needs the recipient's attention. Consider important: personal/work messages from known people, action required (reply, deadline, meeting), time-sensitive requests, financial/legal matters. Consider NOT important: newsletters, marketing, automated notifications, low-priority updates, spam.
- If email is empty, promotional, or has no meaningful content, return:
  {"title": "No meaningful content to summarize", "bullets": [], "isReceipt": false, "isImportant": false}`;

const summarySchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
  isReceipt: z.boolean(),
  isImportant: z.boolean().optional().default(false),
});

export type Summary = z.infer<typeof summarySchema>;

export async function summarizeEmail(email: EmailMessage): Promise<Summary | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = createOpenAI({ apiKey });
  const model = getOpenAIModel();

  const content = `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body.slice(0, 8000)}`;

  try {
    const result = await generateText({
      model: openai(model),
      system: SYSTEM_PROMPT,
      prompt: content,
      output: Output.object({
        schema: zodSchema(summarySchema),
      }),
    });

    const output = result.output;
    if (!output) {
      console.error("Summarizer: generateText returned no output");
      return null;
    }

    return {
      title: output.title ?? "No title",
      bullets: Array.isArray(output.bullets) ? output.bullets : [],
      isReceipt: output.isReceipt === true,
      isImportant: output.isImportant === true,
    };
  } catch (err) {
    console.error("Summarizer error:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.cause) {
      console.error("Cause:", err.cause);
    }
    return null;
  }
}
