"use client";

import { format, startOfMonth, endOfMonth } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getEntriesForRange } from "@/lib/time-utils";
import { generateCSV, downloadCSV } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  const { state } = useTimesheet();

  function handleExport() {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const monthEntries = getEntriesForRange(state.entries, start, end);
    const csv = generateCSV(monthEntries, state.hourlyRate);
    const filename = `timesheet-${format(now, "yyyy-MM")}.csv`;
    downloadCSV(csv, filename);
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleExport} title="Export CSV">
      <Download className="size-4" />
    </Button>
  );
}
