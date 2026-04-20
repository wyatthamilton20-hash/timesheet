"use client";

import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getDaySummary, formatDuration, formatCurrency } from "@/lib/time-utils";
import { EntryList } from "./entry-list";
import { AddEntryForm } from "./add-entry-form";

export function DayDetail({ date }: { date: Date }) {
  const { state } = useTimesheet();
  const summary = getDaySummary(state.entries, date, state.hourlyRate);

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {format(date, "EEEE, MMMM d")}
        </h3>
        <div className="flex items-center gap-3 text-right">
          <span className="text-sm font-semibold">{formatDuration(summary.totalMinutes)}</span>
          <span className="text-xs text-muted-foreground">{formatCurrency(summary.earnings)}</span>
        </div>
      </div>
      <div className="p-4">
        <EntryList entries={summary.entries} />
        <AddEntryForm date={date} />
      </div>
    </div>
  );
}
