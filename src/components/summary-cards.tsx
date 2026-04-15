"use client";

import { useTimesheet } from "@/context/timesheet-context";
import {
  getTodaySummary,
  getWeekSummary,
  getMonthSummary,
  formatDuration,
  formatCurrency,
} from "@/lib/time-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, CalendarDays } from "lucide-react";

export function SummaryCards() {
  const { state, mounted } = useTimesheet();

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[120px] rounded-xl bg-muted animate-pulse" />
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.duration}</div>
            <div className="text-sm text-muted-foreground">
              {card.earnings} &middot; {card.sessions} session{card.sessions !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
