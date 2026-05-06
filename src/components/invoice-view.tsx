"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import {
  DEFAULT_SETTINGS,
  type InvoiceSettings,
  type InvoiceDownloadRecord,
  type PartyInfo,
  loadSettings,
  saveSettings,
  computeLineItems,
  termsToDueDate,
  autoDetectJob,
  downloadInvoicePdf,
} from "@/lib/invoice";
import { getDurationMinutes, formatDuration, formatCurrency } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Plus, Trash2, X } from "lucide-react";

const UNTAGGED = "— Select job —";

export function InvoiceView() {
  const { state, mounted } = useTimesheet();
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("2026-01");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newJobName, setNewJobName] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("");
  type PayPeriodFilter = number | "all" | "untagged";
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriodFilter>("all");

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setInvoiceNumber(loaded.lastInvoiceNumber || "2026-01");
    setHydrated(true);
  }, []);

  const allEntries = useMemo(
    () =>
      [...state.entries]
        .filter((e) => e.clockOut)
        .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()),
    [state.entries]
  );

  const visibleEntries = useMemo(() => {
    if (selectedPayPeriod === "all") return allEntries;
    if (selectedPayPeriod === "untagged") {
      return allEntries.filter((e) => settings.entryPayPeriods[e.id] == null);
    }
    return allEntries.filter((e) => settings.entryPayPeriods[e.id] === selectedPayPeriod);
  }, [allEntries, selectedPayPeriod, settings.entryPayPeriods]);

  // Auto-tag entries with a known keyword match if not already tagged
  useEffect(() => {
    if (!hydrated) return;
    let dirty = false;
    const next = { ...settings.entryJobs };
    for (const e of allEntries) {
      if (!next[e.id]) {
        const guess = autoDetectJob(e.note, settings.jobs);
        if (guess) {
          next[e.id] = guess;
          dirty = true;
        }
      }
    }
    if (dirty) update({ entryJobs: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, allEntries, settings.jobs]);

  function update(patch: Partial<InvoiceSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  function setEntryJob(entryId: string, job: string) {
    const next = { ...settings.entryJobs };
    if (job === UNTAGGED) delete next[entryId];
    else next[entryId] = job;
    update({ entryJobs: next });
  }

  function setEntryPayPeriod(entryId: string, periodValue: string) {
    const next = { ...settings.entryPayPeriods };
    if (!periodValue) delete next[entryId];
    else next[entryId] = parseInt(periodValue, 10);
    update({ entryPayPeriods: next });
  }

  function bulkSetPayPeriod(periodNumber: number) {
    const next = { ...settings.entryPayPeriods };
    for (const e of visibleEntries) next[e.id] = periodNumber;
    update({ entryPayPeriods: next });
  }

  function addJob() {
    const name = newJobName.trim();
    if (!name || settings.jobs.includes(name)) return;
    update({ jobs: [...settings.jobs, name] });
    setNewJobName("");
  }

  function removeJob(name: string) {
    update({ jobs: settings.jobs.filter((j) => j !== name) });
  }

  const dueDate = useMemo(
    () => termsToDueDate(settings.terms, parseISO(invoiceDate)),
    [settings.terms, invoiceDate]
  );

  const lineItems = useMemo(
    () => computeLineItems(visibleEntries, settings.entryJobs, state.hourlyRate, "Untagged"),
    [visibleEntries, settings.entryJobs, state.hourlyRate]
  );

  const displayedLineItems = useMemo(
    () => (selectedJob ? lineItems.filter((i) => i.job === selectedJob) : lineItems),
    [lineItems, selectedJob]
  );

  const invoiceLineItems = useMemo(
    () => displayedLineItems.filter((i) => i.job !== "Untagged"),
    [displayedLineItems]
  );

  const untaggedItem = displayedLineItems.find((i) => i.job === "Untagged");

  const subtotal = invoiceLineItems.reduce((s, i) => s + i.amount, 0);
  const tax = subtotal * settings.taxRate;
  const total = subtotal + tax;

  async function handleDownload() {
    await downloadInvoicePdf({
      number: invoiceNumber,
      invoiceDate: parseISO(invoiceDate),
      dueDate,
      terms: settings.terms,
      from: settings.from,
      to: settings.to,
      lineItems: invoiceLineItems,
      taxRate: settings.taxRate,
      notes: settings.notes,
    });
    const totalHours = invoiceLineItems.reduce((s, i) => s + i.hours, 0);
    const billedEntryIds = new Set(
      visibleEntries
        .filter((e) => {
          const job = settings.entryJobs[e.id];
          if (!job) return false;
          if (selectedJob) return job === selectedJob;
          return true;
        })
        .map((e) => e.id)
    );
    const billedDates = visibleEntries
      .filter((e) => billedEntryIds.has(e.id))
      .map((e) => new Date(e.clockIn).getTime());
    const periodStart = billedDates.length ? format(new Date(Math.min(...billedDates)), "yyyy-MM-dd") : "";
    const periodEnd = billedDates.length ? format(new Date(Math.max(...billedDates)), "yyyy-MM-dd") : "";
    const record: InvoiceDownloadRecord = {
      id: crypto.randomUUID(),
      number: invoiceNumber,
      invoiceDate,
      periodStart,
      periodEnd,
      hours: Math.round(totalHours * 100) / 100,
      total,
      downloadedAt: new Date().toISOString(),
      job: selectedJob || "All jobs",
      payPeriod: typeof selectedPayPeriod === "number" ? selectedPayPeriod : null,
    };
    update({
      lastInvoiceNumber: invoiceNumber,
      downloads: [record, ...settings.downloads],
    });
  }

  function removeDownload(id: string) {
    update({ downloads: settings.downloads.filter((d) => d.id !== id) });
  }

  if (!mounted || !hydrated) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Invoice</h2>
          <p className="text-sm text-muted-foreground">
            {visibleEntries.length} entries · {formatCurrency(state.hourlyRate)}/hr
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Pay period</Label>
            <select
              value={String(selectedPayPeriod)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "all" || v === "untagged") setSelectedPayPeriod(v);
                else setSelectedPayPeriod(parseInt(v, 10));
              }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="all">All periods</option>
              <option value="untagged">Untagged</option>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Period {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice for</Label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">All jobs (combined)</option>
              {settings.jobs.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleDownload} disabled={invoiceLineItems.length === 0}>
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {untaggedItem && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {untaggedItem.hours.toFixed(2)} untagged hours ({formatCurrency(untaggedItem.amount)}) are excluded from this PDF. Tag them below if you want them billed.
        </div>
      )}

      {/* Invoice details */}
      <Section title="Invoice details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Invoice #"
            value={invoiceNumber}
            onChange={(v) => {
              setInvoiceNumber(v);
              update({ lastInvoiceNumber: v });
            }}
          />
          <Field label="Invoice date" type="date" value={invoiceDate} onChange={setInvoiceDate} />
          <Field
            label="Terms"
            value={settings.terms}
            onChange={(v) => update({ terms: v })}
          />
          <Field
            label="Tax rate (decimal, e.g. 0.05 for 5%)"
            type="number"
            value={String(settings.taxRate)}
            onChange={(v) => update({ taxRate: parseFloat(v) || 0 })}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Due: {format(dueDate, "MMM d, yyyy")}
        </p>
      </Section>

      {/* From/To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PartyEditor
          title="FROM"
          party={settings.from}
          onChange={(from) => update({ from })}
        />
        <PartyEditor
          title="TO"
          party={settings.to}
          onChange={(to) => update({ to })}
        />
      </div>

      {/* Jobs management */}
      <Section title="Jobs">
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.jobs.map((job) => (
            <span
              key={job}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium"
            >
              {job}
              <button
                type="button"
                onClick={() => removeJob(job)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${job}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newJobName}
            onChange={(e) => setNewJobName(e.target.value)}
            placeholder="Add a job (e.g. Koa Capital site)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addJob();
              }
            }}
          />
          <Button variant="outline" onClick={addJob}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </Section>

      {/* Entry tagger */}
      <Section title="Tag entries">
        {visibleEntries.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Bulk: tag all {visibleEntries.length} visible {visibleEntries.length === 1 ? "entry" : "entries"} to
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkSetPayPeriod(parseInt(e.target.value, 10));
                  e.currentTarget.value = "";
                }
              }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">Pay period…</option>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Period {n}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {visibleEntries.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              {selectedPayPeriod === "untagged"
                ? "No untagged entries — every entry has a pay period."
                : selectedPayPeriod === "all"
                  ? "No entries yet."
                  : `No entries tagged with Period ${selectedPayPeriod}.`}
            </div>
          )}
          {visibleEntries.map((e) => {
            const tag = settings.entryJobs[e.id] ?? "";
            const period = settings.entryPayPeriods[e.id];
            return (
              <div key={e.id} className="grid grid-cols-1 sm:grid-cols-[120px_70px_1fr_120px_220px] gap-2 items-center p-3 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(e.clockIn), "EEE MMM d")}
                </span>
                <span className="font-mono text-xs">{formatDuration(getDurationMinutes(e))}</span>
                <span className="text-muted-foreground truncate" title={e.note || "(no note)"}>
                  {e.note || <em>(no note)</em>}
                </span>
                <select
                  value={period ?? ""}
                  onChange={(ev) => setEntryPayPeriod(e.id, ev.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                  title="Pay period"
                >
                  <option value="">— Period —</option>
                  {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Period {n}
                    </option>
                  ))}
                </select>
                <select
                  value={tag}
                  onChange={(ev) => setEntryJob(e.id, ev.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="">{UNTAGGED}</option>
                  {settings.jobs.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Line items preview */}
      <Section title="Line items preview">
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Item Description</th>
                <th className="text-center px-3 py-2 w-24">Qty (hrs)</th>
                <th className="text-center px-3 py-2 w-24">Price</th>
                <th className="text-right px-3 py-2 w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {invoiceLineItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    {selectedJob
                      ? `No tagged entries for "${selectedJob}" in this period.`
                      : "Tag some entries to see line items."}
                  </td>
                </tr>
              )}
              {invoiceLineItems.map((item) => (
                <tr key={item.job}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.job}</div>
                    {item.description !== "Hours worked" && (
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </td>
                  <td className="text-center px-3 py-2 font-mono">{item.hours.toFixed(2)}</td>
                  <td className="text-center px-3 py-2 font-mono">${item.rate.toFixed(2)}</td>
                  <td className="text-right px-3 py-2 font-mono">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
              {untaggedItem && (
                <tr className="bg-amber-500/5 text-muted-foreground italic">
                  <td className="px-3 py-2">
                    Untagged (excluded from PDF)
                  </td>
                  <td className="text-center px-3 py-2 font-mono">{untaggedItem.hours.toFixed(2)}</td>
                  <td className="text-center px-3 py-2 font-mono">—</td>
                  <td className="text-right px-3 py-2 font-mono">—</td>
                </tr>
              )}
            </tbody>
            {invoiceLineItems.length > 0 && (
              <tfoot className="border-t border-border/60 text-sm">
                <tr>
                  <td colSpan={3} className="text-right px-3 py-1.5 text-muted-foreground">Subtotal</td>
                  <td className="text-right px-3 py-1.5 font-mono">${subtotal.toFixed(2)}</td>
                </tr>
                {settings.taxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="text-right px-3 py-1.5 text-muted-foreground">
                      Tax ({(settings.taxRate * 100).toFixed(2)}%)
                    </td>
                    <td className="text-right px-3 py-1.5 font-mono">${tax.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t border-border/60">
                  <td colSpan={3} className="text-right px-3 py-2 font-semibold">Balance Due</td>
                  <td className="text-right px-3 py-2 font-mono font-semibold">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <textarea
          value={settings.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Optional notes printed at the bottom of the invoice"
          className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Section>

      <Section title={`Download history (${settings.downloads.length})`}>
        {settings.downloads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices downloaded yet. Each PDF you download will be logged here.
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Invoice #</th>
                  <th className="text-left px-3 py-2 w-24">Pay period</th>
                  <th className="text-left px-3 py-2">Job</th>
                  <th className="text-left px-3 py-2">Date range</th>
                  <th className="text-right px-3 py-2 w-20">Hours</th>
                  <th className="text-right px-3 py-2 w-28">Total</th>
                  <th className="text-left px-3 py-2 w-44">Downloaded</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {settings.downloads.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-medium">{d.number}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.payPeriod != null ? `Period ${d.payPeriod}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{d.job ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.periodStart} → {d.periodEnd}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{d.hours.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">${d.total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {format(new Date(d.downloadedAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-1 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDownload(d.id)}
                        aria-label={`Remove ${d.number}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PartyEditor({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyInfo;
  onChange: (p: PartyInfo) => void;
}) {
  function set<K extends keyof PartyInfo>(key: K, value: PartyInfo[K]) {
    onChange({ ...party, [key]: value });
  }
  return (
    <Section title={title}>
      <div className="space-y-2">
        <Field label="Name" value={party.name} onChange={(v) => set("name", v)} />
        <Field label="Email" value={party.email} onChange={(v) => set("email", v)} />
        <Field
          label="Address line 1"
          value={party.addressLine1}
          onChange={(v) => set("addressLine1", v)}
        />
        <Field
          label="Address line 2"
          value={party.addressLine2}
          onChange={(v) => set("addressLine2", v)}
        />
      </div>
    </Section>
  );
}
