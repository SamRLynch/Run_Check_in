import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSuggestionSchema } from "@shared/schema";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const CREATOR_PASSWORD = "daisy";
const ADMIN_PASSWORD = "harper";

const TIMEZONE = "America/New_York";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await storage.ensureWeekdayRuns(new Date(), 14, "05:30", "Short Sands Beach");
  await storage.clearSeedRunners();

  app.get("/api/runs", async (_req, res) => {
    try {
      const now = new Date();
      const zonedNow = toZonedTime(now, TIMEZONE);
      const today = format(zonedNow, "yyyy-MM-dd");
      const endDate = format(addDays(zonedNow, 14), "yyyy-MM-dd");
      const runs = await storage.getRunsByDateRange(today, endDate);

      const currentMinutes = zonedNow.getHours() * 60 + zonedNow.getMinutes();
      const filtered = runs.filter((run) => {
        if (run.date !== today) return true;
        const [h, m] = run.startTime.split(":").map(Number);
        const runMinutes = h * 60 + (m || 0);
        return currentMinutes < runMinutes + 60;
      });

      res.json(filtered);
    } catch (err) {
      console.error("Error fetching runs:", err);
      res.status(500).json({ message: "Failed to fetch runs" });
    }
  });

  app.post("/api/runs", async (req, res) => {
    try {
      const { name, date, startTime, location, createdBy, password, lat, lon } = req.body;
      if (!password || (password !== CREATOR_PASSWORD && password !== ADMIN_PASSWORD)) {
        return res.status(403).json({ message: "Invalid password" });
      }
      if (!date || !startTime || !location?.trim() || !createdBy?.trim()) {
        return res.status(400).json({ message: "date, startTime, location, and createdBy are required" });
      }
      const id = `custom-${Date.now()}`;
      const run = await storage.createCustomRun(id, {
        date,
        startTime,
        location: location.trim(),
        locationUrl: null,
        cancelled: false,
        name: name?.trim() || null,
        isCustom: true,
        createdBy: createdBy.trim(),
        lat: typeof lat === "number" ? lat : null,
        lon: typeof lon === "number" ? lon : null,
      });
      await storage.upsertCheckin(run.id, createdBy.trim(), "running");
      res.json(run);
    } catch (err) {
      console.error("Error creating custom run:", err);
      res.status(500).json({ message: "Failed to create run" });
    }
  });

  app.patch("/api/runs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, startTime, location, password, lat, lon } = req.body;
      if (!password || (password !== CREATOR_PASSWORD && password !== ADMIN_PASSWORD)) {
        return res.status(403).json({ message: "Invalid password" });
      }
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ message: "Run not found" });
      if (!run.isCustom) return res.status(400).json({ message: "Cannot edit auto-generated runs" });
      const updates: { name?: string | null; startTime?: string; location?: string; lat?: number | null; lon?: number | null } = {};
      if (name !== undefined) updates.name = name?.trim() || null;
      if (startTime !== undefined) updates.startTime = startTime;
      if (location !== undefined) updates.location = location?.trim() || run.location;
      if (lat !== undefined) updates.lat = typeof lat === "number" ? lat : null;
      if (lon !== undefined) updates.lon = typeof lon === "number" ? lon : null;
      const updated = await storage.updateRun(id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating run:", err);
      res.status(500).json({ message: "Failed to update run" });
    }
  });

  app.delete("/api/runs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || (password !== CREATOR_PASSWORD && password !== ADMIN_PASSWORD)) {
        return res.status(403).json({ message: "Invalid password" });
      }
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ message: "Run not found" });
      if (!run.isCustom) return res.status(400).json({ message: "Cannot delete auto-generated runs" });
      const isAdmin = password === ADMIN_PASSWORD;
      if (!isAdmin) {
        const checkins = await storage.getCheckinsByRun(id);
        const otherRunners = checkins.filter(c => c.status === "running" && c.runnerName.toLowerCase() !== (req.body.createdBy || "").toLowerCase());
        if (otherRunners.length > 0) {
          return res.status(409).json({ message: `Can't delete — ${otherRunners.length === 1 ? "someone else is" : `${otherRunners.length} others are`} already checked in.` });
        }
      }
      await storage.deleteRun(id);
      res.json({ ok: true });
    } catch (err) {
      console.error("Error deleting run:", err);
      res.status(500).json({ message: "Failed to delete run" });
    }
  });

  app.patch("/api/runs/:id/visibility", async (req, res) => {
    try {
      const { id } = req.params;
      const { hidden, password } = req.body;
      if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ message: "Admin password required" });
      }
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ message: "Run not found" });
      const updated = await storage.hideRun(id, !!hidden);
      res.json(updated);
    } catch (err) {
      console.error("Error updating visibility:", err);
      res.status(500).json({ message: "Failed to update visibility" });
    }
  });

  app.post("/api/runs/:id/checkin", async (req, res) => {
    try {
      const runId = req.params.id;
      const run = await storage.getRun(runId);
      if (!run) return res.status(404).json({ message: "Run not found" });
      if (run.cancelled) return res.status(400).json({ message: "Run is cancelled" });

      const { runnerName } = req.body;
      if (!runnerName?.trim()) return res.status(400).json({ message: "runnerName is required" });

      const checkin = await storage.upsertCheckin(runId, runnerName.trim(), "running");
      res.json(checkin);
    } catch (err) {
      console.error("Error creating checkin:", err);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  app.post("/api/runs/:id/skip", async (req, res) => {
    try {
      const runId = req.params.id;
      const run = await storage.getRun(runId);
      if (!run) return res.status(404).json({ message: "Run not found" });
      if (run.cancelled) return res.status(400).json({ message: "Run is cancelled" });

      const { runnerName } = req.body;
      if (!runnerName?.trim()) return res.status(400).json({ message: "runnerName is required" });

      const checkin = await storage.upsertCheckin(runId, runnerName.trim(), "skipping");
      res.json(checkin);
    } catch (err) {
      console.error("Error creating skip:", err);
      res.status(500).json({ message: "Failed to mark as skipping" });
    }
  });

  app.post("/api/runs/:id/cancel-checkin", async (req, res) => {
    try {
      const runId = req.params.id;
      const { runnerName } = req.body;
      if (!runnerName) return res.status(400).json({ message: "Runner name required" });
      await storage.deleteCheckin(runId, runnerName);
      res.json({ ok: true });
    } catch (err) {
      console.error("Error deleting checkin:", err);
      res.status(500).json({ message: "Failed to cancel check-in" });
    }
  });

  // Weather endpoint with server-side caching (per lat/lon)
  const weatherCacheMap = new Map<string, { data: any; fetchedAt: number }>();
  const WEATHER_CACHE_MS = 30 * 60 * 1000;
  const SHORT_SANDS_LAT = 43.1717;
  const SHORT_SANDS_LON = -70.6117;

  async function fetchWeather(lat: number, lon: number) {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = weatherCacheMap.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_MS) return cached.data;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m,relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=14`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);
    const raw = await response.json();

    const daily: Record<string, { high: number; low: number; code: number; precipChance: number; windSpeed: number; windDir: number }> = {};
    if (raw.daily) {
      for (let i = 0; i < raw.daily.time.length; i++) {
        daily[raw.daily.time[i]] = {
          high: Math.round(raw.daily.temperature_2m_max[i]),
          low: Math.round(raw.daily.temperature_2m_min[i]),
          code: raw.daily.weather_code[i],
          precipChance: raw.daily.precipitation_probability_max?.[i] ?? 0,
          windSpeed: Math.round(raw.daily.wind_speed_10m_max?.[i] ?? 0),
          windDir: Math.round(raw.daily.wind_direction_10m_dominant?.[i] ?? 0),
        };
      }
    }

    const hourly: Record<string, { temp: number; code: number; precipChance: number; windSpeed: number; windDir: number; humidity: number }> = {};
    if (raw.hourly) {
      for (let i = 0; i < raw.hourly.time.length; i++) {
        const hour = raw.hourly.time[i];
        hourly[hour] = {
          temp: Math.round(raw.hourly.temperature_2m[i]),
          code: raw.hourly.weather_code[i],
          precipChance: raw.hourly.precipitation_probability?.[i] ?? 0,
          windSpeed: Math.round(raw.hourly.wind_speed_10m?.[i] ?? 0),
          windDir: Math.round(raw.hourly.wind_direction_10m?.[i] ?? 0),
          humidity: Math.round(raw.hourly.relative_humidity_2m?.[i] ?? 0),
        };
      }
    }

    const result = { daily, hourly };
    weatherCacheMap.set(cacheKey, { data: result, fetchedAt: Date.now() });
    return result;
  }

  app.get("/api/weather", async (req, res) => {
    try {
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : SHORT_SANDS_LAT;
      const lon = req.query.lon ? parseFloat(req.query.lon as string) : SHORT_SANDS_LON;
      if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ message: "Invalid lat/lon" });
      const result = await fetchWeather(lat, lon);
      res.json(result);
    } catch (err) {
      console.error("Error fetching weather:", err);
      res.status(500).json({ message: "Failed to fetch weather" });
    }
  });

  let tideCache: Record<string, { data: any; fetchedAt: number }> = {};
  const TIDE_CACHE_MS = 60 * 60 * 1000;
  const NOAA_STATION = "8419317";

  app.get("/api/tides", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
      }

      if (tideCache[date] && Date.now() - tideCache[date].fetchedAt < TIDE_CACHE_MS) {
        return res.json(tideCache[date].data);
      }

      const noaaDate = date.replace(/-/g, "");
      const [predictionsRes, hiloRes] = await Promise.all([
        fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${NOAA_STATION}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&begin_date=${noaaDate}&end_date=${noaaDate}&interval=h`),
        fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${NOAA_STATION}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&begin_date=${noaaDate}&end_date=${noaaDate}&interval=hilo`),
      ]);

      if (!predictionsRes.ok || !hiloRes.ok) {
        throw new Error(`NOAA API error`);
      }

      const predictionsRaw = await predictionsRes.json();
      const hiloRaw = await hiloRes.json();

      const hourly = (predictionsRaw.predictions || []).map((p: any) => ({
        time: p.t,
        height: parseFloat(p.v),
      }));

      const hilos = (hiloRaw.predictions || []).map((p: any) => ({
        time: p.t,
        height: parseFloat(p.v),
        type: p.type as "H" | "L",
      }));

      const result = { date, hourly, hilos };
      tideCache[date] = { data: result, fetchedAt: Date.now() };
      res.json(result);
    } catch (err) {
      console.error("Error fetching tides:", err);
      res.status(500).json({ message: "Failed to fetch tide data" });
    }
  });

  app.get("/api/locations", async (_req, res) => {
    try {
      const locations = await storage.getDistinctLocations();
      res.json(locations);
    } catch (err) {
      console.error("Error fetching locations:", err);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get("/api/saved-locations", async (_req, res) => {
    try {
      const locations = await storage.getSavedLocations();
      res.json(locations);
    } catch (err) {
      console.error("Error fetching saved locations:", err);
      res.status(500).json({ message: "Failed to fetch saved locations" });
    }
  });

  app.post("/api/saved-locations", async (req, res) => {
    try {
      const { displayName, lat, lon } = req.body;
      if (!displayName?.trim()) {
        return res.status(400).json({ message: "displayName is required" });
      }
      const latVal = lat != null ? Number(lat) : null;
      const lonVal = lon != null ? Number(lon) : null;
      const location = await storage.upsertSavedLocation(displayName.trim(), latVal, lonVal);
      res.json(location);
    } catch (err) {
      console.error("Error saving location:", err);
      res.status(500).json({ message: "Failed to save location" });
    }
  });

  app.post("/api/runs/:id/suggestions", async (req, res) => {
    try {
      const runId = req.params.id;
      const run = await storage.getRun(runId);
      if (!run) return res.status(404).json({ message: "Run not found" });

      const { suggestionType, suggestedTime, suggestedLocation, name } = req.body;
      const validTypes = ["location", "time", "both"];
      if (!suggestionType || !validTypes.includes(suggestionType)) {
        return res.status(400).json({ message: "suggestionType must be location, time, or both" });
      }
      if ((suggestionType === "time" || suggestionType === "both") && !suggestedTime) {
        return res.status(400).json({ message: "suggestedTime is required" });
      }
      if ((suggestionType === "location" || suggestionType === "both") && !suggestedLocation?.trim()) {
        return res.status(400).json({ message: "suggestedLocation is required" });
      }

      const trimmedLocation = suggestedLocation?.trim() || null;
      const parts: string[] = [];
      if (suggestionType === "time" || suggestionType === "both") {
        if (suggestedTime) parts.push(`Time: ${suggestedTime}`);
      }
      if (suggestionType === "location" || suggestionType === "both") {
        if (trimmedLocation) parts.push(`Location: ${trimmedLocation}`);
      }
      const text = parts.join(", ");

      const parsed = insertSuggestionSchema.safeParse({
        runId,
        text,
        name: name || null,
        suggestionType: suggestionType || null,
        suggestedTime: suggestedTime || null,
        suggestedLocation: trimmedLocation,
      });
      if (!parsed.success) return res.status(400).json({ message: "Invalid suggestion data" });

      const suggestion = await storage.createSuggestion(parsed.data);
      res.json(suggestion);
    } catch (err) {
      console.error("Error creating suggestion:", err);
      res.status(500).json({ message: "Failed to post suggestion" });
    }
  });

  return httpServer;
}
