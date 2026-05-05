import { startOfYear, endOfYear } from "date-fns";
import type { TimeEntry } from "./types";
import { getDurationMinutes } from "./time-utils";

export interface TaxCategory {
  id: string;
  name: string;
  rate: number;
  note: string;
}

export interface TaxSettings {
  categories: TaxCategory[];
  payments: TaxPayment[];
  getLicenseNumber: string;
}

export interface TaxPayment {
  id: string;
  date: string;
  amount: number;
  label: string;
}

export const TAX_STORAGE_KEY = "timesheet-tax";

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  categories: [
    {
      id: "se",
      name: "Federal Self-Employment (FICA)",
      rate: 0.153,
      note: "Social Security 12.4% + Medicare 2.9%. You pay both halves as a 1099.",
    },
    {
      id: "fed",
      name: "Federal Income Tax",
      rate: 0.12,
      note: "Estimated marginal rate. Adjust based on your projected annual total.",
    },
    {
      id: "az",
      name: "Arizona State Income Tax",
      rate: 0.025,
      note: "AZ flat tax (2.5%). You'll file an AZ resident return.",
    },
    {
      id: "hi-get",
      name: "Hawaii GE Tax",
      rate: 0.045,
      note: "Hawaii General Excise Tax — 4% state + 0.5% Honolulu county surcharge. You pay this on gross from Koa. File Form G-45 periodically and Form G-49 annually.",
    },
  ],
  payments: [],
  getLicenseNumber: "",
};

export function loadTaxSettings(): TaxSettings {
  if (typeof window === "undefined") return DEFAULT_TAX_SETTINGS;
  try {
    const raw = window.localStorage.getItem(TAX_STORAGE_KEY);
    if (!raw) return DEFAULT_TAX_SETTINGS;
    const parsed = JSON.parse(raw);
    let categories: TaxCategory[] = Array.isArray(parsed.categories) && parsed.categories.length
      ? parsed.categories
      : DEFAULT_TAX_SETTINGS.categories;
    if (!categories.some((c) => c.id === "hi-get")) {
      const hiGet = DEFAULT_TAX_SETTINGS.categories.find((c) => c.id === "hi-get")!;
      categories = [...categories, hiGet];
    }
    const oldGetPayments: TaxPayment[] = Array.isArray(parsed.getPayments) ? parsed.getPayments : [];
    const payments: TaxPayment[] = Array.isArray(parsed.payments) ? parsed.payments : [];
    return {
      categories,
      payments: [...payments, ...oldGetPayments],
      getLicenseNumber: typeof parsed.getLicenseNumber === "string" ? parsed.getLicenseNumber : "",
    };
  } catch {
    return DEFAULT_TAX_SETTINGS;
  }
}

export function saveTaxSettings(settings: TaxSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export interface QuarterInfo {
  label: string;
  startISO: string;
  endISO: string;
  dueDate: Date;
}

export function quartersForYear(year: number): QuarterInfo[] {
  return [
    {
      label: "Q1",
      startISO: `${year}-01-01`,
      endISO: `${year}-03-31`,
      dueDate: new Date(year, 3, 15),
    },
    {
      label: "Q2",
      startISO: `${year}-04-01`,
      endISO: `${year}-05-31`,
      dueDate: new Date(year, 5, 15),
    },
    {
      label: "Q3",
      startISO: `${year}-06-01`,
      endISO: `${year}-08-31`,
      dueDate: new Date(year, 8, 15),
    },
    {
      label: "Q4",
      startISO: `${year}-09-01`,
      endISO: `${year}-12-31`,
      dueDate: new Date(year + 1, 0, 15),
    },
  ];
}

export function nextQuarter(today: Date): QuarterInfo {
  const year = today.getFullYear();
  const quarters = quartersForYear(year);
  for (const q of quarters) {
    if (today.getTime() <= q.dueDate.getTime()) return q;
  }
  return quartersForYear(year + 1)[0];
}

export function ytdGross(entries: TimeEntry[], rate: number, asOf: Date): number {
  const yearStart = startOfYear(asOf).getTime();
  const yearEnd = endOfYear(asOf).getTime();
  const minutes = entries
    .filter((e) => {
      if (!e.clockOut) return false;
      const t = new Date(e.clockIn).getTime();
      return t >= yearStart && t <= yearEnd;
    })
    .reduce((sum, e) => sum + getDurationMinutes(e), 0);
  return (minutes / 60) * rate;
}

export function grossInRange(
  entries: TimeEntry[],
  rate: number,
  startISO: string,
  endISO: string
): number {
  const start = new Date(startISO + "T00:00:00").getTime();
  const end = new Date(endISO + "T23:59:59").getTime();
  const minutes = entries
    .filter((e) => {
      if (!e.clockOut) return false;
      const t = new Date(e.clockIn).getTime();
      return t >= start && t <= end;
    })
    .reduce((sum, e) => sum + getDurationMinutes(e), 0);
  return (minutes / 60) * rate;
}

export function totalRate(categories: TaxCategory[]): number {
  return categories.reduce((sum, c) => sum + c.rate, 0);
}
