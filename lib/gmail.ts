import { google } from "googleapis";
import { buildGmailQuery, MIN_BODY_LENGTH } from "./filters";

const MAX_ACCOUNTS = 5;

function getRefreshTokenVar(accountId: number): string {
  return accountId === 1 ? "GOOGLE_REFRESH_TOKEN" : `GOOGLE_REFRESH_TOKEN_${accountId}`;
}

function getRefreshToken(accountId: number): string | undefined {
  return process.env[getRefreshTokenVar(accountId)];
}

function getOAuth2Client(
  accountId: number
): InstanceType<typeof google.auth.OAuth2> | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = getRefreshToken(accountId);

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${process.env.APP_URL}/api/auth/gmail`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function getConfiguredAccountIds(): number[] {
  const ids: number[] = [];
  for (let i = 1; i <= MAX_ACCOUNTS; i++) {
    if (getRefreshToken(i)) ids.push(i);
  }
  return ids;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
}

export async function listUnreadMessageIds(
  accountId: number
): Promise<string[]> {
  const auth = getOAuth2Client(accountId);
  if (!auth) return [];

  const gmail = google.gmail({ version: "v1", auth });
  const maxResults =
    parseInt(process.env.MAX_EMAILS_PER_RUN ?? "5", 10) || 5;

  const res = await gmail.users.messages.list({
    userId: "me",
    q: buildGmailQuery(),
    maxResults: Math.min(maxResults, 10),
  });

  const ids = (res.data.messages ?? []).map((m) => m.id!);
  return ids.filter(Boolean);
}

export async function getMessage(
  id: string,
  accountId: number
): Promise<EmailMessage | null> {
  const auth = getOAuth2Client(accountId);
  if (!auth) return null;

  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });

  const payload = res.data.payload;
  if (!payload?.headers) return null;

  const getHeader = (name: string) =>
    payload!.headers!.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? "";

  const from = getHeader("From");
  const subject = getHeader("Subject");

  let body = "";
  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === "text/plain" && p.body?.data
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  if (body.length < MIN_BODY_LENGTH) {
    return null;
  }

  return { id, from, subject, body };
}

export function isGmailConfigured(): boolean {
  return (
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    getConfiguredAccountIds().length > 0
  );
}
