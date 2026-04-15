"use client";

import { isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarDayCellProps {
  date: Date;
  hoursWorked: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function CalendarDayCell({
  date,
  hoursWorked,
  isCurrentMonth,
  isSelected,
  onClick,
}: CalendarDayCellProps) {
  const today = isToday(date);
  const maxHours = 10;
  const barHeight = Math.min(hoursWorked / maxHours, 1) * 100;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-start p-1.5 h-16 md:h-20 rounded-lg transition-colors cursor-pointer",
        isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
        isSelected && "bg-primary/10 ring-2 ring-primary",
        !isSelected && "hover:bg-muted",
        today && !isSelected && "ring-1 ring-primary/50"
      )}
    >
      <span
        className={cn(
          "text-xs md:text-sm font-medium",
          today && "text-primary font-bold"
        )}
      >
        {date.getDate()}
      </span>
      {hoursWorked > 0 && isCurrentMonth && (
        <>
          <div className="flex-1 w-full flex items-end justify-center px-1 mt-1">
            <div
              className="w-full max-w-[24px] rounded-sm bg-emerald-500/80"
              style={{ height: `${Math.max(barHeight, 15)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground leading-none">
            {hoursWorked.toFixed(1)}h
          </span>
        </>
      )}
    </button>
  );
}
