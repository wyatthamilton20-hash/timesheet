"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { computePayPeriod } from "@/lib/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export function AddEntryForm({ date }: { date: Date }) {
  const { dispatch, invoiceSettings } = useTimesheet();
  const jobs = invoiceSettings?.jobs ?? [];
  const [open, setOpen] = useState(false);
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("17:00");
  const [note, setNote] = useState("");
  const [selectedJob, setSelectedJob] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dateStr = format(date, "yyyy-MM-dd");
    const newClockIn = new Date(`${dateStr}T${clockIn}:00`).toISOString();
    const newClockOut = new Date(`${dateStr}T${clockOut}:00`).toISOString();

    const id = crypto.randomUUID();
    const payPeriod = invoiceSettings
      ? computePayPeriod(new Date(newClockIn), invoiceSettings.downloads)
      : null;

    dispatch({
      type: "MANUAL_ENTRY",
      payload: {
        id,
        clockIn: newClockIn,
        clockOut: newClockOut,
        note,
        job: selectedJob || undefined,
        payPeriod,
      },
    });

    setNote("");
    setSelectedJob("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4 mr-1.5" />
        Add Time Entry
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 rounded-lg border bg-card space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Add Manual Entry</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label htmlFor="add-clock-in" className="text-xs">
            Clock In
          </Label>
          <Input
            id="add-clock-in"
            type="time"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="w-32"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add-clock-out" className="text-xs">
            Clock Out
          </Label>
          <Input
            id="add-clock-out"
            type="time"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="w-32"
            required
          />
        </div>
        {jobs.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="add-job" className="text-xs">
              Job
            </Label>
            <select
              id="add-job"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-44"
            >
              <option value="">— Select job —</option>
              {jobs.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1 flex-1 min-w-[120px]">
          <Label htmlFor="add-note" className="text-xs">
            Note
          </Label>
          <Input
            id="add-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>
      </div>
      <Button type="submit" size="sm" className="w-full">
        <Plus className="size-4 mr-1.5" />
        Add Entry
      </Button>
    </form>
  );
}
