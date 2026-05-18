const VRANSKO_LATITUDE = 46.2441;
const VRANSKO_LONGITUDE = 14.9514;
const WEATHER_TIMEZONE = "Europe/Ljubljana";
const MORNING_REPORT_HOUR = 7;
const EVENING_REPORT_HOUR = 20;
const REPORT_MINUTE = 30;
const IMPORTANT_LOOKAHEAD_HOURS = 6;

interface OpenMeteoHourlyForecast {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

interface OpenMeteoForecastResponse {
  hourly?: Partial<OpenMeteoHourlyForecast>;
}

interface DailyWeatherSummary {
  target: WeatherReportTarget;
  date: string;
  minTemperature: number;
  maxTemperature: number;
  minFeelsLike: number;
  maxFeelsLike: number;
  maxPrecipitationProbability: number;
  maxWindSpeed: number;
  weatherCode: number;
}

export type WeatherReportTarget = "today" | "tomorrow";

interface ImportantWeatherHour {
  time: string;
  temperature: number;
  feelsLike: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
  reasons: string[];
}

function getLocalDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WEATHER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getLocalTimeParts(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIMEZONE,
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

function getLocalHourKey(date: Date): string {
  const dateKey = getLocalDateKey(date);
  const { hour } = getLocalTimeParts(date);
  return `${dateKey}T${String(hour).padStart(2, "0")}:00`;
}

function getTomorrowDateKey(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return getLocalDateKey(tomorrow);
}

function getTargetDateKey(now: Date, target: WeatherReportTarget): string {
  return target === "today" ? getLocalDateKey(now) : getTomorrowDateKey(now);
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "partly cloudy";
  if ([45, 48].includes(code)) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "mixed weather";
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function formatWeatherLabel(code: number): string {
  return `${getWeatherEmoji(code)} ${getWeatherLabel(code)}`;
}

function getMostImportantWeatherCode(codes: number[]): number {
  const priority = [
    99, 96, 95, 86, 85, 82, 81, 80, 77, 75, 73, 71, 67, 66, 65, 63, 61, 57,
    56, 55, 53, 51, 48, 45, 3, 2, 1, 0,
  ];

  return priority.find((code) => codes.includes(code)) ?? codes[0] ?? 0;
}

function summarizeWeatherForTarget(
  forecast: OpenMeteoForecastResponse,
  now: Date,
  target: WeatherReportTarget
): DailyWeatherSummary | null {
  const hourly = forecast.hourly;
  if (
    !hourly?.time ||
    !hourly.temperature_2m ||
    !hourly.apparent_temperature ||
    !hourly.precipitation_probability ||
    !hourly.weather_code ||
    !hourly.wind_speed_10m
  ) {
    return null;
  }

  const targetDateKey = getTargetDateKey(now, target);
  const indexes = hourly.time
    .map((time, index) => (time.startsWith(targetDateKey) ? index : -1))
    .filter((index) => index >= 0);

  if (indexes.length === 0) return null;

  const temperatures = indexes.map((index) => hourly.temperature_2m![index]);
  const feelsLike = indexes.map((index) => hourly.apparent_temperature![index]);
  const precipitation = indexes.map(
    (index) => hourly.precipitation_probability![index]
  );
  const wind = indexes.map((index) => hourly.wind_speed_10m![index]);
  const codes = indexes.map((index) => hourly.weather_code![index]);

  return {
    target,
    date: targetDateKey,
    minTemperature: Math.round(Math.min(...temperatures)),
    maxTemperature: Math.round(Math.max(...temperatures)),
    minFeelsLike: Math.round(Math.min(...feelsLike)),
    maxFeelsLike: Math.round(Math.max(...feelsLike)),
    maxPrecipitationProbability: Math.round(Math.max(...precipitation)),
    maxWindSpeed: Math.round(Math.max(...wind)),
    weatherCode: getMostImportantWeatherCode(codes),
  };
}

function buildAdultDressAdvice(summary: DailyWeatherSummary): string {
  const effectiveMax = Math.min(summary.maxTemperature, summary.maxFeelsLike);
  const effectiveMin = Math.min(summary.minTemperature, summary.minFeelsLike);
  const advice: string[] = [];

  if (effectiveMax <= 5) {
    advice.push("winter coats, hats and gloves");
  } else if (effectiveMax <= 12) {
    advice.push("warm jackets and layers");
  } else if (effectiveMax <= 18) {
    advice.push("hoodies or light jackets");
  } else if (effectiveMin <= 12) {
    advice.push("t-shirts with a morning layer");
  } else {
    advice.push("light clothes");
  }

  if (summary.maxPrecipitationProbability >= 50) {
    advice.push("waterproof jacket or umbrella");
  } else if (summary.maxPrecipitationProbability >= 30) {
    advice.push("pack a rain jacket");
  }

  if (summary.maxWindSpeed >= 35) {
    advice.push("secure hoods and avoid loose scarves");
  }

  if ([71, 73, 75, 77, 85, 86].includes(summary.weatherCode)) {
    advice.push("boots if snow sticks");
  }

  return advice.join("; ");
}

function buildKidsDressAdvice(summary: DailyWeatherSummary): string {
  const effectiveMax = Math.min(summary.maxTemperature, summary.maxFeelsLike);
  const effectiveMin = Math.min(summary.minTemperature, summary.minFeelsLike);
  const advice: string[] = [];

  if (effectiveMax <= 5) {
    advice.push("warm winter coats, hats, gloves and sturdy shoes");
  } else if (effectiveMax <= 12) {
    advice.push("warm jackets, long sleeves and an extra layer");
  } else if (effectiveMax <= 18) {
    advice.push("hoodies or light jackets over comfortable clothes");
  } else if (effectiveMin <= 12) {
    advice.push("t-shirts with a hoodie or jacket for the morning");
  } else {
    advice.push("light clothes and comfortable shoes");
  }

  if (summary.maxPrecipitationProbability >= 50) {
    advice.push("waterproof jackets or rain suits");
  } else if (summary.maxPrecipitationProbability >= 30) {
    advice.push("pack a small rain jacket");
  }

  if (summary.maxWindSpeed >= 35) {
    advice.push("hoods that stay secure in wind");
  }

  if ([71, 73, 75, 77, 85, 86].includes(summary.weatherCode)) {
    advice.push("boots if snow sticks");
  }

  return advice.join("; ");
}

export function shouldSendDailyWeatherReport(now = new Date()): boolean {
  return getDailyWeatherReportTarget(now) !== null;
}

export function getDailyWeatherReportTarget(
  now = new Date()
): WeatherReportTarget | null {
  const { hour, minute } = getLocalTimeParts(now);
  if (minute < REPORT_MINUTE) return null;
  if (hour === MORNING_REPORT_HOUR) return "today";
  if (hour === EVENING_REPORT_HOUR) return "tomorrow";
  return null;
}

export function shouldCheckHourlyWeatherUpdate(now = new Date()): boolean {
  return getLocalTimeParts(now).minute === 0;
}

export function formatWeatherReport(summary: DailyWeatherSummary): string {
  const label = formatWeatherLabel(summary.weatherCode);
  const adultAdvice = buildAdultDressAdvice(summary);
  const kidsAdvice = buildKidsDressAdvice(summary);
  const dayLabel = summary.target === "today" ? "today" : "tomorrow";
  const temperature =
    summary.minTemperature === summary.maxTemperature
      ? `${summary.maxTemperature}°C`
      : `${summary.minTemperature}-${summary.maxTemperature}°C`;
  const feelsLike =
    summary.minFeelsLike === summary.maxFeelsLike
      ? `${summary.maxFeelsLike}°C`
      : `${summary.minFeelsLike}-${summary.maxFeelsLike}°C`;

  return [
    `${getWeatherEmoji(
      summary.weatherCode
    )} Vransko ${dayLabel}: ${temperature}, feels like ${feelsLike}, ${label}, rain up to ${
      summary.maxPrecipitationProbability
    }%, wind up to ${summary.maxWindSpeed} km/h.`,
    `🧥 Wear: ${adultAdvice}.`,
    `🧒 Kids: ${kidsAdvice}.`,
  ].join("\n");
}

export async function getVranskoWeatherReport(
  now = new Date(),
  target: WeatherReportTarget = "tomorrow"
): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: String(VRANSKO_LATITUDE),
    longitude: String(VRANSKO_LONGITUDE),
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    forecast_days: "2",
    timezone: WEATHER_TIMEZONE,
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;

    const forecast = (await res.json()) as OpenMeteoForecastResponse;
    const summary = summarizeWeatherForTarget(forecast, now, target);
    return summary ? formatWeatherReport(summary) : null;
  } catch (err) {
    console.error(
      "Weather report error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}

function getImportantWeatherReasons(hour: ImportantWeatherHour): string[] {
  const reasons: string[] = [];

  if ([95, 96, 99].includes(hour.weatherCode)) {
    reasons.push("thunderstorms");
  }

  if ([71, 73, 75, 77, 85, 86].includes(hour.weatherCode)) {
    reasons.push("snow");
  }

  if (hour.precipitationProbability >= 80) {
    reasons.push(`rain chance ${hour.precipitationProbability}%`);
  }

  if (hour.windSpeed >= 45) {
    reasons.push(`wind ${hour.windSpeed} km/h`);
  }

  if (hour.feelsLike <= 0) {
    reasons.push(`feels like ${hour.feelsLike}°C`);
  }

  return reasons;
}

function getForecastHourOffset(fromTime: string, toTime: string): number {
  const from = Date.UTC(
    Number(fromTime.slice(0, 4)),
    Number(fromTime.slice(5, 7)) - 1,
    Number(fromTime.slice(8, 10)),
    Number(fromTime.slice(11, 13))
  );
  const to = Date.UTC(
    Number(toTime.slice(0, 4)),
    Number(toTime.slice(5, 7)) - 1,
    Number(toTime.slice(8, 10)),
    Number(toTime.slice(11, 13))
  );

  return Math.max(0, Math.round((to - from) / 60 / 60 / 1000));
}

function findImportantWeatherHours(
  forecast: OpenMeteoForecastResponse,
  now: Date
): ImportantWeatherHour[] {
  const hourly = forecast.hourly;
  if (
    !hourly?.time ||
    !hourly.temperature_2m ||
    !hourly.apparent_temperature ||
    !hourly.precipitation_probability ||
    !hourly.weather_code ||
    !hourly.wind_speed_10m
  ) {
    return [];
  }

  const currentHourKey = getLocalHourKey(now);
  const upcomingIndexes = hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => time >= currentHourKey)
    .slice(0, IMPORTANT_LOOKAHEAD_HOURS);

  return upcomingIndexes
    .map(({ time, index }) => {
      const hour: ImportantWeatherHour = {
        time,
        temperature: Math.round(hourly.temperature_2m![index]),
        feelsLike: Math.round(hourly.apparent_temperature![index]),
        precipitationProbability: Math.round(
          hourly.precipitation_probability![index]
        ),
        weatherCode: hourly.weather_code![index],
        windSpeed: Math.round(hourly.wind_speed_10m![index]),
        reasons: [],
      };
      return { ...hour, reasons: getImportantWeatherReasons(hour) };
    })
    .filter((hour) => hour.reasons.length > 0);
}

function getRelativeForecastPhrase(hourOffset: number): string {
  if (hourOffset === 0) return "now";
  if (hourOffset === 1) return "in 1 hour";
  return `in ${hourOffset} hours`;
}

function formatImportantWeatherHeadline(
  hour: ImportantWeatherHour,
  hourOffset: number
): string {
  if ([95, 96, 99].includes(hour.weatherCode)) {
    return `⛈️ Storm is coming ${getRelativeForecastPhrase(hourOffset)}.`;
  }

  if (hour.windSpeed >= 45) {
    return `💨 Strong wind is coming ${getRelativeForecastPhrase(hourOffset)}.`;
  }

  if (hour.precipitationProbability >= 80) {
    return `🌧️ Heavy rain chance is coming ${getRelativeForecastPhrase(
      hourOffset
    )}.`;
  }

  if ([71, 73, 75, 77, 85, 86].includes(hour.weatherCode)) {
    return `❄️ Snow is coming ${getRelativeForecastPhrase(hourOffset)}.`;
  }

  if (hour.feelsLike <= 0) {
    return `🥶 Very cold weather is coming ${getRelativeForecastPhrase(
      hourOffset
    )}.`;
  }

  return `${getWeatherEmoji(hour.weatherCode)} Important weather is coming ${getRelativeForecastPhrase(hourOffset)}.`;
}

function formatImportantWeatherUpdate(
  hours: ImportantWeatherHour[],
  now: Date
): string {
  const mostUrgent = hours[0];
  const hourOffset = getForecastHourOffset(
    getLocalHourKey(now),
    mostUrgent.time
  );
  const reasons = mostUrgent.reasons.join(", ");

  return [
    formatImportantWeatherHeadline(mostUrgent, hourOffset),
    `${reasons}; ${mostUrgent.temperature}°C, feels like ${mostUrgent.feelsLike}°C.`,
  ].join("\n");
}

export async function getVranskoImportantWeatherUpdate(
  now = new Date()
): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: String(VRANSKO_LATITUDE),
    longitude: String(VRANSKO_LONGITUDE),
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    forecast_days: "2",
    timezone: WEATHER_TIMEZONE,
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;

    const forecast = (await res.json()) as OpenMeteoForecastResponse;
    const importantHours = findImportantWeatherHours(forecast, now);
    return importantHours.length > 0
      ? formatImportantWeatherUpdate(importantHours, now)
      : null;
  } catch (err) {
    console.error(
      "Important weather update error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
