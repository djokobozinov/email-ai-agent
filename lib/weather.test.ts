import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getVranskoWeatherReport,
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
});
