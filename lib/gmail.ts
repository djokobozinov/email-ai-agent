import { google } from "googleapis";
import { buildGmailQuery, MIN_BODY_LENGTH } from "./filters";

function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

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

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
}

export async function listUnreadMessageIds(): Promise<string[]> {
  const auth = getOAuth2Client();
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

export async function getMessage(id: string): Promise<EmailMessage | null> {
  const auth = getOAuth2Client();
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
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}
