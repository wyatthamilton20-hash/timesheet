"use client";

import { useTimesheet } from "@/context/timesheet-context";
import { formatCurrency } from "@/lib/time-utils";
import { SettingsDialog } from "./settings-dialog";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "./theme-toggle";
import { Timer } from "lucide-react";

export function Header() {
  const { state, mounted } = useTimesheet();

  return (
    <header className="border-b bg-card">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="size-6 text-emerald-500" />
          <h1 className="text-xl font-bold">Timesheet</h1>
          {mounted && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {formatCurrency(state.hourlyRate)}/hr
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ExportButton />
          <ThemeToggle />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}
