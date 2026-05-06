import { format, parseISO } from "date-fns";
import type { TimeEntry } from "./types";
import { getDurationMinutes } from "./time-utils";

export interface PartyInfo {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
}

export interface InvoiceSettings {
  from: PartyInfo;
  to: PartyInfo;
  terms: string;
  taxRate: number;
  jobs: string[];
  entryJobs: Record<string, string>;
  lastInvoiceNumber: string;
  notes: string;
  downloads: InvoiceDownloadRecord[];
}

export interface InvoiceDownloadRecord {
  id: string;
  number: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  hours: number;
  total: number;
  downloadedAt: string;
  job: string;
}

export interface InvoiceLineItem {
  job: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

export const INVOICE_STORAGE_KEY = "timesheet-invoice";

export const DEFAULT_SETTINGS: InvoiceSettings = {
  from: {
    name: "Wyatt Hamilton",
    email: "wyatthamilton20@gmail.com",
    addressLine1: "41974 N 100th Way",
    addressLine2: "Scottsdale, AZ",
  },
  to: {
    name: "Koa Capital Partners",
    email: "",
    addressLine1: "1668 S. King St., Suite 300",
    addressLine2: "Honolulu, HI 96826",
  },
  terms: "Net 30",
  taxRate: 0,
  jobs: ["Accel Event Rentals Website", "AI Consulting", "EmbedChat", "General"],
  entryJobs: {},
  lastInvoiceNumber: "",
  notes: "",
  downloads: [],
};

const KEYWORD_MAP: Array<{ keyword: RegExp; job: string }> = [
  { keyword: /accel/i, job: "Accel Event Rentals Website" },
  { keyword: /embedchat|gabby/i, job: "EmbedChat" },
  { keyword: /\bai\b|keith/i, job: "AI Consulting" },
];

export function autoDetectJob(note: string, knownJobs: string[]): string | null {
  if (!note) return null;
  for (const { keyword, job } of KEYWORD_MAP) {
    if (keyword.test(note) && knownJobs.includes(job)) return job;
  }
  return null;
}

export function loadSettings(): InvoiceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      from: { ...DEFAULT_SETTINGS.from, ...parsed.from },
      to: { ...DEFAULT_SETTINGS.to, ...parsed.to },
      jobs: Array.isArray(parsed.jobs) && parsed.jobs.length ? parsed.jobs : DEFAULT_SETTINGS.jobs,
      entryJobs: parsed.entryJobs ?? {},
      downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: InvoiceSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function computeLineItems(
  entries: TimeEntry[],
  entryJobs: Record<string, string>,
  rate: number,
  defaultJob: string
): InvoiceLineItem[] {
  const groups = new Map<string, { minutes: number; notes: Set<string> }>();
  for (const entry of entries) {
    if (!entry.clockOut) continue;
    const job = entryJobs[entry.id] || defaultJob;
    const group = groups.get(job) ?? { minutes: 0, notes: new Set<string>() };
    group.minutes += getDurationMinutes(entry);
    if (entry.note?.trim()) group.notes.add(entry.note.trim());
    groups.set(job, group);
  }

  const items: InvoiceLineItem[] = [];
  for (const [job, group] of groups) {
    const hours = Math.round((group.minutes / 60) * 100) / 100;
    if (hours <= 0) continue;
    const description = group.notes.size
      ? Array.from(group.notes).join("; ")
      : "Hours worked";
    items.push({
      job,
      description,
      hours,
      rate,
      amount: Math.round(hours * rate * 100) / 100,
    });
  }
  return items.sort((a, b) => b.amount - a.amount);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function termsToDueDate(terms: string, invoiceDate: Date): Date {
  const match = terms.match(/net\s*(\d+)/i);
  if (match) return addDays(invoiceDate, parseInt(match[1], 10));
  return addDays(invoiceDate, 30);
}

export function entriesInRange(
  entries: TimeEntry[],
  startISO: string,
  endISO: string
): TimeEntry[] {
  const start = parseISO(startISO).getTime();
  const end = parseISO(endISO).getTime() + 24 * 60 * 60 * 1000 - 1;
  return entries
    .filter((e) => {
      if (!e.clockOut) return false;
      const t = new Date(e.clockIn).getTime();
      return t >= start && t <= end;
    })
    .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
}

export function earliestEntryDate(entries: TimeEntry[]): string {
  const dates = entries
    .filter((e) => e.clockOut)
    .map((e) => new Date(e.clockIn).getTime());
  if (!dates.length) return format(new Date(), "yyyy-MM-dd");
  return format(new Date(Math.min(...dates)), "yyyy-MM-dd");
}

export interface InvoiceData {
  number: string;
  invoiceDate: Date;
  dueDate: Date;
  terms: string;
  from: PartyInfo;
  to: PartyInfo;
  lineItems: InvoiceLineItem[];
  taxRate: number;
  notes: string;
}

export async function downloadInvoicePdf(data: InvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 54;
  const rightX = pageW - marginX;

  // Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(40);
  doc.setTextColor(110, 110, 110);
  doc.text("Invoice", rightX, 80, { align: "right" });

  // Date / Invoice #
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const dateStr = format(data.invoiceDate, "MM/dd/yyyy");
  doc.setFont("helvetica", "bold");
  doc.text("DATE:", rightX - 110, 105);
  doc.text("INVOICE", rightX - 110, 118);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, rightX, 105, { align: "right" });
  doc.text(data.number, rightX, 118, { align: "right" });

  // FROM block
  let y = 160;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", marginX, y);
  doc.setFont("helvetica", "normal");
  const fromX = marginX + 50;
  doc.text(data.from.name, fromX, y);
  if (data.from.email) doc.text(data.from.email, fromX, y + 13);
  if (data.from.addressLine1) doc.text(data.from.addressLine1, fromX, y + 26);
  if (data.from.addressLine2) doc.text(data.from.addressLine2, fromX, y + 39);

  // TO block
  const toLabelX = pageW / 2 + 10;
  const toX = toLabelX + 30;
  doc.setFont("helvetica", "bold");
  doc.text("TO:", toLabelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.to.name, toX, y);
  if (data.to.email) doc.text(data.to.email, toX, y + 13);
  if (data.to.addressLine1) doc.text(data.to.addressLine1, toX, y + 26);
  if (data.to.addressLine2) doc.text(data.to.addressLine2, toX, y + 39);

  // Terms / Due
  y = 235;
  doc.setFont("helvetica", "bold");
  doc.text("TERMS:", marginX, y);
  doc.text("DUE:", marginX, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(data.terms, marginX + 50, y);
  doc.text(format(data.dueDate, "MM/dd/yyyy"), marginX + 50, y + 13);

  // Items table
  y = 280;
  const colDesc = marginX;
  const colQty = pageW - marginX - 240;
  const colPrice = pageW - marginX - 140;
  const colAmount = pageW - marginX - 30;
  const tableLeft = marginX;
  const tableRight = pageW - marginX;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.7);
  doc.line(tableLeft, y, tableRight, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item Description", colDesc + 4, y + 16);
  doc.text("Quantity", colQty, y + 16, { align: "center" });
  doc.text("Price", colPrice, y + 16, { align: "center" });
  doc.text("Amount", colAmount, y + 16, { align: "right" });

  y += 24;
  doc.line(tableLeft, y, tableRight, y);

  doc.setFont("helvetica", "normal");
  let rowY = y + 16;
  const rowHeight = 20;
  const minRows = 10;

  for (const item of data.lineItems) {
    const descLines = doc.splitTextToSize(`${item.job} — ${item.description}`, colQty - colDesc - 12);
    const lineCount = Math.max(1, descLines.length);
    doc.text(descLines, colDesc + 4, rowY);
    doc.text(item.hours.toFixed(2), colQty, rowY, { align: "center" });
    doc.text(`$${item.rate.toFixed(2)}`, colPrice, rowY, { align: "center" });
    doc.text(`$${item.amount.toFixed(2)}`, colAmount, rowY, { align: "right" });
    rowY += rowHeight * lineCount;
  }

  // Padding rows so the box has minimum height
  const rowsRendered = data.lineItems.reduce((acc, item) => {
    const lines = doc.splitTextToSize(`${item.job} — ${item.description}`, colQty - colDesc - 12).length;
    return acc + Math.max(1, lines);
  }, 0);
  const padRows = Math.max(0, minRows - rowsRendered);
  rowY += padRows * rowHeight;

  const tableBottomY = rowY - 4;

  // Vertical lines for table
  doc.line(tableLeft, y, tableLeft, tableBottomY);
  doc.line(tableRight, y, tableRight, tableBottomY);
  doc.line(colQty - 30, y, colQty - 30, tableBottomY);
  doc.line(colPrice - 30, y, colPrice - 30, tableBottomY);
  doc.line(colAmount - 70, y, colAmount - 70, tableBottomY);
  doc.line(tableLeft, tableBottomY, tableRight, tableBottomY);

  // Totals
  const subtotal = data.lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * data.taxRate * 100) / 100;
  const total = subtotal + tax;

  let totalsY = tableBottomY + 22;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", colPrice, totalsY, { align: "center" });
  doc.text(`$${subtotal.toFixed(2)}`, colAmount, totalsY, { align: "right" });

  totalsY += 18;
  doc.text("Tax", colPrice, totalsY, { align: "center" });
  if (data.taxRate > 0) {
    doc.text(`$${tax.toFixed(2)}`, colAmount, totalsY, { align: "right" });
  }

  totalsY += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("BALANCE DUE", colPrice, totalsY, { align: "center" });
  doc.text(`$${total.toFixed(2)}`, colAmount, totalsY, { align: "right" });

  // Notes
  let notesY = totalsY + 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(110, 110, 110);
  doc.text("Notes", marginX, notesY);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  notesY += 12;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  const notesBoxH = 90;
  doc.rect(marginX, notesY, pageW - marginX * 2, notesBoxH);
  if (data.notes) {
    const noteLines = doc.splitTextToSize(data.notes, pageW - marginX * 2 - 10);
    doc.text(noteLines, marginX + 6, notesY + 16);
  }

  doc.save(`${data.from.name} Invoice ${data.number}.pdf`);
}
