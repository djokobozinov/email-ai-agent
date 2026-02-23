const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";
const NOTION_TEXT_CHUNK_SIZE = 1900;

interface NotionApiErrorResponse {
  message?: string;
}

interface NotionAppendChildrenPayload {
  children: Array<{
    object: "block";
    type: "paragraph";
    paragraph: {
      rich_text: Array<{
        type: "text";
        text: {
          content: string;
        };
      }>;
    };
  }>;
}

export interface SaveNoteToNotionResult {
  ok: boolean;
  error?: string;
}

function getNotionApiKey(): string | null {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  return apiKey || null;
}

function formatNotionId(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(
    16,
    20
  )}-${id.slice(20)}`;
}

function getIdCandidates(input: string): string[] {
  const trimmed = input.trim();
  const candidates = [trimmed];

  try {
    const url = new URL(trimmed);
    const pathSegment = url.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);
    if (pathSegment) {
      candidates.unshift(pathSegment);
    }
  } catch {
    // Not a URL, keep raw input only.
  }

  return candidates;
}

export function normalizeNotionPageId(input: string): string | null {
  for (const candidate of getIdCandidates(input)) {
    const compact = candidate.replace(/[^0-9a-fA-F]/g, "");
    if (compact.length < 32) continue;

    const id = compact.slice(-32).toLowerCase();
    if (/^[0-9a-f]{32}$/.test(id)) {
      return formatNotionId(id);
    }
  }

  return null;
}

function getNotionNotesPageId(): string | null {
  const raw = process.env.NOTION_NOTES_PAGE_ID?.trim();
  if (!raw) return null;
  return normalizeNotionPageId(raw);
}

function chunkText(text: string, chunkSize = NOTION_TEXT_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += chunkSize) {
    chunks.push(text.slice(start, start + chunkSize));
  }
  return chunks.length > 0 ? chunks : [text];
}

function buildAppendPayload(text: string): NotionAppendChildrenPayload {
  return {
    children: chunkText(text).map((chunk) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: chunk,
            },
          },
        ],
      },
    })),
  };
}

async function parseNotionError(response: Response): Promise<string> {
  const fallback = `Notion API request failed with status ${response.status}.`;
  const data = (await response
    .json()
    .catch(() => null)) as NotionApiErrorResponse | null;
  return data?.message?.trim() || fallback;
}

export function extractTelegramNote(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("*")) return null;
  return trimmed.slice(1).trim();
}

export async function saveNoteToNotion(note: string): Promise<SaveNoteToNotionResult> {
  const text = note.trim();
  if (!text) {
    return { ok: false, error: "Note is empty." };
  }

  const notionApiKey = getNotionApiKey();
  const notionPageId = getNotionNotesPageId();
  if (!notionApiKey || !notionPageId) {
    return {
      ok: false,
      error: "NOTION_API_KEY and NOTION_NOTES_PAGE_ID are required.",
    };
  }

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  });
  const prefix = `[${timestamp}] `;
  const payload = buildAppendPayload(`${prefix}${text}`);

  try {
    const response = await fetch(
      `${NOTION_API_BASE_URL}/blocks/${notionPageId}/children`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        error: await parseNotionError(response),
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to reach Notion API.",
    };
  }
}
