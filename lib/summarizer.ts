import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, zodSchema } from "ai";
import { z } from "zod";
import type { EmailMessage } from "./gmail";
import {
  EMAIL_SUMMARIZER_SYSTEM_PROMPT,
  getConfiguredValue,
} from "./config";
import { getOpenAIModel } from "./openai";

const summarySchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
  isReceipt: z.boolean(),
  isImportant: z.boolean(),
  receipt: z
    .object({
      vendor: z.string().nullable(),
      amount: z.number().nullable(),
      currency: z.string().nullable(),
      date: z.string().nullable(),
      dueDate: z.string().nullable(),
      reference: z.string().nullable(),
      description: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export type Summary = z.infer<typeof summarySchema>;
export type ReceiptDetails = NonNullable<Summary["receipt"]>;

export async function summarizeEmail(email: EmailMessage): Promise<Summary | null> {
  const apiKey = getConfiguredValue("OPENAI_API_KEY");
  if (!apiKey) return null;

  const openai = createOpenAI({ apiKey });
  const model = getOpenAIModel();

  const content = `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body.slice(0, 8000)}`;

  try {
    const result = await generateText({
      model: openai(model),
      system: EMAIL_SUMMARIZER_SYSTEM_PROMPT,
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

    const receipt = output.isReceipt === true ? output.receipt ?? undefined : undefined;
    return {
      title: output.title ?? "No title",
      bullets: Array.isArray(output.bullets) ? output.bullets : [],
      isReceipt: output.isReceipt === true,
      isImportant: output.isImportant === true,
      ...(receipt ? { receipt } : {}),
    };
  } catch (err) {
    console.error("Summarizer error:", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.cause) {
      console.error("Cause:", err.cause);
    }
    return null;
  }
}
