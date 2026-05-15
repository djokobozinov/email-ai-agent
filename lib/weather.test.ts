import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getVranskoImportantWeatherUpdate,
  getVranskoWeatherReport,
  shouldCheckHourlyWeatherUpdate,
  shouldSendDailyWeatherReport,
} from "./weather";

describe("daily weather report", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is due at 20:00 Europe/Ljubljana", () => {
    expect(
      shouldSendDailyWeatherReport(new Date("2026-01-13T19:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldSendDailyWeatherReport(new Date("2026-07-13T18:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldSendDailyWeatherReport(new Date("2026-01-13T19:30:00.000Z"))
    ).toBe(false);
  });

  it("formats a very short clothing report for tomorrow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: [
              "2026-01-14T06:00",
              "2026-01-14T15:00",
              "2026-01-14T19:00",
            ],
            temperature_2m: [7.2, 13.6, 10.1],
            apparent_temperature: [5.1, 12.4, 8.2],
            precipitation_probability: [20, 65, 35],
            weather_code: [3, 61, 3],
            wind_speed_10m: [8, 18, 12],
          },
        }),
      })
    );

    const report = await getVranskoWeatherReport(
      new Date("2026-01-13T19:00:00.000Z")
    );

    expect(report).toContain("🌧️ Vransko tomorrow");
    expect(report).toContain("morning 7°C, ⛅ partly cloudy");
    expect(report).toContain("afternoon 14°C, 🌧️ rain");
    expect(report).toContain("evening 10°C, ⛅ partly cloudy");
    expect(report).toContain("🧥 Wear: warm jackets and layers");
    expect(report).toContain("🧒 Kids: warm jackets");
    expect(report).toContain("waterproof jackets or rain suits");
    expect(report).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(report).not.toMatch(/\d{2}:\d{2}/);
    expect(report?.split("\n")).toHaveLength(3);
  });

  it("checks important updates once per hour", () => {
    expect(
      shouldCheckHourlyWeatherUpdate(new Date("2026-01-13T10:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldCheckHourlyWeatherUpdate(new Date("2026-01-13T10:30:00.000Z"))
    ).toBe(false);
  });

  it("formats important hourly weather updates with relative time only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: [
              "2026-01-13T11:00",
              "2026-01-13T12:00",
              "2026-01-13T13:00",
            ],
            temperature_2m: [7.2, 8.1, 8.4],
            apparent_temperature: [4.5, 5.6, 6.1],
            precipitation_probability: [20, 85, 30],
            weather_code: [3, 61, 3],
            wind_speed_10m: [12, 18, 16],
          },
        }),
      })
    );

    const update = await getVranskoImportantWeatherUpdate(
      new Date("2026-01-13T10:00:00.000Z")
    );

    expect(update).toContain("🌧️ Heavy rain chance is coming in 1 hour.");
    expect(update).toContain("rain chance 85%");
    expect(update).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(update).not.toMatch(/\d{2}:\d{2}/);
  });

  it("formats storm alerts as coming soon without dates or clock times", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: ["2026-01-13T11:00", "2026-01-13T12:00"],
            temperature_2m: [19.2, 18.1],
            apparent_temperature: [19.5, 18.6],
            precipitation_probability: [45, 80],
            weather_code: [95, 61],
            wind_speed_10m: [30, 18],
          },
        }),
      })
    );

    const update = await getVranskoImportantWeatherUpdate(
      new Date("2026-01-13T09:00:00.000Z")
    );

    expect(update).toContain("⛈️ Storm is coming in 1 hour.");
    expect(update).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(update).not.toMatch(/\d{2}:\d{2}/);
  });

  it("skips hourly weather updates when nothing important is forecast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: ["2026-01-13T11:00", "2026-01-13T12:00"],
            temperature_2m: [7.2, 8.1],
            apparent_temperature: [4.5, 5.6],
            precipitation_probability: [20, 35],
            weather_code: [3, 3],
            wind_speed_10m: [12, 18],
          },
        }),
      })
    );

    await expect(
      getVranskoImportantWeatherUpdate(new Date("2026-01-13T10:00:00.000Z"))
    ).resolves.toBeNull();
  });
});
