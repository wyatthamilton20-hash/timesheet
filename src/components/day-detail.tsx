"use client";

import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getDaySummary, formatDuration, formatCurrency } from "@/lib/time-utils";
import { EntryList } from "./entry-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DayDetail({ date }: { date: Date }) {
  const { state } = useTimesheet();
  const summary = getDaySummary(state.entries, date, state.hourlyRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
          <div className="text-right text-sm font-normal">
            <div className="font-semibold">{formatDuration(summary.totalMinutes)}</div>
            <div className="text-muted-foreground">{formatCurrency(summary.earnings)}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EntryList entries={summary.entries} />
      </CardContent>
    </Card>
  );
}
