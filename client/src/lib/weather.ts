import { Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog, CloudSun, type LucideIcon } from "lucide-react";

export function getWeatherSpritePos(code: number): [number, number] {
  if (code === 0 || code === 1) return [0, 0];
  if (code === 2) return [0, 3];
  if (code === 3) return [0, 2];
  if (code >= 45 && code <= 48) return [0, 7];
  if (code >= 51 && code <= 55) return [1, 7];
  if (code === 56 || code === 57) return [2, 8];
  if (code === 61 || code === 63) return [1, 3];
  if (code === 65) return [2, 4];
  if (code === 66 || code === 67) return [2, 4];
  if (code === 71 || code === 73) return [1, 8];
  if (code === 75 || code === 77) return [2, 3];
  if (code >= 80 && code <= 82) return [1, 1];
  if (code >= 85 && code <= 86) return [2, 7];
  if (code === 95) return [2, 0];
  if (code >= 96 && code <= 99) return [2, 2];
  return [0, 2];
}

export const HUMIDITY_SPRITE: [number, number] = [0, 8];

export interface DailyWeather {
  high: number;
  low: number;
  code: number;
  precipChance: number;
  windSpeed: number;
  windDir: number;
}

export interface HourlyWeather {
  temp: number;
  code: number;
  precipChance: number;
  windSpeed: number;
  windDir: number;
  humidity?: number;
}

export interface WeatherData {
  daily: Record<string, DailyWeather>;
  hourly: Record<string, HourlyWeather>;
}

export function getWeatherForDate(weather: WeatherData | undefined, date: string): DailyWeather | undefined {
  return weather?.daily?.[date];
}

export function getWeatherForHour(weather: WeatherData | undefined, date: string, time: string | undefined): HourlyWeather | undefined {
  if (!weather?.hourly || !time) return undefined;
  const hour = time.split(":")[0].padStart(2, "0");
  const key = `${date}T${hour}:00`;
  return weather.hourly[key];
}

export function getWeatherIcon(code: number): LucideIcon {
  if (code === 0 || code === 1) return Sun;
  if (code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95 && code <= 99) return CloudLightning;
  return Cloud;
}

export function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function windDirToCompass(degrees: number): string {
  const idx = Math.round(degrees / 45) % 8;
  return COMPASS[idx];
}
