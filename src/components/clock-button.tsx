"use client";

import { useTimesheet } from "@/context/timesheet-context";
import { getActiveEntry } from "@/lib/time-utils";
import { RunningTimer } from "./running-timer";
import { Play, Square } from "lucide-react";

export function ClockButton() {
  const { state, dispatch, mounted } = useTimesheet();
  const activeEntry = getActiveEntry(state.entries);
  const isClockedIn = !!activeEntry;

  function handleClick() {
    if (isClockedIn && activeEntry) {
      dispatch({
        type: "CLOCK_OUT",
        payload: { id: activeEntry.id, clockOut: new Date().toISOString() },
      });
    } else {
      dispatch({
        type: "CLOCK_IN",
        payload: { id: crypto.randomUUID(), clockIn: new Date().toISOString() },
      });
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="h-[88px] w-full max-w-sm rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        onClick={handleClick}
        className={`
          group relative flex items-center justify-center gap-3
          h-[88px] w-full max-w-sm
          rounded-2xl text-lg font-semibold
          transition-all duration-200 cursor-pointer
          active:scale-[0.97]
          ${
            isClockedIn
              ? "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30"
              : "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          }
        `}
      >
        {isClockedIn ? (
          <>
            <Square className="size-5" />
            Clock Out
          </>
        ) : (
          <>
            <Play className="size-5" />
            Clock In
          </>
        )}
        {isClockedIn && (
          <span className="absolute top-3 right-3 size-2.5 rounded-full bg-white/80 animate-pulse" />
        )}
      </button>
      <RunningTimer />
    </div>
  );
}
