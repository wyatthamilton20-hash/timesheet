"use client";

import { useState } from "react";
import { useTimesheet } from "@/context/timesheet-context";
import { getActiveEntry } from "@/lib/time-utils";
import { computePayPeriod } from "@/lib/invoice";
import { RunningTimer } from "./running-timer";
import { Play, Square } from "lucide-react";

export function ClockButton() {
  const { state, dispatch, mounted, invoiceSettings } = useTimesheet();
  const activeEntry = getActiveEntry(state.entries);
  const isClockedIn = !!activeEntry;
  const jobs = invoiceSettings?.jobs ?? [];
  const [selectedJob, setSelectedJob] = useState("");

  function handleClick() {
    if (isClockedIn && activeEntry) {
      dispatch({
        type: "CLOCK_OUT",
        payload: { id: activeEntry.id, clockOut: new Date().toISOString() },
      });
    } else {
      const now = new Date();
      const payPeriod = invoiceSettings
        ? computePayPeriod(now, invoiceSettings.downloads)
        : null;
      dispatch({
        type: "CLOCK_IN",
        payload: {
          id: crypto.randomUUID(),
          clockIn: now.toISOString(),
          job: selectedJob || undefined,
          payPeriod,
        },
      });
      setSelectedJob("");
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
      {!isClockedIn && jobs.length > 0 && (
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="">— Select what you&apos;re working on —</option>
          {jobs.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      )}
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
            {activeEntry.job && (
              <span className="absolute bottom-3 text-xs font-normal opacity-75">
                {activeEntry.job}
              </span>
            )}
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
