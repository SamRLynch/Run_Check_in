const STORAGE_KEY = "rungroup_runner_name";
const RECURRING_KEY = "rungroup_recurring_days";

export function getStoredName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {}
}

export function getRecurringDays(): number[] {
  try {
    const stored = localStorage.getItem(RECURRING_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setRecurringDays(days: number[]): void {
  try {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(days));
  } catch {}
}
