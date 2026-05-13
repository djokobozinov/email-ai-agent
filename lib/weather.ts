const VRANSKO_LATITUDE = 46.2441;
const VRANSKO_LONGITUDE = 14.9514;
const WEATHER_TIMEZONE = "Europe/Ljubljana";
const REPORT_HOUR = 20;

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
  date: string;
  minTemperature: number;
  maxTemperature: number;
  minFeelsLike: number;
  maxFeelsLike: number;
  maxPrecipitationProbability: number;
  maxWindSpeed: number;
  weatherCode: number;
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

function getTomorrowDateKey(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return getLocalDateKey(tomorrow);
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

function getMostImportantWeatherCode(codes: number[]): number {
  const priority = [
    99, 96, 95, 86, 85, 82, 81, 80, 77, 75, 73, 71, 67, 66, 65, 63, 61, 57,
    56, 55, 53, 51, 48, 45, 3, 2, 1, 0,
  ];

  return priority.find((code) => codes.includes(code)) ?? codes[0] ?? 0;
}

function summarizeTomorrowWeather(
  forecast: OpenMeteoForecastResponse,
  now: Date
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

  const tomorrowKey = getTomorrowDateKey(now);
  const indexes = hourly.time
    .map((time, index) => (time.startsWith(tomorrowKey) ? index : -1))
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
    date: tomorrowKey,
    minTemperature: Math.round(Math.min(...temperatures)),
    maxTemperature: Math.round(Math.max(...temperatures)),
    minFeelsLike: Math.round(Math.min(...feelsLike)),
    maxFeelsLike: Math.round(Math.max(...feelsLike)),
    maxPrecipitationProbability: Math.round(Math.max(...precipitation)),
    maxWindSpeed: Math.round(Math.max(...wind)),
    weatherCode: getMostImportantWeatherCode(codes),
  };
}

function buildDressAdvice(summary: DailyWeatherSummary): string {
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
    advice.push("waterproof jackets for the kids");
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

export function shouldSendDailyWeatherReport(now = new Date()): boolean {
  const { hour, minute } = getLocalTimeParts(now);
  return hour === REPORT_HOUR && minute === 0;
}

export function formatWeatherReport(summary: DailyWeatherSummary): string {
  const label = getWeatherLabel(summary.weatherCode);
  const advice = buildDressAdvice(summary);

  return [
    `Vransko tomorrow: ${summary.minTemperature}-${summary.maxTemperature}°C, ${label}, rain ${summary.maxPrecipitationProbability}%, wind ${summary.maxWindSpeed} km/h.`,
    `Dress: ${advice}.`,
  ].join("\n");
}

export async function getVranskoWeatherReport(now = new Date()): Promise<
  string | null
> {
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
    const summary = summarizeTomorrowWeather(forecast, now);
    return summary ? formatWeatherReport(summary) : null;
  } catch (err) {
    console.error(
      "Weather report error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
