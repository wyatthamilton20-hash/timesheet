"use client";

import { useTimesheet } from "@/context/timesheet-context";
import { formatCurrency } from "@/lib/time-utils";
import { SettingsDialog } from "./settings-dialog";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "./theme-toggle";
import { Clock } from "lucide-react";

export function Header() {
  const { state, mounted } = useTimesheet();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
            <Clock className="size-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Timesheet</h1>
            {mounted && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
                {formatCurrency(state.hourlyRate)}/hr
              </span>
            )}
          </div>
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
