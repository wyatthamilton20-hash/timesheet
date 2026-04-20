"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getDurationMinutes, formatDuration, formatCurrency } from "@/lib/time-utils";
import type { TimeEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X } from "lucide-react";

export function EntryRow({ entry }: { entry: TimeEntry }) {
  const { state, dispatch } = useTimesheet();
  const [editing, setEditing] = useState(false);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editNote, setEditNote] = useState("");

  const duration = getDurationMinutes(entry);
  const earnings = (duration / 60) * state.hourlyRate;

  function startEdit() {
    setEditClockIn(format(new Date(entry.clockIn), "HH:mm"));
    setEditClockOut(entry.clockOut ? format(new Date(entry.clockOut), "HH:mm") : "");
    setEditNote(entry.note);
    setEditing(true);
  }

  function saveEdit() {
    const dateStr = format(new Date(entry.clockIn), "yyyy-MM-dd");
    const newClockIn = new Date(`${dateStr}T${editClockIn}:00`).toISOString();
    const newClockOut = editClockOut
      ? new Date(`${dateStr}T${editClockOut}:00`).toISOString()
      : null;

    dispatch({
      type: "EDIT_ENTRY",
      payload: {
        ...entry,
        clockIn: newClockIn,
        clockOut: newClockOut,
        note: editNote,
      },
    });
    setEditing(false);
  }

  function handleDelete() {
    dispatch({ type: "DELETE_ENTRY", payload: { id: entry.id } });
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-accent/50">
        <Input
          type="time"
          value={editClockIn}
          onChange={(e) => setEditClockIn(e.target.value)}
          className="w-28"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="time"
          value={editClockOut}
          onChange={(e) => setEditClockOut(e.target.value)}
          className="w-28"
        />
        <Input
          type="text"
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          placeholder="Note..."
          className="flex-1 min-w-[100px]"
        />
        <Button size="icon" variant="ghost" className="size-8" onClick={saveEdit}>
          <Check className="size-4 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(false)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="size-2 rounded-full bg-primary/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
            {format(new Date(entry.clockIn), "h:mm a")}
          </span>
          <span className="text-muted-foreground/50">&mdash;</span>
          <span className="font-medium">
            {entry.clockOut
              ? format(new Date(entry.clockOut), "h:mm a")
              : "In progress..."}
          </span>
        </div>
        {entry.note && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {entry.note}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-medium">{formatDuration(duration)}</div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(earnings)}
        </div>
      </div>
      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="size-7" onClick={startEdit}>
          <Pencil className="size-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
