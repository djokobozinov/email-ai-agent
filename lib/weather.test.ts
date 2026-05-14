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
            time: ["2026-01-14T06:00", "2026-01-14T15:00"],
            temperature_2m: [7.2, 13.6],
            apparent_temperature: [5.1, 12.4],
            precipitation_probability: [20, 65],
            weather_code: [3, 61],
            wind_speed_10m: [8, 18],
          },
        }),
      })
    );

    const report = await getVranskoWeatherReport(
      new Date("2026-01-13T19:00:00.000Z")
    );

    expect(report).toContain("Vransko tomorrow: 7-14°C, rain");
    expect(report).toContain("waterproof jackets for the kids");
    expect(report?.split("\n")).toHaveLength(2);
  });

  it("checks important updates once per hour", () => {
    expect(
      shouldCheckHourlyWeatherUpdate(new Date("2026-01-13T10:00:00.000Z"))
    ).toBe(true);
    expect(
      shouldCheckHourlyWeatherUpdate(new Date("2026-01-13T10:30:00.000Z"))
    ).toBe(false);
  });

  it("formats important hourly weather updates", async () => {
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

    expect(update).toContain("Important Vransko weather update");
    expect(update).toContain("rain chance 85%");
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
