"use client";

import { Header } from "@/components/header";
import { InvoiceView } from "@/components/invoice-view";

export default function InvoicePage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <InvoiceView />
      </main>
    </>
  );
}
