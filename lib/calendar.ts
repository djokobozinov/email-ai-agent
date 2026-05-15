import { google } from "googleapis";

const MAX_ACCOUNTS = 5;
const CALENDAR_TIMEZONE = "Europe/Ljubljana";
const REPORT_HOUR = 20;
const DEFAULT_HOLIDAY_CALENDAR_ID =
  "en.slovenian#holiday@group.v.calendar.google.com";
const DEFAULT_BIRTHDAY_CALENDAR_ID =
  "addressbook#contacts@group.v.calendar.google.com";

type CalendarEventDate = {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
};

type GoogleCalendarEvent = {
  id?: string | null;
  summary?: string | null;
  start?: CalendarEventDate | null;
  eventType?: string | null;
};

export interface CalendarAgendaItem {
  title: string;
  time: string | null;
  kind: "event" | "holiday" | "birthday";
}

function getRefreshTokenVar(accountId: number): string {
  return accountId === 1
    ? "GOOGLE_REFRESH_TOKEN"
    : `GOOGLE_REFRESH_TOKEN_${accountId}`;
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
  const appUrl = process.env.APP_URL?.trim();
  const redirectUri = appUrl
    ? `${appUrl.replace(/\/+$/, "")}/api/auth/gmail`
    : undefined;

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

function getConfiguredAccountIds(): number[] {
  const ids: number[] = [];
  for (let i = 1; i <= MAX_ACCOUNTS; i++) {
    if (getRefreshToken(i)) ids.push(i);
  }
  return ids;
}

function getLocalDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getLocalTimeParts(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? -1);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? -1
  );

  return { hour, minute };
}

function getTomorrowDateKey(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return getLocalDateKey(tomorrow);
}

function getTargetDateKey(target: CalendarReportTarget, now: Date): string {
  if (target === "today") return getLocalDateKey(now);
  return getTomorrowDateKey(now);
}

function getEventLocalDateKey(event: GoogleCalendarEvent): string | null {
  if (event.start?.date) return event.start.date;
  if (event.start?.dateTime) return getLocalDateKey(new Date(event.start.dateTime));
  return null;
}

function formatEventTime(event: GoogleCalendarEvent): string | null {
  if (!event.start?.dateTime) return null;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CALENDAR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(event.start.dateTime));
}

function getCalendarIds(): { id: string; kind: CalendarAgendaItem["kind"] }[] {
  const configuredCalendarIds = (process.env.GOOGLE_CALENDAR_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({ id, kind: "event" as const }));
  const holidayCalendarId =
    process.env.GOOGLE_HOLIDAY_CALENDAR_ID?.trim() || DEFAULT_HOLIDAY_CALENDAR_ID;
  const birthdayCalendarId =
    process.env.GOOGLE_BIRTHDAY_CALENDAR_ID?.trim() ||
    DEFAULT_BIRTHDAY_CALENDAR_ID;

  return [
    { id: "primary", kind: "event" },
    ...configuredCalendarIds,
    { id: holidayCalendarId, kind: "holiday" },
    { id: birthdayCalendarId, kind: "birthday" },
  ];
}

function toAgendaItem(
  event: GoogleCalendarEvent,
  fallbackKind: CalendarAgendaItem["kind"]
): CalendarAgendaItem | null {
  const title = event.summary?.trim();
  if (!title) return null;

  return {
    title,
    time: formatEventTime(event),
    kind: event.eventType === "birthday" ? "birthday" : fallbackKind,
  };
}

function sortAgendaItems(a: CalendarAgendaItem, b: CalendarAgendaItem): number {
  const timeA = a.time ?? "99:99";
  const timeB = b.time ?? "99:99";
  return timeA.localeCompare(timeB) || a.title.localeCompare(b.title);
}

function dedupeAgendaItems(items: CalendarAgendaItem[]): CalendarAgendaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.time ?? ""}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatAgendaLine(item: CalendarAgendaItem): string {
  const prefix = item.time ? `${item.time} ` : "";
  return `- ${prefix}${item.title}`;
}

function formatAgendaSection(
  title: string,
  items: CalendarAgendaItem[]
): string | null {
  if (items.length === 0) return null;
  return `${title}\n${items.map(formatAgendaLine).join("\n")}`;
}

export function shouldSendDailyCalendarReport(now = new Date()): boolean {
  const { hour, minute } = getLocalTimeParts(now);
  return hour === REPORT_HOUR && minute === 0;
}

export function formatCalendarReport(
  date: string,
  items: CalendarAgendaItem[],
  label = "Tomorrow"
): string {
  const uniqueItems = dedupeAgendaItems(items);
  const events = uniqueItems
    .filter((item) => item.kind === "event")
    .sort(sortAgendaItems);
  const holidays = uniqueItems
    .filter((item) => item.kind === "holiday")
    .sort(sortAgendaItems);
  const birthdays = uniqueItems
    .filter((item) => item.kind === "birthday")
    .sort(sortAgendaItems);
  const sections = [
    formatAgendaSection("Events", events),
    formatAgendaSection("Holidays", holidays),
    formatAgendaSection("Birthdays", birthdays),
  ].filter(Boolean);

  if (sections.length === 0) {
    return `${label} (${date}): no calendar events, holidays, or birthdays found.`;
  }

  return [`${label} (${date})`, ...sections].join("\n\n");
}

export type CalendarReportTarget = "today" | "tomorrow";

export async function getCalendarReport(
  target: CalendarReportTarget,
  now = new Date()
): Promise<string | null> {
  const accountIds = getConfiguredAccountIds();
  if (accountIds.length === 0) return null;

  const targetKey = getTargetDateKey(target, now);
  const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const items: CalendarAgendaItem[] = [];

  for (const accountId of accountIds) {
    const auth = getOAuth2Client(accountId);
    if (!auth) continue;

    const calendar = google.calendar({ version: "v3", auth });

    for (const calendarConfig of getCalendarIds()) {
      try {
        const res = await calendar.events.list({
          calendarId: calendarConfig.id,
          singleEvents: true,
          orderBy: "startTime",
          timeMin,
          timeMax,
          timeZone: CALENDAR_TIMEZONE,
          maxResults: 20,
        });

        for (const event of (res.data.items ?? []) as GoogleCalendarEvent[]) {
          if (getEventLocalDateKey(event) !== targetKey) continue;
          const item = toAgendaItem(event, calendarConfig.kind);
          if (item) items.push(item);
        }
      } catch (err) {
        console.error(
          `Calendar list error (account ${accountId}, calendar ${calendarConfig.id}):`,
          err instanceof Error ? err.message : "Unknown"
        );
      }
    }
  }

  return formatCalendarReport(
    targetKey,
    items,
    target === "today" ? "Today" : "Tomorrow"
  );
}

export async function getTomorrowCalendarReport(
  now = new Date()
): Promise<string | null> {
  return getCalendarReport("tomorrow", now);
}
