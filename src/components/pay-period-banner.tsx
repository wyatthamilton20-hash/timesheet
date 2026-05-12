"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTimesheet } from "@/context/timesheet-context";
import { getPeriodEndDate } from "@/lib/invoice";
import { AlertTriangle, Clock, CalendarCheck } from "lucide-react";

export function PayPeriodBanner() {
  const { invoiceSettings, mounted } = useTimesheet();

  const info = useMemo(() => {
    if (!invoiceSettings?.downloads?.length) return null;
    return getPeriodEndDate(new Date(), invoiceSettings.downloads);
  }, [invoiceSettings]);

  if (!mounted || !info) return null;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysLeft = Math.round((info.endDate.getTime() - todayOnly.getTime()) / 86400000);

  let label: string;
  let Icon = CalendarCheck;
  let style = "";

  if (daysLeft <= 0) {
    label = "Pay period ends today — submit your invoice!";
    Icon = AlertTriangle;
    style = "bg-red-600 text-white";
  } else if (daysLeft === 1) {
    label = `Pay period ends tomorrow · ${format(info.endDate, "MMM d")}`;
    Icon = AlertTriangle;
    style = "bg-red-500 text-white";
  } else if (daysLeft <= 3) {
    label = `${daysLeft} days left in Pay Period ${info.period} · ends ${format(info.endDate, "MMM d")}`;
    Icon = AlertTriangle;
    style = "bg-amber-500 text-white";
  } else if (daysLeft <= 6) {
    label = `${daysLeft} days left in Pay Period ${info.period} · ends ${format(info.endDate, "MMM d")}`;
    Icon = Clock;
    style = "bg-amber-400 text-amber-950";
  } else {
    label = `${daysLeft} days left in Pay Period ${info.period} · ends ${format(info.endDate, "MMM d")}`;
    Icon = CalendarCheck;
    style = "bg-primary/10 text-primary border-b border-primary/20";
  }

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${style}`}>
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
