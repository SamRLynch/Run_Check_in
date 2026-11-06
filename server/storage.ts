import {
  type Run, type InsertRun,
  type Checkin, type InsertCheckin,
  type Suggestion, type InsertSuggestion,
  type SavedLocation,
  type RunWithDetails,
  runs, checkins, suggestions, savedLocations,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, gte, inArray } from "drizzle-orm";
import { format, addDays } from "date-fns";

export interface IStorage {
  getRun(id: string): Promise<Run | undefined>;
  getRunsByDateRange(startDate: string, endDate: string): Promise<RunWithDetails[]>;
  createRun(run: InsertRun): Promise<Run>;
  createCustomRun(id: string, run: InsertRun): Promise<Run>;
  updateRun(id: string, updates: { name?: string | null; startTime?: string; location?: string; lat?: number | null; lon?: number | null }): Promise<Run>;
  hideRun(id: string, hidden: boolean): Promise<Run>;
  deleteRun(id: string): Promise<void>;
  cancelRun(id: string): Promise<void>;
  getCheckinsByRun(runId: string): Promise<Checkin[]>;
  upsertCheckin(runId: string, runnerName: string, status: string): Promise<Checkin>;
  deleteCheckin(runId: string, runnerName: string): Promise<void>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  getDistinctLocations(): Promise<string[]>;
  getSavedLocations(): Promise<SavedLocation[]>;
  upsertSavedLocation(displayName: string, lat: number | null, lon: number | null): Promise<SavedLocation>;
  ensureWeekdayRuns(startDate: Date, days: number, defaultTime: string, defaultLocation: string): Promise<void>;
  clearSeedRunners(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getRun(id: string): Promise<Run | undefined> {
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    return run;
  }

  async getRunsByDateRange(startDate: string, endDate: string): Promise<RunWithDetails[]> {
    const allRuns = await db.select().from(runs)
      .where(gte(runs.date, startDate))
      .orderBy(asc(runs.date));

    const filtered = allRuns.filter(r => r.date <= endDate);

    const result: RunWithDetails[] = [];
    for (const run of filtered) {
      const runCheckins = await db.select().from(checkins)
        .where(eq(checkins.runId, run.id))
        .orderBy(asc(checkins.checkedInAt));
      const runSuggestions = await db.select().from(suggestions)
        .where(eq(suggestions.runId, run.id))
        .orderBy(asc(suggestions.createdAt));
      result.push({ ...run, checkins: runCheckins, suggestions: runSuggestions });
    }
    return result;
  }

  async createRun(run: InsertRun): Promise<Run> {
    const id = run.date;
    const existing = await this.getRun(id);
    if (existing) return existing;
    const [created] = await db.insert(runs).values({ ...run, id }).returning();
    return created;
  }

  async createCustomRun(id: string, run: InsertRun): Promise<Run> {
    const [created] = await db.insert(runs).values({ ...run, id }).returning();
    return created;
  }

  async updateRun(id: string, updates: { name?: string | null; startTime?: string; location?: string; lat?: number | null; lon?: number | null }): Promise<Run> {
    const [updated] = await db.update(runs).set(updates).where(eq(runs.id, id)).returning();
    return updated;
  }

  async hideRun(id: string, hidden: boolean): Promise<Run> {
    const [updated] = await db.update(runs).set({ hidden }).where(eq(runs.id, id)).returning();
    return updated;
  }

  async deleteRun(id: string): Promise<void> {
    await db.delete(checkins).where(eq(checkins.runId, id));
    await db.delete(suggestions).where(eq(suggestions.runId, id));
    await db.delete(runs).where(eq(runs.id, id));
  }

  async cancelRun(id: string): Promise<void> {
    await db.update(runs).set({ cancelled: true }).where(eq(runs.id, id));
  }

  async getCheckinsByRun(runId: string): Promise<Checkin[]> {
    return db.select().from(checkins)
      .where(eq(checkins.runId, runId))
      .orderBy(asc(checkins.checkedInAt));
  }

  async upsertCheckin(runId: string, runnerName: string, status: string): Promise<Checkin> {
    const existing = await db.select().from(checkins).where(eq(checkins.runId, runId));
    const match = existing.find(c => c.runnerName.toLowerCase() === runnerName.toLowerCase());
    if (match) {
      const [updated] = await db.update(checkins)
        .set({ status })
        .where(eq(checkins.id, match.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(checkins).values({ runId, runnerName, status }).returning();
    return created;
  }

  async deleteCheckin(runId: string, runnerName: string): Promise<void> {
    const allCheckins = await db.select().from(checkins).where(eq(checkins.runId, runId));
    const match = allCheckins.find(c => c.runnerName.toLowerCase() === runnerName.toLowerCase());
    if (match) {
      await db.delete(checkins).where(eq(checkins.id, match.id));
    }
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const [created] = await db.insert(suggestions).values(suggestion).returning();
    return created;
  }

  async getSavedLocations(): Promise<SavedLocation[]> {
    return db.select().from(savedLocations).orderBy(asc(savedLocations.displayName));
  }

  async upsertSavedLocation(displayName: string, lat: number | null, lon: number | null): Promise<SavedLocation> {
    const existing = await db.select().from(savedLocations)
      .where(eq(savedLocations.displayName, displayName));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(savedLocations)
      .values({ displayName, lat, lon })
      .returning();
    return created;
  }

  async getDistinctLocations(): Promise<string[]> {
    const allRuns = await db.select({ location: runs.location }).from(runs);
    const allSuggestions = await db.select({ location: suggestions.suggestedLocation }).from(suggestions);
    const locationSet = new Set<string>();
    for (const r of allRuns) {
      if (r.location) locationSet.add(r.location);
    }
    for (const s of allSuggestions) {
      if (s.location) locationSet.add(s.location);
    }
    return Array.from(locationSet).sort();
  }

  async ensureWeekdayRuns(startDate: Date, days: number, defaultTime: string, defaultLocation: string): Promise<void> {
    for (let i = 0; i < days; i++) {
      const d = addDays(startDate, i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = format(d, "yyyy-MM-dd");
        await this.createRun({
          date: dateStr,
          startTime: defaultTime,
          location: defaultLocation,
          locationUrl: null,
          cancelled: false,
          name: null,
          isCustom: false,
          createdBy: null,
        });
      }
    }
  }

  async clearSeedRunners(): Promise<void> {
    const seedNames = ["Sarah K.", "Mike R.", "Priya S.", "David L."];
    await db.delete(checkins).where(inArray(checkins.runnerName, seedNames));
  }
}

export const storage = new DatabaseStorage();
