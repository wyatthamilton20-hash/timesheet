import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TimesheetProvider } from "@/context/timesheet-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timesheet",
  description: "Clock in/out timesheet for contract work",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <TimesheetProvider>{children}</TimesheetProvider>
      </body>
    </html>
  );
}
