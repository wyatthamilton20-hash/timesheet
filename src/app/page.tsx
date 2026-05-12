"use client";

import { Header } from "@/components/header";
import { PayPeriodBanner } from "@/components/pay-period-banner";
import { ClockButton } from "@/components/clock-button";
import { SummaryCards } from "@/components/summary-cards";
import { CalendarView } from "@/components/calendar-view";

export default function Home() {
  return (
    <>
      <Header />
      <PayPeriodBanner />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <ClockButton />
        <SummaryCards />
        <CalendarView />
      </main>
    </>
  );
}
