import { format, addDays, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";

export function formatRunDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

export function formatShortDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEE, MMM d");
}

export function formatDayOfWeek(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE");
}

export function formatTime(timeStr: string): string {
  const parts = timeStr.split(":");
  const h = parseInt(parts[0]);
  const minutes = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getTomorrowDateStr(): string {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

export function getUpcomingDates(days: number): string[] {
  const dates: string[] = [];
  const start = addDays(new Date(), 1);
  for (let i = 0; i < days; i++) {
    dates.push(format(addDays(start, i), "yyyy-MM-dd"));
  }
  return dates;
}

export function isDateTomorrow(dateStr: string): boolean {
  return isTomorrow(parseISO(dateStr));
}

export function isDateToday(dateStr: string): boolean {
  return isToday(parseISO(dateStr));
}

export function formatCheckinDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  return format(date, "EEEE");
}

export function getRunTitle(run: { date: string; isCustom?: boolean | null; name?: string | null }): string {
  if (run.isCustom && run.name) return run.name;
  const date = parseISO(run.date);
  if (isToday(date)) return "Today's Run";
  if (isTomorrow(date)) return "Tomorrow's Run";
  return `${format(date, "EEEE")} Run`;
}
