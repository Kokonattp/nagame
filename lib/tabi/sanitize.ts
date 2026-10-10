// Untrusted trip input (chat context, shared links) → a TripIntent the planner can trust.

import { PREFERENCES, type Preference, type TripIntent } from "./types";

/** "YYYY-MM-DD" that is a real calendar date within the next ~2 years, else undefined. */
export function validDate(v: unknown): string | undefined {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return undefined;
  const days = (d.getTime() - Date.now()) / 86_400_000;
  return days > -2 && days < 800 ? v : undefined;
}

export function sanitizeIntent(raw: unknown): TripIntent {
  const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    month: Number.isInteger(i.month) && (i.month as number) >= 1 && (i.month as number) <= 12 ? (i.month as number) : undefined,
    durationDays: Number.isInteger(i.durationDays) && (i.durationDays as number) >= 1 && (i.durationDays as number) <= 21 ? (i.durationDays as number) : undefined,
    startDate: validDate(i.startDate),
    preferences: Array.isArray(i.preferences)
      ? [...new Set(i.preferences.filter((p): p is Preference => PREFERENCES.includes(p as Preference)))]
      : [],
    focus: Array.isArray(i.focus) ? i.focus.filter((f): f is string => typeof f === "string").slice(0, 5).map((f) => f.slice(0, 40)) : [],
  };
}
