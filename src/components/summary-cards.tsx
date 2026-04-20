"use client";

import { useTimesheet } from "@/context/timesheet-context";
import {
  getTodaySummary,
  getWeekSummary,
  getMonthSummary,
  formatDuration,
  formatCurrency,
} from "@/lib/time-utils";
import { Clock, Calendar, CalendarDays } from "lucide-react";

export function SummaryCards() {
  const { state, mounted } = useTimesheet();

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[100px] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const today = getTodaySummary(state.entries, state.hourlyRate);
  const week = getWeekSummary(state.entries, state.hourlyRate);
  const month = getMonthSummary(state.entries, state.hourlyRate);

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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
  );
}
