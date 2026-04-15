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
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="h-[120px] md:h-[160px] w-full max-w-md rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <button
        onClick={handleClick}
        className={`
          relative flex items-center justify-center gap-3
          min-h-[120px] md:min-h-[160px] w-full max-w-md
          rounded-2xl text-2xl md:text-3xl font-bold
          transition-all duration-200 cursor-pointer
          active:scale-[0.98]
          ${
            isClockedIn
              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 ring-2 ring-red-400 animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
          }
        `}
      >
        {isClockedIn ? (
          <>
            <Square className="size-7" />
            Clock Out
          </>
        ) : (
          <>
            <Play className="size-7" />
            Clock In
          </>
        )}
      </button>
      <RunningTimer />
    </div>
  );
}
