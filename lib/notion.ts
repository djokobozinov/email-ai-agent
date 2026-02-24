const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";
const NOTION_TEXT_CHUNK_SIZE = 1900;
const NOTION_CHILDREN_PAGE_SIZE = 100;

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

interface NotionChildPageBlock {
  id?: string;
  type?: string;
  child_page?: {
    title?: string;
  };
}

interface NotionBlockChildrenResponse {
  results?: NotionChildPageBlock[];
  has_more?: boolean;
  next_cursor?: string | null;
}

interface NotionCreatePageResponse {
  id?: string;
}

interface NotionCreatePagePayload {
  parent: {
    page_id: string;
  };
  properties: {
    title: {
      title: Array<{
        type: "text";
        text: {
          content: string;
        };
      }>;
    };
  };
}

export interface ExtractedTelegramNote {
  text: string;
  subpageName: string | null;
}

export interface SaveNoteToNotionOptions {
  subpageName?: string | null;
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

function buildNotionHeaders(notionApiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${notionApiKey}`,
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
  };
}

function normalizeSubpageName(subpageName: string | null | undefined): string | null {
  const normalized = subpageName?.trim();
  return normalized || null;
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

async function findNotionChildPageIdByTitle(
  notionApiKey: string,
  parentPageId: string,
  subpageName: string
): Promise<{ ok: true; pageId: string | null } | SaveNoteToNotionResult> {
  const subpageTitle = subpageName.trim().toLocaleLowerCase();
  let nextCursor: string | null = null;

  while (true) {
    const url = new URL(
      `${NOTION_API_BASE_URL}/blocks/${parentPageId}/children`
    );
    url.searchParams.set("page_size", String(NOTION_CHILDREN_PAGE_SIZE));
    if (nextCursor) {
      url.searchParams.set("start_cursor", nextCursor);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: buildNotionHeaders(notionApiKey),
      });
    } catch {
      return { ok: false, error: "Failed to reach Notion API." };
    }

    if (!response.ok) {
      return { ok: false, error: await parseNotionError(response) };
    }

    const data = (await response
      .json()
      .catch(() => null)) as NotionBlockChildrenResponse | null;
    if (!data?.results) {
      return {
        ok: false,
        error: "Unexpected Notion API response while reading subpages.",
      };
    }

    for (const block of data.results) {
      if (block.type !== "child_page") continue;
      const title = block.child_page?.title?.trim().toLocaleLowerCase();
      if (!title || title !== subpageTitle) continue;

      const pageId = block.id ? normalizeNotionPageId(block.id) : null;
      if (pageId) {
        return { ok: true, pageId };
      }
    }

    if (!data.has_more) {
      return { ok: true, pageId: null };
    }

    nextCursor = data.next_cursor?.trim() || null;
    if (!nextCursor) {
      return { ok: true, pageId: null };
    }
  }
}

async function createNotionSubpage(
  notionApiKey: string,
  parentPageId: string,
  subpageName: string
): Promise<{ ok: true; pageId: string } | SaveNoteToNotionResult> {
  const payload: NotionCreatePagePayload = {
    parent: {
      page_id: parentPageId,
    },
    properties: {
      title: {
        title: [
          {
            type: "text",
            text: {
              content: subpageName,
            },
          },
        ],
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${NOTION_API_BASE_URL}/pages`, {
      method: "POST",
      headers: buildNotionHeaders(notionApiKey),
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "Failed to reach Notion API." };
  }

  if (!response.ok) {
    return { ok: false, error: await parseNotionError(response) };
  }

  const data = (await response
    .json()
    .catch(() => null)) as NotionCreatePageResponse | null;
  const pageId = data?.id ? normalizeNotionPageId(data.id) : null;
  if (!pageId) {
    return {
      ok: false,
      error: "Notion did not return a valid page ID for the subpage.",
    };
  }

  return { ok: true, pageId };
}

async function resolveNotionTargetPageId(
  notionApiKey: string,
  rootPageId: string,
  subpageName: string | null
): Promise<{ ok: true; pageId: string } | SaveNoteToNotionResult> {
  if (!subpageName) {
    return { ok: true, pageId: rootPageId };
  }

  const existingSubpage = await findNotionChildPageIdByTitle(
    notionApiKey,
    rootPageId,
    subpageName
  );
  if (!existingSubpage.ok) {
    return existingSubpage;
  }

  if (existingSubpage.pageId) {
    return { ok: true, pageId: existingSubpage.pageId };
  }

  return createNotionSubpage(notionApiKey, rootPageId, subpageName);
}

export function extractTelegramNote(input: string): ExtractedTelegramNote | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("*")) return null;

  const withoutPrefix = trimmed.slice(1).trim();
  const subpageMatch = withoutPrefix.match(/^([^,\n]+?)\s*,\s*([\s\S]*)$/);
  if (!subpageMatch) {
    return {
      text: withoutPrefix,
      subpageName: null,
    };
  }

  const rawSubpageName = subpageMatch[1]?.trim();
  const subpageName = rawSubpageName || null;
  const text = subpageMatch[2]?.trim() ?? "";
  if (!subpageName) {
    return {
      text: withoutPrefix,
      subpageName: null,
    };
  }

  return {
    text,
    subpageName,
  };
}

export async function saveNoteToNotion(
  note: string,
  options: SaveNoteToNotionOptions = {}
): Promise<SaveNoteToNotionResult> {
  const text = note.trim();
  if (!text) {
    return { ok: false, error: "Note is empty." };
  }

  const notionApiKey = getNotionApiKey();
  const notionNotesPageId = getNotionNotesPageId();
  if (!notionApiKey || !notionNotesPageId) {
    return {
      ok: false,
      error: "NOTION_API_KEY and NOTION_NOTES_PAGE_ID are required.",
    };
  }

  const subpageName = normalizeSubpageName(options.subpageName);
  const targetPage = await resolveNotionTargetPageId(
    notionApiKey,
    notionNotesPageId,
    subpageName
  );
  if (!targetPage.ok) {
    return targetPage;
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
      `${NOTION_API_BASE_URL}/blocks/${targetPage.pageId}/children`,
      {
        method: "PATCH",
        headers: buildNotionHeaders(notionApiKey),
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
