"use client";

import { useTimer } from "@/hooks/use-timer";
import { useTimesheet } from "@/context/timesheet-context";
import { getActiveEntry, formatDurationLong, formatCurrency } from "@/lib/time-utils";

export function RunningTimer() {
  const { state } = useTimesheet();
  const activeEntry = getActiveEntry(state.entries);
  const elapsed = useTimer(activeEntry?.clockIn ?? null);

  if (!activeEntry) return null;

  const hours = elapsed / 3600000;
  const earnings = hours * state.hourlyRate;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-3xl sm:text-4xl font-mono font-bold tracking-wider text-foreground">
        {formatDurationLong(elapsed)}
      </div>
      <div className="text-sm text-muted-foreground font-medium">
        {formatCurrency(earnings)} earned
      </div>
    </div>
  );
}
