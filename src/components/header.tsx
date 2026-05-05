"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTimesheet } from "@/context/timesheet-context";
import { formatCurrency } from "@/lib/time-utils";
import { SettingsDialog } from "./settings-dialog";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "./theme-toggle";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Tracker" },
  { href: "/invoice", label: "Invoice" },
  { href: "/tax", label: "Tax" },
];

export function Header() {
  const { state, mounted } = useTimesheet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
            <Clock className="size-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Timesheet</h1>
            {mounted && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
                {formatCurrency(state.hourlyRate)}/hr
              </span>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-0.5 text-xs font-medium">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-1 rounded-full transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <ExportButton />
          <ThemeToggle />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}
