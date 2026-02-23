import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractTelegramNote,
  normalizeNotionPageId,
  saveNoteToNotion,
} from "./notion";

describe("notion helpers", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("extractTelegramNote returns null for normal messages", () => {
    expect(extractTelegramNote("hello")).toBeNull();
  });

  it("extractTelegramNote returns trimmed note text when prefixed with *", () => {
    expect(extractTelegramNote("   * buy milk and eggs  ")).toBe(
      "buy milk and eggs"
    );
  });

  it("normalizeNotionPageId accepts raw IDs and URLs", () => {
    expect(normalizeNotionPageId("0123456789abcdef0123456789abcdef")).toBe(
      "01234567-89ab-cdef-0123-456789abcdef"
    );
    expect(
      normalizeNotionPageId(
        "https://www.notion.so/My-Page-0123456789abcdef0123456789abcdef?pvs=4"
      )
    ).toBe("01234567-89ab-cdef-0123-456789abcdef");
  });

  it("returns an error when Notion env vars are missing", async () => {
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_NOTES_PAGE_ID;

    const result = await saveNoteToNotion("buy milk");

    expect(result).toEqual({
      ok: false,
      error: "NOTION_API_KEY and NOTION_NOTES_PAGE_ID are required.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("appends note text to Notion page when configured", async () => {
    process.env.NOTION_API_KEY = "secret_test";
    process.env.NOTION_NOTES_PAGE_ID = "0123456789abcdef0123456789abcdef";
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await saveNoteToNotion("buy milk");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.notion.com/v1/blocks/01234567-89ab-cdef-0123-456789abcdef/children"
    );
    expect(init.method).toBe("PATCH");

    const body = JSON.parse(String(init.body)) as {
      children: Array<{
        paragraph: {
          rich_text: Array<{
            text: {
              content: string;
            };
          }>;
        };
      }>;
    };

    const content = body.children[0].paragraph.rich_text[0].text.content;
    expect(content).toContain("buy milk");
    expect(content).toMatch(/^\[.+\] buy milk$/);
  });

  it("returns Notion API error message on failed response", async () => {
    process.env.NOTION_API_KEY = "secret_test";
    process.env.NOTION_NOTES_PAGE_ID = "0123456789abcdef0123456789abcdef";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), { status: 403 })
    );

    const result = await saveNoteToNotion("buy milk");

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });
});
