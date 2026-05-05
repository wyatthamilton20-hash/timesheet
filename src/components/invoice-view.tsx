"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import {
  DEFAULT_SETTINGS,
  type InvoiceSettings,
  type PartyInfo,
  loadSettings,
  saveSettings,
  nextInvoiceNumber,
  computeLineItems,
  termsToDueDate,
  entriesInRange,
  earliestEntryDate,
  autoDetectJob,
  downloadInvoicePdf,
} from "@/lib/invoice";
import { getDurationMinutes, formatDuration, formatCurrency } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Plus, X } from "lucide-react";

const UNTAGGED = "— Select job —";

export function InvoiceView() {
  const { state, mounted } = useTimesheet();
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("2026-01");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newJobName, setNewJobName] = useState("");

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setInvoiceNumber(
      loaded.lastInvoiceNumber
        ? nextInvoiceNumber(loaded.lastInvoiceNumber, new Date())
        : "2026-01"
    );
    setHydrated(true);
  }, []);

  // Set period start once entries hydrate
  useEffect(() => {
    if (mounted && !periodStart && state.entries.length) {
      setPeriodStart(earliestEntryDate(state.entries));
    }
  }, [mounted, state.entries, periodStart]);

  const filteredEntries = useMemo(() => {
    if (!periodStart || !periodEnd) return [];
    return entriesInRange(state.entries, periodStart, periodEnd);
  }, [state.entries, periodStart, periodEnd]);

  // Auto-tag entries with a known keyword match if not already tagged
  useEffect(() => {
    if (!hydrated) return;
    let dirty = false;
    const next = { ...settings.entryJobs };
    for (const e of filteredEntries) {
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
  }, [hydrated, filteredEntries, settings.jobs]);

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
    () => computeLineItems(filteredEntries, settings.entryJobs, state.hourlyRate, "Untagged"),
    [filteredEntries, settings.entryJobs, state.hourlyRate]
  );

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = subtotal * settings.taxRate;
  const total = subtotal + tax;

  const hasUntagged = lineItems.some((i) => i.job === "Untagged");

  async function handleDownload() {
    update({ lastInvoiceNumber: invoiceNumber });
    await downloadInvoicePdf({
      number: invoiceNumber,
      invoiceDate: parseISO(invoiceDate),
      dueDate,
      terms: settings.terms,
      from: settings.from,
      to: settings.to,
      lineItems,
      taxRate: settings.taxRate,
      notes: settings.notes,
    });
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
            {filteredEntries.length} entries · {formatCurrency(state.hourlyRate)}/hr
          </p>
        </div>
        <Button onClick={handleDownload} disabled={hasUntagged || lineItems.length === 0}>
          <Download className="size-4" />
          Download PDF
        </Button>
      </div>

      {hasUntagged && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Some entries are untagged. Tag every entry with a job below before downloading.
        </div>
      )}

      {/* Invoice details */}
      <Section title="Invoice details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Invoice #" value={invoiceNumber} onChange={setInvoiceNumber} />
          <Field label="Invoice date" type="date" value={invoiceDate} onChange={setInvoiceDate} />
          <Field label="Period start" type="date" value={periodStart} onChange={setPeriodStart} />
          <Field label="Period end" type="date" value={periodEnd} onChange={setPeriodEnd} />
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
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {filteredEntries.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No entries in this period.</div>
          )}
          {filteredEntries.map((e) => {
            const tag = settings.entryJobs[e.id] ?? "";
            return (
              <div key={e.id} className="grid grid-cols-1 sm:grid-cols-[120px_70px_1fr_220px] gap-2 items-center p-3 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(e.clockIn), "EEE MMM d")}
                </span>
                <span className="font-mono text-xs">{formatDuration(getDurationMinutes(e))}</span>
                <span className="text-muted-foreground truncate" title={e.note || "(no note)"}>
                  {e.note || <em>(no note)</em>}
                </span>
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
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    Tag some entries to see line items.
                  </td>
                </tr>
              )}
              {lineItems.map((item) => (
                <tr key={item.job} className={item.job === "Untagged" ? "bg-amber-500/5" : ""}>
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
            </tbody>
            {lineItems.length > 0 && (
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
