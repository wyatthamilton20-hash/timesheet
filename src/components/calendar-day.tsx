"use client";

import { isToday } from "date-fns";
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
  const intensity = Math.min(hoursWorked / maxHours, 1);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-start p-1.5 h-14 md:h-18 rounded-lg transition-all duration-150 cursor-pointer",
        isCurrentMonth ? "text-foreground" : "text-muted-foreground/30",
        isSelected && "bg-primary/10 ring-1 ring-primary/50",
        !isSelected && "hover:bg-accent",
        today && !isSelected && "bg-accent"
      )}
    >
      <span
        className={cn(
          "text-xs font-medium leading-none",
          today && "text-primary font-bold"
        )}
      >
        {date.getDate()}
      </span>
      {hoursWorked > 0 && isCurrentMonth && (
        <div className="flex-1 flex flex-col items-center justify-end gap-0.5 w-full mt-1">
          <div
            className="w-6 rounded-sm bg-primary/70 transition-all"
            style={{
              height: `${Math.max(intensity * 100, 20)}%`,
              opacity: 0.4 + intensity * 0.6,
            }}
          />
          <span className="text-[9px] font-medium text-muted-foreground leading-none">
            {hoursWorked.toFixed(1)}
          </span>
        </div>
      )}
    </button>
  );
}
