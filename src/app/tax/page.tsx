"use client";

import { Header } from "@/components/header";
import { TaxView } from "@/components/tax-view";

export default function TaxPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <TaxView />
      </main>
    </>
  );
}
