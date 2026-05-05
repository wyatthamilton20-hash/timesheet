"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { formatCurrency } from "@/lib/time-utils";
import {
  DEFAULT_TAX_SETTINGS,
  type TaxCategory,
  type TaxPayment,
  type TaxSettings,
  loadTaxSettings,
  saveTaxSettings,
  ytdGross,
  grossInRange,
  nextQuarter,
  totalRate,
} from "@/lib/tax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export function TaxView() {
  const { state, mounted } = useTimesheet();
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLabel, setPaymentLabel] = useState("");

  useEffect(() => {
    setSettings(loadTaxSettings());
    setHydrated(true);
  }, []);

  function update(patch: Partial<TaxSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveTaxSettings(next);
      return next;
    });
  }

  const today = new Date();
  const quarter = nextQuarter(today);

  const gross = useMemo(
    () => (mounted ? ytdGross(state.entries, state.hourlyRate, today) : 0),
    [mounted, state.entries, state.hourlyRate, today]
  );

  const quarterGross = useMemo(
    () =>
      mounted
        ? grossInRange(state.entries, state.hourlyRate, quarter.startISO, quarter.endISO)
        : 0,
    [mounted, state.entries, state.hourlyRate, quarter.startISO, quarter.endISO]
  );

  const combinedRate = totalRate(settings.categories);
  const totalTax = gross * combinedRate;
  const net = gross - totalTax;
  const quarterTax = quarterGross * combinedRate;

  const totalPaid = settings.payments.reduce((s, p) => s + p.amount, 0);
  const remainingOwed = totalTax - totalPaid;

  function setCategory(id: string, patch: Partial<TaxCategory>) {
    update({
      categories: settings.categories.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  }

  function addCategory() {
    const id = crypto.randomUUID();
    update({
      categories: [
        ...settings.categories,
        { id, name: "Custom withholding", rate: 0, note: "" },
      ],
    });
  }

  function removeCategory(id: string) {
    update({ categories: settings.categories.filter((c) => c.id !== id) });
  }

  function addPayment() {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    const payment: TaxPayment = {
      id: crypto.randomUUID(),
      date: paymentDate,
      amount,
      label: paymentLabel.trim() || "Estimated tax payment",
    };
    update({ payments: [...settings.payments, payment] });
    setPaymentAmount("");
    setPaymentLabel("");
  }

  function removePayment(id: string) {
    update({ payments: settings.payments.filter((p) => p.id !== id) });
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
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Tax Withholdings</h2>
        <p className="text-sm text-muted-foreground">
          Estimator for an Arizona-resident 1099 contractor with a Hawaii GE Tax obligation.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
        <strong>Disclaimer:</strong> This is an estimator, not tax advice. Verify with a CPA before filing —
        actual tax depends on deductions, total annual income, filing status, and other factors not modeled here.
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`YTD Gross (${today.getFullYear()})`}
          value={formatCurrency(gross)}
          sub={`${formatCurrency(state.hourlyRate)}/hr`}
        />
        <StatCard
          label="Estimated Tax Owed"
          value={formatCurrency(totalTax)}
          sub={`${(combinedRate * 100).toFixed(1)}% of gross`}
        />
        <StatCard
          label="Net After Tax"
          value={formatCurrency(net)}
          sub={`${((1 - combinedRate) * 100).toFixed(1)}% take-home`}
        />
        <StatCard
          label={`${quarter.label} Estimated Payment`}
          value={formatCurrency(quarterTax)}
          sub={`Due ${format(quarter.dueDate, "MMM d, yyyy")}`}
        />
      </div>

      {/* Tax categories */}
      <Section title="Tax categories">
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 items-center rounded-lg bg-muted/40 p-3">
          <Label className="text-xs">Hawaii GE Tax license #</Label>
          <Input
            value={settings.getLicenseNumber}
            onChange={(e) => update({ getLicenseNumber: e.target.value })}
            placeholder="Paste in after registering at hitax.hawaii.gov"
          />
        </div>
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {settings.categories.map((cat) => (
            <div key={cat.id} className="p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_36px] gap-2 items-center">
                <Input
                  value={cat.name}
                  onChange={(e) => setCategory(cat.id, { name: e.target.value })}
                />
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    value={cat.rate}
                    onChange={(e) =>
                      setCategory(cat.id, { rate: parseFloat(e.target.value) || 0 })
                    }
                    className="pr-12"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {(cat.rate * 100).toFixed(2)}%
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCategory(cat.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {cat.note && (
                <p className="text-xs text-muted-foreground pl-1">{cat.note}</p>
              )}
              <div className="text-xs text-muted-foreground pl-1">
                On {formatCurrency(gross)} gross →{" "}
                <span className="font-mono">{formatCurrency(gross * cat.rate)}</span>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={addCategory} className="mt-3">
          <Plus className="size-4" />
          Add category
        </Button>
        <div className="mt-3 flex justify-between text-sm border-t border-border/60 pt-3">
          <span className="text-muted-foreground">
            Combined rate <strong className="text-foreground">{(combinedRate * 100).toFixed(2)}%</strong>
          </span>
          <span className="font-mono font-semibold">{formatCurrency(totalTax)}</span>
        </div>
      </Section>

      {/* Quarterly schedule */}
      <Section title="Quarterly schedule">
        <p className="text-xs text-muted-foreground mb-3">
          The IRS expects estimated payments if you'll owe over $1,000. Pay through{" "}
          <a
            className="underline"
            href="https://www.irs.gov/payments/direct-pay"
            target="_blank"
            rel="noreferrer"
          >
            IRS Direct Pay
          </a>{" "}
          (federal) and{" "}
          <a
            className="underline"
            href="https://aztaxes.gov/"
            target="_blank"
            rel="noreferrer"
          >
            AZTaxes.gov
          </a>{" "}
          (Arizona).
        </p>
        <div className="text-sm rounded-lg border border-border/60 p-3 space-y-1">
          <div className="flex justify-between">
            <span className="font-medium">{quarter.label} {today.getFullYear()}</span>
            <span className="text-muted-foreground">Due {format(quarter.dueDate, "MMM d, yyyy")}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Period: {quarter.startISO} → {quarter.endISO}
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Gross this quarter</span>
            <span className="font-mono">{formatCurrency(quarterGross)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated payment</span>
            <span className="font-mono font-semibold">{formatCurrency(quarterTax)}</span>
          </div>
        </div>
      </Section>

      {/* Payments log */}
      <Section title="Tax payments made">
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {settings.payments.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No payments logged yet. Add ones you've already made (e.g. quarterly estimates).
            </div>
          )}
          {settings.payments
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((p) => (
              <div key={p.id} className="grid grid-cols-[120px_1fr_100px_36px] gap-2 items-center p-3 text-sm">
                <span className="text-muted-foreground">{p.date}</span>
                <span>{p.label}</span>
                <span className="font-mono text-right">{formatCurrency(p.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePayment(p.id)}
                  aria-label="Remove payment"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_auto] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={paymentLabel}
              onChange={(e) => setPaymentLabel(e.target.value)}
              placeholder="Q2 federal estimate"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addPayment} className="w-full sm:w-auto">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
        {settings.payments.length > 0 && (
          <div className="mt-3 flex justify-between text-sm border-t border-border/60 pt-3">
            <span className="text-muted-foreground">
              Paid <span className="font-mono">{formatCurrency(totalPaid)}</span> · Remaining estimate{" "}
              <span className="font-mono">{formatCurrency(Math.max(0, remainingOwed))}</span>
            </span>
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

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

