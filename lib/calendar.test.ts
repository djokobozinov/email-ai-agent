import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calendarListMock = vi.fn();
const calendarInsertMock = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function OAuth2Mock(this: { setCredentials: ReturnType<typeof vi.fn> }) {
        this.setCredentials = vi.fn();
      }),
    },
    calendar: vi.fn(() => ({
      events: {
        list: calendarListMock,
        insert: calendarInsertMock,
      },
    })),
  },
}));

import {
  createCalendarEvent,
  getCalendarReport,
  formatCalendarReport,
  getTomorrowCalendarReport,
  shouldSendDailyCalendarReport,
} from "./calendar";

describe("daily calendar report", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_REFRESH_TOKEN: "refresh-token",
      TELEGRAM_BOT_TOKEN: "telegram-bot-token",
      TELEGRAM_CHAT_ID: "12345",
    };
    delete process.env.GOOGLE_CALENDAR_IDS;
    delete process.env.GOOGLE_HOLIDAY_CALENDAR_ID;
    delete process.env.GOOGLE_BIRTHDAY_CALENDAR_ID;
    calendarListMock.mockReset();
    calendarInsertMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("is due at 20:00 Europe/Ljubljana", () => {
    expect(
      shouldSendDailyCalendarReport(new Date("2026-01-13T19:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldSendDailyCalendarReport(new Date("2026-07-13T18:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldSendDailyCalendarReport(new Date("2026-01-13T19:30:00.000Z"))
    ).toBe(false);
  });

  it("formats events, holidays, and birthdays into compact sections", () => {
    const report = formatCalendarReport("2026-05-14", [
      { title: "Standup", time: "09:00", kind: "event" },
      { title: "Statehood Day", time: null, kind: "holiday" },
      { title: "Ana's birthday", time: null, kind: "birthday" },
    ]);

    expect(report).toContain("📅 Tomorrow (2026-05-14)");
    expect(report).toContain("📅 Events\n- 📅 09:00 Standup");
    expect(report).toContain("🎉 Holidays\n- 🎉 Statehood Day");
    expect(report).toContain("🎂 Birthdays\n- 🎂 Ana's birthday");
  });

  it("reads tomorrow items from primary, holiday, and birthday calendars", async () => {
    calendarListMock
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              summary: "Standup",
              start: { dateTime: "2026-01-14T09:00:00+01:00" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              summary: "Statehood Day",
              start: { date: "2026-01-14" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              summary: "Ana's birthday",
              start: { date: "2026-01-14" },
              eventType: "birthday",
            },
          ],
        },
      });

    const report = await getTomorrowCalendarReport(
      new Date("2026-01-13T19:00:00.000Z")
    );

    expect(report).toContain("📅 Events\n- 📅 09:00 Standup");
    expect(report).toContain("🎉 Holidays\n- 🎉 Statehood Day");
    expect(report).toContain("🎂 Birthdays\n- 🎂 Ana's birthday");
  });

  it("reads today's full agenda for on-demand requests", async () => {
    calendarListMock
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              summary: "Morning planning",
              start: { dateTime: "2026-01-13T08:30:00+01:00" },
            },
            {
              summary: "Tomorrow item",
              start: { dateTime: "2026-01-14T09:00:00+01:00" },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [] } });

    const report = await getCalendarReport(
      "today",
      new Date("2026-01-13T19:00:00.000Z")
    );

    expect(report).toContain("📅 Today (2026-01-13)");
    expect(report).toContain("📅 Events\n- 📅 08:30 Morning planning");
    expect(report).not.toContain("Tomorrow item");
  });

  it("creates calendar events on the primary calendar", async () => {
    calendarInsertMock.mockResolvedValue({
      data: {
        htmlLink: "https://calendar.google.com/event?eid=abc",
      },
    });

    const result = await createCalendarEvent({
      title: "Dentist",
      date: "2026-05-21",
      time: "14:30",
    });

    expect(result).toEqual({
      ok: true,
      message: 'Added "Dentist" to your calendar on 2026-05-21 at 14:30.',
      htmlLink: "https://calendar.google.com/event?eid=abc",
    });
    expect(calendarInsertMock).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: {
        summary: "Dentist",
        start: {
          dateTime: "2026-05-21T14:30:00",
          timeZone: "Europe/Ljubljana",
        },
        end: {
          dateTime: "2026-05-21T15:30:00",
          timeZone: "Europe/Ljubljana",
        },
      },
    });
  });
});
