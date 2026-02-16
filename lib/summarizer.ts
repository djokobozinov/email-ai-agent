import OpenAI from "openai";
import type { EmailMessage } from "./gmail";

const SYSTEM_PROMPT = `You summarize emails factually and concisely. Output valid JSON only.

For REGULAR emails, use:
{"title": "Short title", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], "isReceipt": false}

For RECEIPTS or INVOICES (payment confirmation, purchase receipt, subscription bill, etc.), use:
{"title": "🧾 [Summary: vendor, amount, due date if any. Important – need to pay/action.]", "bullets": [], "isReceipt": true}

Rules:
- Regular: 1 title, 2-3 bullets maximum. Preserve key facts: who, what, when, numbers. No advice, opinions, or suggestions.
- Receipts/invoices: No bullets. Put a concise summary in title. Include 🧾 emoji. Add "Important – need to pay" (or similar) if action is needed. Preserve: vendor, amount, due date, reference numbers.
- If email is empty, promotional, or has no meaningful content, return:
  {"title": "No meaningful content to summarize", "bullets": [], "isReceipt": false}`;

export interface Summary {
  title: string;
  bullets: string[];
  isReceipt?: boolean;
}

export async function summarizeEmail(email: EmailMessage): Promise<Summary | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  const content = `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body.slice(0, 8000)}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as {
      title?: string;
      bullets?: string[];
      isReceipt?: boolean;
    };
    return {
      title: parsed.title ?? "No title",
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      isReceipt: parsed.isReceipt === true,
    };
  } catch {
    return null;
  }
}
