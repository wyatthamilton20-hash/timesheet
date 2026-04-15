import { format } from "date-fns";
import type { TimeEntry } from "./types";
import { getDurationMinutes, calculateEarnings } from "./time-utils";

export function generateCSV(entries: TimeEntry[], rate: number): string {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  const header = "Date,Clock In,Clock Out,Duration (hours),Rate,Earnings,Note";
  const rows = sorted.map((entry) => {
    const date = format(new Date(entry.clockIn), "yyyy-MM-dd");
    const clockIn = format(new Date(entry.clockIn), "h:mm a");
    const clockOut = entry.clockOut
      ? format(new Date(entry.clockOut), "h:mm a")
      : "In progress";
    const minutes = getDurationMinutes(entry);
    const hours = (minutes / 60).toFixed(2);
    const earnings = calculateEarnings(minutes, rate).toFixed(2);
    const note = entry.note ? `"${entry.note.replace(/"/g, '""')}"` : "";

    return `${date},${clockIn},${clockOut},${hours},${rate.toFixed(2)},${earnings},${note}`;
  });

  const totalMinutes = sorted.reduce(
    (sum, e) => sum + getDurationMinutes(e),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(2);
  const totalEarnings = calculateEarnings(totalMinutes, rate).toFixed(2);
  const totalRow = `TOTAL,,,,${rate.toFixed(2)},${totalEarnings},${totalHours} hours`;

  return [header, ...rows, "", totalRow].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
