"use client";

import { Header } from "@/components/header";
import { ClockButton } from "@/components/clock-button";
import { SummaryCards } from "@/components/summary-cards";
import { CalendarView } from "@/components/calendar-view";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <ClockButton />
        <SummaryCards />
        <CalendarView />
      </main>
    </>
  );
}
