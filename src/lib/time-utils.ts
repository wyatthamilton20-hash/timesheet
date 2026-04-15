import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { TimeEntry, DaySummary, PeriodSummary } from "./types";

export function getActiveEntry(entries: TimeEntry[]): TimeEntry | null {
  return entries.find((e) => e.clockOut === null) ?? null;
}

export function getDurationMs(entry: TimeEntry): number {
  const start = new Date(entry.clockIn).getTime();
  const end = entry.clockOut
    ? new Date(entry.clockOut).getTime()
    : Date.now();
  return Math.max(0, end - start);
}

export function getDurationMinutes(entry: TimeEntry): number {
  return getDurationMs(entry) / 60000;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatDurationLong(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function calculateEarnings(minutes: number, rate: number): number {
  return (minutes / 60) * rate;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function getEntriesForDate(
  entries: TimeEntry[],
  date: Date
): TimeEntry[] {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return entries.filter((e) => {
    const clockIn = parseISO(e.clockIn);
    return isWithinInterval(clockIn, { start, end });
  });
}

export function getEntriesForRange(
  entries: TimeEntry[],
  start: Date,
  end: Date
): TimeEntry[] {
  return entries.filter((e) => {
    const clockIn = parseISO(e.clockIn);
    return isWithinInterval(clockIn, { start, end });
  });
}

export function getDaySummary(
  entries: TimeEntry[],
  date: Date,
  rate: number
): DaySummary {
  const dayEntries = getEntriesForDate(entries, date);
  const totalMinutes = dayEntries.reduce(
    (sum, e) => sum + getDurationMinutes(e),
    0
  );
  return {
    date: date.toISOString().split("T")[0],
    entries: dayEntries,
    totalMinutes,
    earnings: calculateEarnings(totalMinutes, rate),
  };
}

export function getPeriodSummary(
  entries: TimeEntry[],
  start: Date,
  end: Date,
  rate: number
): PeriodSummary {
  const periodEntries = getEntriesForRange(entries, start, end);
  const totalMinutes = periodEntries.reduce(
    (sum, e) => sum + getDurationMinutes(e),
    0
  );
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    totalMinutes,
    totalHours: totalMinutes / 60,
    earnings: calculateEarnings(totalMinutes, rate),
    sessionCount: periodEntries.length,
  };
}

export function getTodaySummary(entries: TimeEntry[], rate: number) {
  return getDaySummary(entries, new Date(), rate);
}

export function getWeekSummary(entries: TimeEntry[], rate: number) {
  const now = new Date();
  return getPeriodSummary(
    entries,
    startOfWeek(now, { weekStartsOn: 0 }),
    endOfWeek(now, { weekStartsOn: 0 }),
    rate
  );
}

export function getMonthSummary(entries: TimeEntry[], rate: number) {
  const now = new Date();
  return getPeriodSummary(entries, startOfMonth(now), endOfMonth(now), rate);
}
