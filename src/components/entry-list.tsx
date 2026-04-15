"use client";

import type { TimeEntry } from "@/lib/types";
import { EntryRow } from "./entry-row";

export function EntryList({ entries }: { entries: TimeEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No entries for this day
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
