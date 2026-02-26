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
    expect(extractTelegramNote("   * buy milk and eggs  ")).toEqual({
      text: "buy milk and eggs",
      subpageName: null,
    });
  });

  it("extractTelegramNote parses subpage syntax with a comma", () => {
    expect(extractTelegramNote("*todo, buy milk and eggs")).toEqual({
      text: "buy milk and eggs",
      subpageName: "todo",
    });
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
    expect(content).toContain("\n");
    expect(content).toContain("──────────");
    expect(content).toMatch(/^.+\nbuy milk\n──────────$/s);
  });

  it("appends note text to an existing Notion subpage", async () => {
    process.env.NOTION_API_KEY = "secret_test";
    process.env.NOTION_NOTES_PAGE_ID = "0123456789abcdef0123456789abcdef";
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: "fedcba9876543210fedcba9876543210",
                type: "child_page",
                child_page: { title: "todo" },
              },
            ],
            has_more: false,
            next_cursor: null,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await saveNoteToNotion("buy milk", { subpageName: "todo" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [lookupUrl, lookupInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(lookupUrl).toBe(
      "https://api.notion.com/v1/blocks/01234567-89ab-cdef-0123-456789abcdef/children?page_size=100"
    );
    expect(lookupInit.method).toBe("GET");

    const [appendUrl, appendInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(appendUrl).toBe(
      "https://api.notion.com/v1/blocks/fedcba98-7654-3210-fedc-ba9876543210/children"
    );
    expect(appendInit.method).toBe("PATCH");
  });

  it("creates a Notion subpage when missing and appends the note there", async () => {
    process.env.NOTION_API_KEY = "secret_test";
    process.env.NOTION_NOTES_PAGE_ID = "0123456789abcdef0123456789abcdef";
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [],
            has_more: false,
            next_cursor: null,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await saveNoteToNotion("buy milk", { subpageName: "todo" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [createUrl, createInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(createUrl).toBe("https://api.notion.com/v1/pages");
    expect(createInit.method).toBe("POST");

    const createBody = JSON.parse(String(createInit.body)) as {
      parent: { page_id: string };
      properties: {
        title: {
          title: Array<{
            type: string;
            text: { content: string };
          }>;
        };
      };
    };
    expect(createBody).toEqual({
      parent: { page_id: "01234567-89ab-cdef-0123-456789abcdef" },
      properties: {
        title: {
          title: [
            {
              type: "text",
              text: {
                content: "todo",
              },
            },
          ],
        },
      },
    });

    const [appendUrl] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(appendUrl).toBe(
      "https://api.notion.com/v1/blocks/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/children"
    );
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
