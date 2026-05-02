"use client";

import { useState } from "react";
import { useTimesheet } from "@/context/timesheet-context";
import {
  getTodaySummary,
  getWeekSummary,
  getMonthSummary,
  getLastNDaysSummary,
  formatDuration,
  formatCurrency,
} from "@/lib/time-utils";
import { Clock, Calendar, CalendarDays, History } from "lucide-react";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [10, 15, 30, 60, 90] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

export function SummaryCards() {
  const { state, mounted } = useTimesheet();
  const [rangeDays, setRangeDays] = useState<RangeOption>(30);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[100px] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const today = getTodaySummary(state.entries, state.hourlyRate);
  const week = getWeekSummary(state.entries, state.hourlyRate);
  const month = getMonthSummary(state.entries, state.hourlyRate);
  const range = getLastNDaysSummary(
    state.entries,
    rangeDays,
    state.hourlyRate
  );

  const cards = [
    {
      title: "Today",
      icon: Clock,
      duration: formatDuration(today.totalMinutes),
      earnings: formatCurrency(today.earnings),
      sessions: today.entries.length,
    },
    {
      title: "This Week",
      icon: Calendar,
      duration: formatDuration(week.totalMinutes),
      earnings: formatCurrency(week.earnings),
      sessions: week.sessionCount,
    },
    {
      title: "This Month",
      icon: CalendarDays,
      duration: formatDuration(month.totalMinutes),
      earnings: formatCurrency(month.earnings),
      sessions: month.sessionCount,
    },
    {
      title: `Last ${rangeDays} Days`,
      icon: History,
      duration: formatDuration(range.totalMinutes),
      earnings: formatCurrency(range.earnings),
      sessions: range.sessionCount,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </span>
              <card.icon className="size-4 text-muted-foreground/60" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{card.duration}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {card.earnings} &middot; {card.sessions} session{card.sessions !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-1">
          Range
        </span>
        {RANGE_OPTIONS.map((days) => {
          const active = days === rangeDays;
          return (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {days}d
            </button>
          );
        })}
      </div>
    </div>
  );
}
