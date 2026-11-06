import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, time, boolean, timestamp, serial, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const runs = pgTable("runs", {
  id: varchar("id").primaryKey(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull().default("06:00"),
  location: text("location").notNull().default("Main Trailhead"),
  locationUrl: text("location_url"),
  cancelled: boolean("cancelled").notNull().default(false),
  name: text("name"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdBy: text("created_by"),
  lat: real("lat"),
  lon: real("lon"),
  hidden: boolean("hidden").notNull().default(false),
});

export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id").notNull().references(() => runs.id),
  runnerName: text("runner_name").notNull(),
  status: text("status").notNull().default("running"),
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
});

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  runId: varchar("run_id").notNull().references(() => runs.id),
  name: text("name"),
  text: text("text").notNull(),
  suggestionType: text("suggestion_type"),
  suggestedTime: text("suggested_time"),
  suggestedLocation: text("suggested_location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedLocations = pgTable("saved_locations", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  lat: real("lat"),
  lon: real("lon"),
}, (t) => [unique("saved_locations_display_name_unique").on(t.displayName)]);

export const insertSavedLocationSchema = createInsertSchema(savedLocations).omit({ id: true });
export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = z.infer<typeof insertSavedLocationSchema>;

export const insertRunSchema = createInsertSchema(runs).omit({ id: true });
export const insertCheckinSchema = createInsertSchema(checkins).omit({ id: true, checkedInAt: true });
export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true, createdAt: true });

export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

export type RunWithDetails = Run & {
  checkins: Checkin[];
  suggestions: Suggestion[];
};
