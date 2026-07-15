import { google } from "googleapis";
import {
  DEFAULT_MAX_EMAILS_PER_RUN,
  MAX_EMAILS_PER_RUN_LIMIT,
  getConfiguredValue,
  getEmailSummaryAllowedSenders,
  getEmailSummaryIgnoredSenders,
  getGoogleConfiguredAccountIds,
  getGoogleRedirectUri,
  getGoogleRefreshToken,
} from "./config";
import { buildGmailQuery, MIN_BODY_LENGTH } from "./filters";

type GmailMessagePart = {
  mimeType?: string | null;
  filename?: string | null;
  headers?: { name?: string | null; value?: string | null }[] | null;
  body?: { data?: string | null } | null;
  parts?: GmailMessagePart[] | null;
};

function decodeBodyData(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function isAttachmentPart(part: GmailMessagePart): boolean {
  if (part.filename?.trim()) return true;

  const contentDisposition =
    part.headers
      ?.find((header) => header.name?.toLowerCase() === "content-disposition")
      ?.value?.toLowerCase() ?? "";

  return contentDisposition.includes("attachment");
}

function findTextPlainBody(part: GmailMessagePart): string {
  if (isAttachmentPart(part)) {
    return "";
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBodyData(part.body.data);
  }

  for (const childPart of part.parts ?? []) {
    const body = findTextPlainBody(childPart);
    if (body) return body;
  }

  return "";
}

function getOAuth2Client(
  accountId: number
): InstanceType<typeof google.auth.OAuth2> | null {
  const clientId = getConfiguredValue("GOOGLE_CLIENT_ID");
  const clientSecret = getConfiguredValue("GOOGLE_CLIENT_SECRET");
  const refreshToken = getGoogleRefreshToken(accountId);
  const redirectUri = getGoogleRedirectUri();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function getConfiguredAccountIds(): number[] {
  return getGoogleConfiguredAccountIds();
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  labelIds?: string[];
}

export function getGmailMessageUrl(id: string, accountId: number): string {
  const accountIndex = Math.max(0, accountId - 1);
  return `https://mail.google.com/mail/u/${accountIndex}/#all/${encodeURIComponent(id)}`;
}

function getEmailAddress(value: string): string {
  const angleMatch = value.match(/<([^>]+)>/);
  return (angleMatch?.[1] ?? value).trim().toLowerCase();
}

function shouldSummarizeSender(from: string): boolean {
  const sender = getEmailAddress(from);
  const ignoredSenders = getEmailSummaryIgnoredSenders();
  if (ignoredSenders.some((ignored) => sender === ignored)) return false;

  const allowedSenders = getEmailSummaryAllowedSenders();
  if (allowedSenders.length === 0) return true;

  return allowedSenders.some((allowed) => sender === allowed);
}

export async function listMessageIds(
  accountId: number,
  options: { includeRead?: boolean } = {}
): Promise<string[]> {
  const auth = getOAuth2Client(accountId);
  if (!auth) return [];

  const gmail = google.gmail({ version: "v1", auth });
  const maxResults =
    parseInt(
      getConfiguredValue("MAX_EMAILS_PER_RUN") ?? String(DEFAULT_MAX_EMAILS_PER_RUN),
      10
    ) || DEFAULT_MAX_EMAILS_PER_RUN;

  const res = await gmail.users.messages.list({
    userId: "me",
    q: buildGmailQuery(options),
    maxResults: Math.min(maxResults, MAX_EMAILS_PER_RUN_LIMIT),
  });

  const ids = (res.data.messages ?? []).map((m) => m.id!);
  return ids.filter(Boolean);
}

export async function listUnreadMessageIds(accountId: number): Promise<string[]> {
  return listMessageIds(accountId);
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

  if (!shouldSummarizeSender(from)) {
    return null;
  }

  const body = payload.body?.data
    ? decodeBodyData(payload.body.data)
    : findTextPlainBody(payload as GmailMessagePart);

  if (body.length < MIN_BODY_LENGTH) {
    return null;
  }

  const labelIds = res.data.labelIds ?? [];

  return { id, from, subject, body, labelIds };
}

export function isGmailConfigured(): boolean {
  return (
    !!getConfiguredValue("GOOGLE_CLIENT_ID") &&
    !!getConfiguredValue("GOOGLE_CLIENT_SECRET") &&
    getConfiguredAccountIds().length > 0
  );
}
