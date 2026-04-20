"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getEntriesForDate, getDurationMinutes } from "@/lib/time-utils";
import { CalendarDayCell } from "./calendar-day";
import { DayDetail } from "./day-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const { state, mounted } = useTimesheet();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  if (!mounted) {
    return <div className="h-[400px] rounded-xl bg-muted animate-pulse" />;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const dayEntries = getEntriesForDate(state.entries, day);
            const totalMinutes = dayEntries.reduce(
              (sum, e) => sum + getDurationMinutes(e),
              0
            );
            const hoursWorked = totalMinutes / 60;

            return (
              <CalendarDayCell
                key={day.toISOString()}
                date={day}
                hoursWorked={hoursWorked}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isSelected={isSameDay(day, selectedDate)}
                onClick={() => setSelectedDate(day)}
              />
            );
          })}
        </div>
      </div>

      <DayDetail date={selectedDate} />
    </div>
  );
}
