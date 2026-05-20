import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const getMock = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function OAuth2Mock(this: { setCredentials: ReturnType<typeof vi.fn> }) {
        this.setCredentials = vi.fn();
      }),
    },
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: listMock,
          get: getMock,
        },
      },
    })),
  },
}));

import { getMessage } from "./gmail";

describe("getMessage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_REFRESH_TOKEN: "refresh-token",
    };

    getMock.mockReset();
    listMock.mockReset();
    delete process.env.EMAIL_SUMMARY_ALLOWED_SENDERS;
    delete process.env.EMAIL_SUMMARY_IGNORED_SENDERS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("extracts text/plain body from nested multipart messages", async () => {
    const nestedBody = "Receipt attached: order #123";
    const nestedBodyBase64 = Buffer.from(nestedBody, "utf-8").toString("base64url");

    getMock.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "billing@example.com" },
            { name: "Subject", value: "Your receipt" },
          ],
          mimeType: "multipart/mixed",
          parts: [
            {
              mimeType: "application/pdf",
              filename: "receipt.pdf",
            },
            {
              mimeType: "multipart/alternative",
              parts: [
                {
                  mimeType: "text/plain",
                  body: { data: nestedBodyBase64 },
                },
              ],
            },
          ],
        },
        labelIds: ["UNREAD"],
      },
    });

    const message = await getMessage("msg-1", 1);

    expect(message).toEqual({
      id: "msg-1",
      from: "billing@example.com",
      subject: "Your receipt",
      body: nestedBody,
      labelIds: ["UNREAD"],
    });
  });

  it("ignores text/plain attachment content and uses the email message body", async () => {
    const emailBody = "Thanks for your order. It will ship tomorrow.";
    const attachmentText = "This is a .txt attachment and should be ignored.";

    getMock.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "store@example.com" },
            { name: "Subject", value: "Order confirmation" },
          ],
          mimeType: "multipart/mixed",
          parts: [
            {
              mimeType: "multipart/alternative",
              parts: [
                {
                  mimeType: "text/plain",
                  body: { data: Buffer.from(emailBody, "utf-8").toString("base64url") },
                },
              ],
            },
            {
              mimeType: "text/plain",
              filename: "notes.txt",
              body: { data: Buffer.from(attachmentText, "utf-8").toString("base64url") },
            },
          ],
        },
        labelIds: ["UNREAD"],
      },
    });

    const message = await getMessage("msg-2", 1);

    expect(message?.body).toBe(emailBody);
    expect(message?.body).not.toContain("should be ignored");
  });

  it("skips senders outside the configured email summary allow-list", async () => {
    process.env.EMAIL_SUMMARY_ALLOWED_SENDERS = "boss@example.com";
    getMock.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "Newsletter <news@example.com>" },
            { name: "Subject", value: "Weekly update" },
          ],
          body: {
            data: Buffer.from("Long enough body", "utf-8").toString("base64url"),
          },
        },
        labelIds: ["UNREAD"],
      },
    });

    await expect(getMessage("msg-3", 1)).resolves.toBeNull();
  });

  it("allows senders configured for email summaries", async () => {
    process.env.EMAIL_SUMMARY_ALLOWED_SENDERS = "boss@example.com";
    const body = "Please review this today.";
    getMock.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "Boss <boss@example.com>" },
            { name: "Subject", value: "Review" },
          ],
          body: {
            data: Buffer.from(body, "utf-8").toString("base64url"),
          },
        },
        labelIds: ["UNREAD"],
      },
    });

    const message = await getMessage("msg-4", 1);

    expect(message?.from).toBe("Boss <boss@example.com>");
    expect(message?.body).toBe(body);
  });

  it("skips ignored senders even when they are also allowed", async () => {
    process.env.EMAIL_SUMMARY_ALLOWED_SENDERS = "boss@example.com";
    process.env.EMAIL_SUMMARY_IGNORED_SENDERS = "boss@example.com";
    getMock.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "Boss <boss@example.com>" },
            { name: "Subject", value: "Ignore this" },
          ],
          body: {
            data: Buffer.from("Long enough body", "utf-8").toString("base64url"),
          },
        },
        labelIds: ["UNREAD"],
      },
    });

    await expect(getMessage("msg-5", 1)).resolves.toBeNull();
  });
});
